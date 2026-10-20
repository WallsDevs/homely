import { daysBetween, type IsoDate } from '@homely/shared';

/*
 * Formato de días `YYYY-MM-DD` para la UI. Se formatea en UTC a propósito: el día ISO ya es el día
 * del hogar, y convertirlo a la zona del navegador podría correrlo un día.
 */

const toDate = (day: IsoDate) => new Date(`${day}T00:00:00.000Z`);

const weekdayShort = new Intl.DateTimeFormat('es', { weekday: 'short', timeZone: 'UTC' });
const weekdayLong = new Intl.DateTimeFormat('es', { weekday: 'long', timeZone: 'UTC' });
const dayMonth = new Intl.DateTimeFormat('es', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const dayMonthYear = new Intl.DateTimeFormat('es', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const dayOnly = new Intl.DateTimeFormat('es', { day: 'numeric', timeZone: 'UTC' });

const clean = (text: string) => text.replace('.', '');
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);

/** Etiqueta corta de vencimiento: Hoy, Mañana, Ayer, «mié 21», «21 oct», «21 oct 2025». */
export function dueLabel(day: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  if (diff === -1) return 'Ayer';
  if (diff > 1 && diff < 7) {
    return `${clean(weekdayShort.format(toDate(day)))} ${dayOnly.format(toDate(day))}`;
  }
  if (day.slice(0, 4) !== today.slice(0, 4)) return clean(dayMonthYear.format(toDate(day)));
  return clean(dayMonth.format(toDate(day)));
}

/** Encabezado de un día en listas: «Hoy», «Mañana», «Jueves 23». */
export function dayHeading(day: IsoDate, today: IsoDate): string {
  const diff = daysBetween(today, day);
  if (diff === 0) return 'Hoy';
  if (diff === 1) return 'Mañana';
  return `${capitalize(weekdayLong.format(toDate(day)))} ${dayOnly.format(toDate(day))}`;
}

/** «19 – 25 oct» o «28 oct – 3 nov». */
export function weekRangeLabel(start: IsoDate, end: IsoDate): string {
  const sameMonth = start.slice(0, 7) === end.slice(0, 7);
  const from = sameMonth ? dayOnly.format(toDate(start)) : clean(dayMonth.format(toDate(start)));
  return `${from} – ${clean(dayMonth.format(toDate(end)))}`;
}

const monthYear = new Intl.DateTimeFormat('es', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

/** «Octubre 2026». */
export function monthLabel(day: IsoDate): string {
  return capitalize(monthYear.format(toDate(day)).replace(' de ', ' '));
}
