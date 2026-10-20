import {
  pauseScopeOf,
  type IsoDate,
  type Pause,
  type createPauseSchema,
  type updatePauseSchema,
} from '@homely/shared';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { HouseholdCtx } from '../../lib/context.ts';
import { fromDbDate, toDbDate, todayIn } from '../../lib/dates.ts';
import { AppError } from '../../lib/errors.ts';
import { prisma, type Tx } from '../../lib/prisma.ts';
import { auditRepository } from '../audit/audit.repository.ts';
import { assertAssignable } from '../members/members.service.ts';
import { materializeCurrentWeek, resetRange, type HouseholdCalendar } from './plan-generation.ts';

type CreatePauseData = z.output<typeof createPauseSchema>;
type UpdatePauseData = z.output<typeof updatePauseSchema>;

const pauseInclude = {
  member: { select: { id: true, displayName: true, color: true } },
  plan: { select: { id: true, title: true } },
} as const;
type PauseRow = Prisma.PlanPauseGetPayload<{ include: typeof pauseInclude }>;

function toPause(row: PauseRow, today: IsoDate): Pause {
  const startsOn = fromDbDate(row.startsOn);
  return {
    id: row.id,
    scope: pauseScopeOf(row),
    member: row.member,
    plan: row.plan,
    startsOn,
    endsOn: fromDbDate(row.endsOn),
    reason: row.reason,
    status: startsOn <= today ? 'ACTIVE' : 'UPCOMING',
    createdAt: row.createdAt.toISOString(),
  };
}

const calendarOf = (ctx: HouseholdCtx): HouseholdCalendar => ({
  id: ctx.householdId,
  timezone: ctx.household.timezone,
  weekStartsOn: ctx.household.weekStartsOn,
});

const todayOf = (ctx: HouseholdCtx) => todayIn(ctx.household.timezone);

async function findPause(ctx: HouseholdCtx, id: string): Promise<PauseRow> {
  const row = await prisma.planPause.findFirst({
    where: { id, householdId: ctx.householdId },
    include: pauseInclude,
  });
  if (!row) throw AppError.notFound('Pausa');
  return row;
}

/** Rehace las tareas del rango afectado según el alcance de la pausa. */
function reset(tx: Tx, ctx: HouseholdCtx, row: PauseRow, range: { from: IsoDate; to: IsoDate }) {
  return resetRange(tx, calendarOf(ctx), range, { memberId: row.memberId, planId: row.planId });
}

export const pausesService = {
  /** Activas y programadas. Las ya terminadas no se listan: quedan en la auditoría. */
  async list(ctx: HouseholdCtx): Promise<Pause[]> {
    const today = todayOf(ctx);
    const rows = await prisma.planPause.findMany({
      where: { householdId: ctx.householdId, endsOn: { gte: toDbDate(today) } },
      include: pauseInclude,
      orderBy: [{ startsOn: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map((row) => toPause(row, today));
  },

  /** PL-09 / PL-10: crear la pausa quita las pendientes del rango y evita generarlas. */
  async create(ctx: HouseholdCtx, input: CreatePauseData): Promise<Pause> {
    const today = todayOf(ctx);
    if (input.endsOn < today) {
      throw AppError.validation({
        endsOn: ['La pausa ya habría terminado: elige una fecha futura'],
      });
    }
    if (input.memberId) await assertAssignable(ctx.householdId, input.memberId, 'memberId');
    if (input.planId) {
      const plan = await prisma.taskPlan.findFirst({
        where: { id: input.planId, householdId: ctx.householdId },
      });
      if (!plan) throw AppError.validation({ planId: ['Elige un plan del hogar'] });
    }

    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.planPause.create({
        data: {
          householdId: ctx.householdId,
          memberId: input.memberId ?? null,
          planId: input.planId ?? null,
          startsOn: toDbDate(input.startsOn),
          endsOn: toDbDate(input.endsOn),
          reason: input.reason ?? null,
          createdById: ctx.membershipId,
        },
        include: pauseInclude,
      });
      await reset(tx, ctx, created, { from: input.startsOn, to: input.endsOn });
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'PLAN_PAUSE_CREATED',
        metadata: {
          pauseId: created.id,
          scope: pauseScopeOf(created),
          from: input.startsOn,
          to: input.endsOn,
        },
      });
      return created;
    });

    await materializeCurrentWeek(calendarOf(ctx));
    return toPause(row, today);
  },

  /**
   * Cambiar fechas rehace la unión del rango viejo y el nuevo: al acortar se regeneran los días
   * liberados; al alargar se quitan los nuevos. Terminar hoy = `endsOn` ayer.
   */
  async update(ctx: HouseholdCtx, id: string, input: UpdatePauseData): Promise<Pause> {
    const current = await findPause(ctx, id);
    const startsOn = input.startsOn ?? fromDbDate(current.startsOn);
    const endsOn = input.endsOn ?? fromDbDate(current.endsOn);
    if (startsOn > endsOn) {
      throw AppError.validation({ endsOn: ['La fecha final debe ser posterior a la inicial'] });
    }

    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.planPause.update({
        where: { id },
        data: {
          startsOn: toDbDate(startsOn),
          endsOn: toDbDate(endsOn),
          ...(input.reason !== undefined ? { reason: input.reason } : {}),
        },
        include: pauseInclude,
      });
      const oldStart = fromDbDate(current.startsOn);
      const oldEnd = fromDbDate(current.endsOn);
      await reset(tx, ctx, updated, {
        from: startsOn < oldStart ? startsOn : oldStart,
        to: endsOn > oldEnd ? endsOn : oldEnd,
      });
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'PLAN_PAUSE_UPDATED',
        metadata: { pauseId: id, from: startsOn, to: endsOn },
      });
      return updated;
    });

    await materializeCurrentWeek(calendarOf(ctx));
    return toPause(row, todayOf(ctx));
  },

  async remove(ctx: HouseholdCtx, id: string): Promise<void> {
    const current = await findPause(ctx, id);
    await prisma.$transaction(async (tx) => {
      await tx.planPause.delete({ where: { id } });
      await reset(tx, ctx, current, {
        from: fromDbDate(current.startsOn),
        to: fromDbDate(current.endsOn),
      });
      await auditRepository.record(tx, {
        householdId: ctx.householdId,
        actorId: ctx.membershipId,
        action: 'PLAN_PAUSE_DELETED',
        metadata: { pauseId: id, scope: pauseScopeOf(current) },
      });
    });
    await materializeCurrentWeek(calendarOf(ctx));
  },
};
