import type { IsoDate, TaskStats, TaskStatus, Weekday } from '@homely/shared';
import { addDays, startOfWeek } from '../../lib/dates.ts';

/** Lo mínimo de una tarea para calcular reportes. */
export type StatRow = { assigneeId: string | null; status: TaskStatus; dueDate: IsoDate };

/** RP-01: las omitidas no cuentan como incumplidas ni en el porcentaje. */
export function statsOf(rows: readonly StatRow[]): TaskStats {
  let done = 0;
  let pending = 0;
  let skipped = 0;
  for (const row of rows) {
    if (row.status === 'DONE') done++;
    else if (row.status === 'SKIPPED') skipped++;
    else pending++;
  }
  const assigned = rows.length;
  const countable = assigned - skipped;
  return { assigned, done, pending, skipped, rate: countable === 0 ? null : done / countable };
}

/** RP-03: diferencia de porcentaje entre dos semanas; `null` si alguna no tiene datos. */
export function deltaOf(current: number | null, previous: number | null): number | null {
  return current === null || previous === null ? null : current - previous;
}

/** Agrupa filas por semana del hogar (clave = primer día de la semana). */
export function byWeek<T extends { dueDate: IsoDate }>(
  rows: readonly T[],
  weekStartsOn: Weekday,
): Map<IsoDate, T[]> {
  const weeks = new Map<IsoDate, T[]>();
  for (const row of rows) {
    const key = startOfWeek(row.dueDate, weekStartsOn);
    const list = weeks.get(key);
    if (list) list.push(row);
    else weeks.set(key, [row]);
  }
  return weeks;
}

/**
 * RP-05: semanas cerradas seguidas al 100 %, contando hacia atrás desde `lastClosedWeek`.
 * Las semanas sin tareas no rompen la racha (vacaciones), pero tampoco suman.
 */
export function streakOf(
  weeks: ReadonlyMap<IsoDate, readonly StatRow[]>,
  lastClosedWeek: IsoDate,
  oldestWeek: IsoDate,
): number {
  let streak = 0;
  for (let week = lastClosedWeek; week >= oldestWeek; week = addDays(week, -7)) {
    const { rate } = statsOf(weeks.get(week) ?? []);
    if (rate === null) continue;
    if (rate < 1) break;
    streak++;
  }
  return streak;
}
