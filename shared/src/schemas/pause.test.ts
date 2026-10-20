import { describe, expect, it } from 'vitest';
import { createPauseSchema, pauseScopeOf, updatePauseSchema } from './pause.ts';

const range = { startsOn: '2026-12-20', endsOn: '2026-12-28' };

describe('createPauseSchema', () => {
  it('acepta una pausa de hogar con razón vacía como null', () => {
    expect(createPauseSchema.parse({ ...range, reason: '  ' })).toMatchObject({
      ...range,
      reason: null,
    });
  });

  it('no permite persona y plan a la vez', () => {
    const result = createPauseSchema.safeParse({ ...range, memberId: 'm1', planId: 'p1' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['planId']);
  });

  it('valida el orden de las fechas', () => {
    expect(
      createPauseSchema.safeParse({ startsOn: '2026-12-28', endsOn: '2026-12-20' }).success,
    ).toBe(false);
  });
});

describe('updatePauseSchema', () => {
  it('permite cambios parciales y valida el rango si vienen ambas fechas', () => {
    expect(updatePauseSchema.parse({ endsOn: '2026-12-30' })).toEqual({ endsOn: '2026-12-30' });
    expect(
      updatePauseSchema.safeParse({ startsOn: '2027-01-05', endsOn: '2027-01-01' }).success,
    ).toBe(false);
  });
});

describe('pauseScopeOf', () => {
  it('deduce el alcance', () => {
    expect(pauseScopeOf({ memberId: null, planId: null })).toBe('HOUSEHOLD');
    expect(pauseScopeOf({ memberId: 'm1', planId: null })).toBe('MEMBER');
    expect(pauseScopeOf({ memberId: null, planId: 'p1' })).toBe('PLAN');
  });
});
