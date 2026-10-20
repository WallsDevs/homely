import type { IsoDate } from '@homely/shared';

/*
 * La aritmética de días vive en `@homely/shared` (la usan server y client).
 * Aquí solo queda la conversión con las columnas `@db.Date` de Prisma.
 */
export {
  addDays,
  dateInWeek,
  daysBetween,
  endOfWeek,
  startOfWeek,
  todayIn,
  weekdayOf,
} from '@homely/shared';

/** Día ISO → `Date` a medianoche UTC, que es lo que Prisma espera para columnas `@db.Date`. */
export function toDbDate(day: IsoDate): Date {
  return new Date(`${day}T00:00:00.000Z`);
}

export function fromDbDate(date: Date): IsoDate {
  return date.toISOString().slice(0, 10);
}
