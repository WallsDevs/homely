import { WEEKDAYS, type Weekday } from '@homely/shared';

/** Nombre completo de cada día, en minúscula. */
export const LONG: Record<Weekday, string> = {
  MON: 'lunes',
  TUE: 'martes',
  WED: 'miércoles',
  THU: 'jueves',
  FRI: 'viernes',
  SAT: 'sábado',
  SUN: 'domingo',
};

/** «miércoles y sábado», «todos los días», «lunes, miércoles y viernes». */
export function describeWeekdays(days: readonly Weekday[]): string {
  if (days.length === 7) return 'todos los días';
  const names = WEEKDAYS.filter((day) => days.includes(day)).map((day) => LONG[day]);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} y ${names.at(-1)}` : (names[0] ?? '');
}
