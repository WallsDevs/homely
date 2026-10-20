import { describe, expect, it } from 'vitest';
import { createPlanSchema, updatePlanSchema } from './plan.ts';

const base = { title: 'Sacar la basura', assigneeId: null };

describe('createPlanSchema', () => {
  it('ordena y deduplica los días', () => {
    const plan = createPlanSchema.parse({ ...base, weekdays: ['SAT', 'WED', 'SAT'] });
    expect(plan.weekdays).toEqual(['WED', 'SAT']);
    expect(plan.priority).toBe('MEDIUM');
  });

  it('exige al menos un día', () => {
    expect(createPlanSchema.safeParse({ ...base, weekdays: [] }).success).toBe(false);
  });

  it('acepta fechas vacías como "sin límite" y valida el orden del rango', () => {
    const plan = createPlanSchema.parse({ ...base, weekdays: ['MON'], startsOn: '', endsOn: '' });
    expect(plan).toMatchObject({ startsOn: null, endsOn: null });

    const invalid = createPlanSchema.safeParse({
      ...base,
      weekdays: ['MON'],
      startsOn: '2026-12-01',
      endsOn: '2026-11-01',
    });
    expect(invalid.success).toBe(false);
  });
});

describe('updatePlanSchema', () => {
  it('permite cambios parciales', () => {
    expect(updatePlanSchema.parse({ weekdays: ['SUN', 'MON'] })).toEqual({
      weekdays: ['MON', 'SUN'],
    });
  });
});
