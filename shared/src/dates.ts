import { WEEKDAYS, type Weekday } from './enums.ts';

/*
 * Calendario sobre días `YYYY-MM-DD`, compartido por server y client.
 * Todo el cálculo es aritmética de días en UTC, sin horas: determinista e independiente de la
 * zona horaria de la máquina. La zona del hogar solo interviene al decidir qué día es "hoy".
 */

const DAY_MS = 86_400_000;

function toMs(day: string): number {
  return new Date(`${day}T00:00:00.000Z`).getTime();
}

function fromMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

export function addDays(day: string, amount: number): string {
  return fromMs(toMs(day) + amount * DAY_MS);
}

/** Días de `from` a `to` (negativo si `to` es anterior). */
export function daysBetween(from: string, to: string): number {
  return Math.round((toMs(to) - toMs(from)) / DAY_MS);
}

export function weekdayOf(day: string): Weekday {
  // getUTCDay: 0 = domingo … 6 = sábado. WEEKDAYS empieza en lunes.
  const index = (new Date(toMs(day)).getUTCDay() + 6) % 7;
  return WEEKDAYS[index] ?? 'MON';
}

function offsetFrom(weekStartsOn: Weekday, weekday: Weekday): number {
  return (WEEKDAYS.indexOf(weekday) - WEEKDAYS.indexOf(weekStartsOn) + 7) % 7;
}

/** Primer día de la semana que contiene `day`, según el inicio de semana del hogar. */
export function startOfWeek(day: string, weekStartsOn: Weekday): string {
  return addDays(day, -offsetFrom(weekStartsOn, weekdayOf(day)));
}

export function endOfWeek(day: string, weekStartsOn: Weekday): string {
  return addDays(startOfWeek(day, weekStartsOn), 6);
}

/** Fecha concreta de `weekday` dentro de la semana que empieza en `weekStart`. */
export function dateInWeek(weekStart: string, weekday: Weekday, weekStartsOn: Weekday): string {
  return addDays(weekStart, offsetFrom(weekStartsOn, weekday));
}

/** "Hoy" en una zona horaria IANA, p. ej. `America/Bogota`. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // El locale en-CA formatea como YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone }).resolvedOptions().timeZone !== '';
  } catch {
    return false;
  }
}

/** Primer día del mes calendario de `day`. */
export function startOfMonth(day: string): string {
  return `${day.slice(0, 7)}-01`;
}

/** Último día del mes calendario de `day`. */
export function endOfMonth(day: string): string {
  const [year = 0, month = 1] = day.split('-').map(Number);
  return fromMs(Date.UTC(year, month, 0));
}

export type PeriodKind = 'WEEKLY' | 'MONTHLY';

/** Rango del periodo (semana del hogar o mes calendario) que contiene `day`. */
export function periodRange(
  period: PeriodKind,
  day: string,
  weekStartsOn: Weekday,
): { start: string; end: string } {
  return period === 'WEEKLY'
    ? { start: startOfWeek(day, weekStartsOn), end: endOfWeek(day, weekStartsOn) }
    : { start: startOfMonth(day), end: endOfMonth(day) };
}

/** Un día del periodo anterior al que empieza en `periodStart`. */
export function previousPeriodDay(period: PeriodKind, periodStart: string): string {
  return addDays(periodStart, period === 'WEEKLY' ? -7 : -1);
}
