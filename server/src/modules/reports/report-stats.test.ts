import { describe, expect, it } from 'vitest';
import { byWeek, deltaOf, statsOf, streakOf, type StatRow } from './report-stats.ts';

const row = (status: StatRow['status'], dueDate = '2026-10-19', assigneeId = 'm1'): StatRow => ({
  assigneeId,
  status,
  dueDate,
});

describe('statsOf (RP-01)', () => {
  it('las omitidas no cuentan en el porcentaje', () => {
    expect(statsOf([row('DONE'), row('DONE'), row('PENDING'), row('SKIPPED')])).toEqual({
      assigned: 4,
      done: 2,
      pending: 1,
      skipped: 1,
      rate: 2 / 3,
    });
  });

  it('sin tareas (o todas omitidas) no hay porcentaje', () => {
    expect(statsOf([]).rate).toBeNull();
    expect(statsOf([row('SKIPPED')]).rate).toBeNull();
  });
});

describe('deltaOf (RP-03)', () => {
  it('compara solo si ambas semanas tienen datos', () => {
    expect(deltaOf(0.9, 0.75)).toBeCloseTo(0.15);
    expect(deltaOf(0.9, null)).toBeNull();
  });
});

describe('streakOf (RP-05)', () => {
  const weeks = byWeek(
    [
      row('DONE', '2026-10-13'),
      row('DONE', '2026-10-06'),
      row('PENDING', '2026-09-22'),
      row('DONE', '2026-09-23'),
    ],
    'MON',
  );

  it('cuenta semanas seguidas al 100 % y salta las semanas vacías', () => {
    // Semanas: 12-oct ✓, 05-oct ✓, 28-sep vacía, 21-sep ✗.
    expect(streakOf(weeks, '2026-10-12', '2026-01-05')).toBe(2);
  });

  it('una semana incompleta corta la racha', () => {
    expect(streakOf(weeks, '2026-09-21', '2026-01-05')).toBe(0);
  });
});
