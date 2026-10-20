import { describe, expect, it } from 'vitest';
import {
  addDays,
  dateInWeek,
  daysBetween,
  endOfWeek,
  startOfWeek,
  todayIn,
  weekdayOf,
} from './dates.ts';

describe('daysBetween', () => {
  it('cuenta días en ambos sentidos', () => {
    expect(daysBetween('2026-10-19', '2026-10-25')).toBe(6);
    expect(daysBetween('2026-10-19', '2026-10-18')).toBe(-1);
  });
});

describe('weekdayOf', () => {
  it('identifica el día de la semana', () => {
    expect(weekdayOf('2026-10-19')).toBe('MON');
    expect(weekdayOf('2026-10-21')).toBe('WED');
    expect(weekdayOf('2026-10-25')).toBe('SUN');
  });
});

describe('addDays', () => {
  it('cruza meses y años bisiestos', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('startOfWeek / endOfWeek', () => {
  it('semana que empieza en lunes', () => {
    expect(startOfWeek('2026-10-22', 'MON')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-19', 'MON')).toBe('2026-10-19');
    expect(startOfWeek('2026-10-25', 'MON')).toBe('2026-10-19');
    expect(endOfWeek('2026-10-22', 'MON')).toBe('2026-10-25');
  });

  it('semana que empieza en domingo', () => {
    expect(startOfWeek('2026-10-22', 'SUN')).toBe('2026-10-18');
    expect(startOfWeek('2026-10-25', 'SUN')).toBe('2026-10-25');
    expect(endOfWeek('2026-10-25', 'SUN')).toBe('2026-10-31');
  });
});

describe('dateInWeek', () => {
  it('ubica miércoles y sábado en la semana (plan de la basura)', () => {
    expect(dateInWeek('2026-10-19', 'WED', 'MON')).toBe('2026-10-21');
    expect(dateInWeek('2026-10-19', 'SAT', 'MON')).toBe('2026-10-24');
  });

  it('respeta el inicio de semana en domingo', () => {
    expect(dateInWeek('2026-10-18', 'SUN', 'SUN')).toBe('2026-10-18');
    expect(dateInWeek('2026-10-18', 'SAT', 'SUN')).toBe('2026-10-24');
  });
});

describe('todayIn', () => {
  it('usa la zona horaria del hogar, no la del servidor', () => {
    const instant = new Date('2026-10-20T03:30:00Z');
    expect(todayIn('UTC', instant)).toBe('2026-10-20');
    expect(todayIn('America/Bogota', instant)).toBe('2026-10-19');
    expect(todayIn('Europe/Madrid', instant)).toBe('2026-10-20');
  });
});

describe('meses y periodos', () => {
  it('calcula inicio y fin de mes, incluido febrero bisiesto', async () => {
    const { endOfMonth, startOfMonth } = await import('./dates.ts');
    expect(startOfMonth('2026-10-19')).toBe('2026-10-01');
    expect(endOfMonth('2026-10-19')).toBe('2026-10-31');
    expect(endOfMonth('2028-02-10')).toBe('2028-02-29');
    expect(endOfMonth('2026-12-05')).toBe('2026-12-31');
  });

  it('periodRange y previousPeriodDay', async () => {
    const { periodRange, previousPeriodDay } = await import('./dates.ts');
    expect(periodRange('WEEKLY', '2026-10-22', 'MON')).toEqual({
      start: '2026-10-19',
      end: '2026-10-25',
    });
    expect(periodRange('MONTHLY', '2026-10-22', 'MON')).toEqual({
      start: '2026-10-01',
      end: '2026-10-31',
    });
    expect(previousPeriodDay('MONTHLY', '2026-03-01')).toBe('2026-02-28');
    expect(previousPeriodDay('WEEKLY', '2026-10-19')).toBe('2026-10-12');
  });
});
