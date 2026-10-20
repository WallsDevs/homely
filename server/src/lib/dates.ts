import { WEEKDAYS, type IsoDate, type Weekday } from '@homely/shared';

/*
 * Utilidades de calendario sobre días `YYYY-MM-DD`.
 * Todo el cálculo se hace en UTC sobre días puros (sin horas), así que es determinista e
 * independiente de la zona horaria del servidor. La zona del hogar solo interviene al decidir
 * qué día es "hoy" (`todayIn`).
 */

const DAY_MS = 86_400_000;

/** Día ISO → `Date` a medianoche UTC, que es lo que Prisma espera para columnas `@db.Date`. */
export function toDbDate(day: IsoDate): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: IsoDate, amount: number): IsoDate {
  return fromDbDate(new Date(toDbDate(day).getTime() + amount * DAY_MS));
}

export function weekdayOf(day: IsoDate): Weekday {
  // getUTCDay: 0 = domingo … 6 = sábado. WEEKDAYS empieza en lunes.
  const index = (toDbDate(day).getUTCDay() + 6) % 7;
  return WEEKDAYS[index] ?? 'MON';
}

function offsetFrom(weekStartsOn: Weekday, weekday: Weekday): number {
  return (WEEKDAYS.indexOf(weekday) - WEEKDAYS.indexOf(weekStartsOn) + 7) % 7;
}

/** Primer día de la semana que contiene `day`, según el inicio de semana del hogar. */
export function startOfWeek(day: IsoDate, weekStartsOn: Weekday): IsoDate {
  return addDays(day, -offsetFrom(weekStartsOn, weekdayOf(day)));
}

export function endOfWeek(day: IsoDate, weekStartsOn: Weekday): IsoDate {
  return addDays(startOfWeek(day, weekStartsOn), 6);
}

/** Fecha concreta de `weekday` dentro de la semana que empieza en `weekStart`. */
export function dateInWeek(weekStart: IsoDate, weekday: Weekday, weekStartsOn: Weekday): IsoDate {
  return addDays(weekStart, offsetFrom(weekStartsOn, weekday));
}

/** "Hoy" en una zona horaria IANA, p. ej. `America/Bogota`. */
export function todayIn(timeZone: string, now: Date = new Date()): IsoDate {
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
