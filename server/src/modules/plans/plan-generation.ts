import { LAZY_GENERATION_MAX_WEEKS_AHEAD, type IsoDate, type Weekday } from '@homely/shared';
import type { TaskPlan } from '@prisma/client';
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

export type HouseholdCalendar = { id: string; timezone: string; weekStartsOn: Weekday };

type PlanWindow = Pick<TaskPlan, 'startsOn' | 'endsOn'>;

/** ¿Cae `day` dentro de las fechas opcionales de vigencia del plan? */
export function isWithinPlan(plan: PlanWindow, day: IsoDate): boolean {
  if (plan.startsOn && day < fromDbDate(plan.startsOn)) return false;
  if (plan.endsOn && day > fromDbDate(plan.endsOn)) return false;
  return true;
}

/**
 * PL-02 / PL-03 / PL-05: crea las tareas de una semana para los planes activos que aún no la
 * generaron. Nunca crea tareas en días ya pasados.
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
  if (addDays(weekStart, 6) < today) return 0;

  const plans = await prisma.taskPlan.findMany({
    where: {
      householdId: household.id,
      isActive: true,
      weeks: { none: { weekStart: toDbDate(weekStart) } },
    },
  });
  if (plans.length === 0) return 0;

  const tasks = plans.flatMap((plan) =>
    plan.weekdays
      .map((weekday) => dateInWeek(weekStart, weekday, household.weekStartsOn))
      .filter((day) => day >= today && isWithinPlan(plan, day))
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

/**
 * Al editar, desactivar o eliminar un plan: borra sus tareas futuras aún pendientes y olvida las
 * semanas desde la actual, para que se regeneren con la configuración nueva.
 * Las tareas completadas u omitidas se conservan siempre (historial).
 */
export async function resetFuture(tx: Tx, household: HouseholdCalendar, planId: string) {
  const today = todayIn(household.timezone);
  const currentWeek = startOfWeek(today, household.weekStartsOn);
  await tx.task.deleteMany({
    where: { planId, status: 'PENDING', dueDate: { gte: toDbDate(today) } },
  });
  await tx.planMaterialization.deleteMany({
    where: { planId, weekStart: { gte: toDbDate(currentWeek) } },
  });
}

/** Próximo día (desde hoy) en que el plan genera tarea, o `null`. */
export function nextOccurrence(
  plan: PlanWindow & Pick<TaskPlan, 'isActive' | 'weekdays'>,
  today: IsoDate,
): IsoDate | null {
  if (!plan.isActive) return null;
  const start =
    plan.startsOn && fromDbDate(plan.startsOn) > today ? fromDbDate(plan.startsOn) : today;
  for (let offset = 0; offset < 7; offset++) {
    const day = addDays(start, offset);
    if (!isWithinPlan(plan, day)) return null;
    if (plan.weekdays.includes(weekdayOf(day))) return day;
  }
  return null;
}
