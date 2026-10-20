import { LAZY_GENERATION_MAX_WEEKS_AHEAD, type IsoDate, type Weekday } from '@homely/shared';
import type { Prisma, TaskPlan } from '@prisma/client';
import {
  addDays,
  dateInWeek,
  daysBetween,
  fromDbDate,
  startOfWeek,
  toDbDate,
  todayIn,
  weekdayOf,
} from '../../lib/dates.ts';
import { prisma, type Tx } from '../../lib/prisma.ts';
import { isPaused, pausesOverlapping, type PauseRule } from './plan-pauses.ts';

export type HouseholdCalendar = { id: string; timezone: string; weekStartsOn: Weekday };

type PlanWindow = Pick<TaskPlan, 'startsOn' | 'endsOn'>;

/** Hasta dónde busca `nextOccurrence`: cubre una pausa larga sin perder la próxima fecha. */
const NEXT_OCCURRENCE_HORIZON_DAYS = 90;

/** ¿Cae `day` dentro de las fechas opcionales de vigencia del plan? */
export function isWithinPlan(plan: PlanWindow, day: IsoDate): boolean {
  if (plan.startsOn && day < fromDbDate(plan.startsOn)) return false;
  if (plan.endsOn && day > fromDbDate(plan.endsOn)) return false;
  return true;
}

/**
 * PL-02 / PL-03 / PL-05 / PL-09: crea las tareas de una semana para los planes activos que aún no
 * la generaron. Nunca crea tareas en días ya pasados ni en días cubiertos por una pausa.
 *
 * Idempotente por dos vías: `PlanMaterialization` marca cada (plan, semana) generada, así que una
 * tarea borrada a mano no reaparece; y el índice único `(planId, dueDate)` impide duplicados
 * aunque dos peticiones generen la misma semana a la vez.
 */
export async function materializeWeek(
  household: HouseholdCalendar,
  weekStart: IsoDate,
  today: IsoDate,
): Promise<number> {
  const weekEnd = addDays(weekStart, 6);
  if (weekEnd < today) return 0;

  const plans = await prisma.taskPlan.findMany({
    where: {
      householdId: household.id,
      isActive: true,
      weeks: { none: { weekStart: toDbDate(weekStart) } },
    },
  });
  if (plans.length === 0) return 0;

  const pauses = await pausesOverlapping(household.id, weekStart, weekEnd);

  const tasks = plans.flatMap((plan) =>
    plan.weekdays
      .map((weekday) => dateInWeek(weekStart, weekday, household.weekStartsOn))
      .filter((day) => day >= today && isWithinPlan(plan, day) && !isPaused(pauses, plan, day))
      .map((day) => ({
        householdId: household.id,
        planId: plan.id,
        title: plan.title,
        description: plan.description,
        priority: plan.priority,
        assigneeId: plan.assigneeId,
        dueDate: toDbDate(day),
        origin: 'PLAN' as const,
      })),
  );

  const [created] = await prisma.$transaction([
    prisma.task.createMany({ data: tasks, skipDuplicates: true }),
    prisma.planMaterialization.createMany({
      data: plans.map((plan) => ({ planId: plan.id, weekStart: toDbDate(weekStart) })),
      skipDuplicates: true,
    }),
  ]);
  return created.count;
}

/**
 * PL-04: generación perezosa al consultar una semana. Solo la actual y hasta
 * `LAZY_GENERATION_MAX_WEEKS_AHEAD` semanas adelante; nunca semanas pasadas.
 */
export async function materializeForView(household: HouseholdCalendar, day: IsoDate) {
  const today = todayIn(household.timezone);
  const current = startOfWeek(today, household.weekStartsOn);
  const requested = startOfWeek(day, household.weekStartsOn);
  const weeksAhead = daysBetween(current, requested) / 7;
  if (weeksAhead < 0 || weeksAhead > LAZY_GENERATION_MAX_WEEKS_AHEAD) return;
  await materializeWeek(household, requested, today);
}

/** La semana actual del hogar, en su zona horaria. */
export async function materializeCurrentWeek(household: HouseholdCalendar) {
  const today = todayIn(household.timezone);
  return materializeWeek(household, startOfWeek(today, household.weekStartsOn), today);
}

/** A qué planes afecta un reinicio: todos, los de una persona o uno concreto. */
export type ResetScope = { memberId?: string | null; planId?: string | null };

/**
 * Borra las tareas de plan aún pendientes de un rango (desde hoy) y olvida las semanas generadas
 * que lo tocan, para que se regeneren con la configuración actual (planes y pausas).
 * Las tareas completadas u omitidas y las manuales se conservan siempre.
 * Sin `to`, el rango llega hasta el futuro completo.
 */
export async function resetRange(
  tx: Tx,
  household: HouseholdCalendar,
  range: { from: IsoDate; to?: IsoDate },
  scope: ResetScope = {},
): Promise<void> {
  const today = todayIn(household.timezone);
  const from = range.from > today ? range.from : today;
  if (range.to !== undefined && range.to < from) return;

  const firstWeek = startOfWeek(from, household.weekStartsOn);
  const lastWeek =
    range.to === undefined ? undefined : startOfWeek(range.to, household.weekStartsOn);

  const planFilter: Prisma.TaskPlanWhereInput = scope.planId
    ? { id: scope.planId }
    : scope.memberId
      ? { householdId: household.id, assigneeId: scope.memberId }
      : { householdId: household.id };

  await tx.task.deleteMany({
    where: {
      householdId: household.id,
      origin: 'PLAN',
      status: 'PENDING',
      planId: scope.planId ?? { not: null },
      ...(scope.memberId && !scope.planId ? { assigneeId: scope.memberId } : {}),
      dueDate: {
        gte: toDbDate(from),
        ...(range.to !== undefined ? { lte: toDbDate(range.to) } : {}),
      },
    },
  });
  await tx.planMaterialization.deleteMany({
    where: {
      plan: planFilter,
      weekStart: {
        gte: toDbDate(firstWeek),
        ...(lastWeek !== undefined ? { lte: toDbDate(lastWeek) } : {}),
      },
    },
  });
}

/** Al editar, desactivar o eliminar un plan: rehace todo su futuro pendiente. */
export async function resetFuture(tx: Tx, household: HouseholdCalendar, planId: string) {
  await resetRange(tx, household, { from: todayIn(household.timezone) }, { planId });
}

/** Próximo día (desde hoy) en que el plan genera tarea, saltando pausas; `null` si no hay. */
export function nextOccurrence(
  plan: PlanWindow & Pick<TaskPlan, 'id' | 'assigneeId' | 'isActive' | 'weekdays'>,
  today: IsoDate,
  pauses: readonly PauseRule[] = [],
): IsoDate | null {
  if (!plan.isActive) return null;
  const start =
    plan.startsOn && fromDbDate(plan.startsOn) > today ? fromDbDate(plan.startsOn) : today;
  for (let offset = 0; offset < NEXT_OCCURRENCE_HORIZON_DAYS; offset++) {
    const day = addDays(start, offset);
    if (!isWithinPlan(plan, day)) return null;
    if (plan.weekdays.includes(weekdayOf(day)) && !isPaused(pauses, plan, day)) return day;
  }
  return null;
}
