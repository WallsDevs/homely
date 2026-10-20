import { describe, expect, it } from 'vitest';
import { dayHeading, dueLabel, weekRangeLabel } from './format-date.ts';

const today = '2026-10-19'; // lunes

describe('dueLabel', () => {
  it('usa palabras para los días cercanos', () => {
    expect(dueLabel('2026-10-19', today)).toBe('Hoy');
    expect(dueLabel('2026-10-20', today)).toBe('Mañana');
    expect(dueLabel('2026-10-18', today)).toBe('Ayer');
  });

  it('usa el día de la semana dentro de los próximos 7 días', () => {
    expect(dueLabel('2026-10-21', today)).toBe('mié 21');
  });

  it('usa día y mes más lejos, y el año si es otro', () => {
    expect(dueLabel('2026-11-03', today)).toBe('3 nov');
    expect(dueLabel('2025-12-31', today)).toBe('31 dic 2025');
  });
});

describe('dayHeading', () => {
  it('nombra el día completo', () => {
    expect(dayHeading('2026-10-22', today)).toBe('Jueves 22');
  });
});

describe('weekRangeLabel', () => {
  it('compacta el mes cuando coincide', () => {
    expect(weekRangeLabel('2026-10-19', '2026-10-25')).toBe('19 – 25 oct');
    expect(weekRangeLabel('2026-10-26', '2026-11-01')).toBe('26 oct – 1 nov');
  });
});

describe('monthLabel', () => {
  it('nombra el mes y el año', async () => {
    const { monthLabel } = await import('./format-date.ts');
    expect(monthLabel('2026-10-19')).toBe('Octubre 2026');
  });
});
