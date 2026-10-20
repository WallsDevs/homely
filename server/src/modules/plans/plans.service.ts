import type { IsoDate, Plan, PlanDetail, createPlanSchema, updatePlanSchema } from '@homely/shared';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { HouseholdCtx } from '../../lib/context.ts';
import { addDays, fromDbDate, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma } from '../../lib/prisma.ts';
import { assertAssignable } from '../members/members.service.ts';
import { toTask } from '../tasks/tasks.mappers.ts';
import { taskInclude } from '../tasks/tasks.repository.ts';
import {
  materializeCurrentWeek,
  nextOccurrence,
  resetFuture,
  type HouseholdCalendar,
} from './plan-generation.ts';
import { pausesOverlapping, type PauseRule } from './plan-pauses.ts';

type CreatePlanData = z.output<typeof createPlanSchema>;
type UpdatePlanData = z.output<typeof updatePlanSchema>;

const UPCOMING_LIMIT = 6;

const planInclude = {
  assignee: { select: { id: true, displayName: true, color: true } },
} as const;
type PlanRow = Prisma.TaskPlanGetPayload<{ include: typeof planInclude }>;

function toPlan(row: PlanRow, today: IsoDate, pauses: readonly PauseRule[]): Plan {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    weekdays: row.weekdays,
    assignee: row.assignee,
    isActive: row.isActive,
    startsOn: row.startsOn ? fromDbDate(row.startsOn) : null,
    endsOn: row.endsOn ? fromDbDate(row.endsOn) : null,
    nextDueDate: nextOccurrence(row, today, pauses),
    createdAt: row.createdAt.toISOString(),
  };
}

const calendarOf = (ctx: HouseholdCtx): HouseholdCalendar => ({
  id: ctx.householdId,
  timezone: ctx.household.timezone,
  weekStartsOn: ctx.household.weekStartsOn,
});

const todayOf = (ctx: HouseholdCtx) => todayIn(ctx.household.timezone);

/** Pausas que pueden afectar la próxima fecha de un plan (mismo horizonte que `nextOccurrence`). */
function upcomingPauses(ctx: HouseholdCtx, today: IsoDate) {
  return pausesOverlapping(ctx.householdId, today, addDays(today, 90));
}

async function present(ctx: HouseholdCtx, row: PlanRow): Promise<Plan> {
  const today = todayOf(ctx);
  return toPlan(row, today, await upcomingPauses(ctx, today));
}

async function findPlan(ctx: HouseholdCtx, id: string): Promise<PlanRow> {
  const plan = await prisma.taskPlan.findFirst({
    where: { id, householdId: ctx.householdId },
    include: planInclude,
  });
  if (!plan) throw AppError.notFound('Plan');
  return plan;
}

const toDay = (day: string | null | undefined) => (day ? toDbDate(day) : null);

export const plansService = {
  async list(ctx: HouseholdCtx): Promise<Plan[]> {
    const rows = await prisma.taskPlan.findMany({
      where: { householdId: ctx.householdId },
      include: planInclude,
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }],
    });
    const today = todayOf(ctx);
    const pauses = await upcomingPauses(ctx, today);
    return rows.map((row) => toPlan(row, today, pauses));
  },

  async get(ctx: HouseholdCtx, id: string): Promise<PlanDetail> {
    const today = todayOf(ctx);
    const plan = await findPlan(ctx, id);
    const upcoming = await prisma.task.findMany({
      where: { planId: id, status: 'PENDING', dueDate: { gte: toDbDate(today) } },
      include: taskInclude,
      orderBy: { dueDate: 'asc' },
      take: UPCOMING_LIMIT,
    });
    return { plan: await present(ctx, plan), upcoming: upcoming.map((row) => toTask(row, today)) };
  },

  /** PL-01 + PL-05: al crear, se generan ya las tareas de los días que quedan de esta semana. */
  async create(ctx: HouseholdCtx, input: CreatePlanData): Promise<Plan> {
    await assertAssignable(ctx.householdId, input.assigneeId);
    const row = await prisma.taskPlan.create({
      data: {
        householdId: ctx.householdId,
        title: input.title,
        description: input.description ?? null,
        priority: input.priority,
        weekdays: input.weekdays,
        assigneeId: input.assigneeId,
        startsOn: toDay(input.startsOn),
        endsOn: toDay(input.endsOn),
      },
      include: planInclude,
    });
    await materializeCurrentWeek(calendarOf(ctx));
    return present(ctx, row);
  },

  /**
   * Editar un plan rehace sus tareas futuras pendientes con la configuración nueva.
   * Lo ya completado u omitido no se toca.
   */
  async update(ctx: HouseholdCtx, id: string, input: UpdatePlanData): Promise<Plan> {
    await findPlan(ctx, id);
    await assertAssignable(ctx.householdId, input.assigneeId);

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.taskPlan.update({
        where: { id },
        data: {
          ...(input.title !== undefined ? { title: input.title } : {}),
          ...(input.description !== undefined ? { description: input.description } : {}),
          ...(input.priority !== undefined ? { priority: input.priority } : {}),
          ...(input.weekdays !== undefined ? { weekdays: input.weekdays } : {}),
          ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
          ...(input.startsOn !== undefined ? { startsOn: toDay(input.startsOn) } : {}),
          ...(input.endsOn !== undefined ? { endsOn: toDay(input.endsOn) } : {}),
        },
        include: planInclude,
      });
      await resetFuture(tx, calendarOf(ctx), id);
      return updated;
    });

    if (row.isActive) await materializeCurrentWeek(calendarOf(ctx));
    return present(ctx, row);
  },

  /** PL-05: desactivar quita las pendientes futuras; activar genera lo que queda de la semana. */
  async setActive(ctx: HouseholdCtx, id: string, isActive: boolean): Promise<Plan> {
    const plan = await findPlan(ctx, id);
    if (plan.isActive === isActive) return present(ctx, plan);

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.taskPlan.update({
        where: { id },
        data: { isActive },
        include: planInclude,
      });
      if (!isActive) await resetFuture(tx, calendarOf(ctx), id);
      return updated;
    });

    if (isActive) await materializeCurrentWeek(calendarOf(ctx));
    return present(ctx, row);
  },

  /** PL-01: se borra el plan y sus pendientes futuras; el historial queda con `planId = null`. */
  async remove(ctx: HouseholdCtx, id: string): Promise<void> {
    await findPlan(ctx, id);
    await prisma.$transaction(async (tx) => {
      await resetFuture(tx, calendarOf(ctx), id);
      await tx.taskPlan.delete({ where: { id } });
    });
  },
};
