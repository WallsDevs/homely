import { describe, expect, it } from 'vitest';
import { emailSchema } from './auth.ts';
import { createHouseholdSchema, invitationCodeSchema } from './household.ts';

describe('invitationCodeSchema', () => {
  it('normaliza mayúsculas y guion', () => {
    expect(invitationCodeSchema.parse('k7mp-qw3r')).toBe('K7MPQW3R');
    expect(invitationCodeSchema.parse(' K7MP QW3R ')).toBe('K7MPQW3R');
  });

  it('rechaza longitudes incorrectas', () => {
    expect(invitationCodeSchema.safeParse('K7MP').success).toBe(false);
  });
});

describe('createHouseholdSchema', () => {
  it('aplica moneda e inicio de semana por defecto', () => {
    expect(createHouseholdSchema.parse({ name: 'Casa', timezone: 'America/Bogota' })).toEqual({
      name: 'Casa',
      currency: 'USD',
      timezone: 'America/Bogota',
      weekStartsOn: 'MON',
    });
  });

  it('rechaza zonas horarias inexistentes', () => {
    const result = createHouseholdSchema.safeParse({ name: 'Casa', timezone: 'Marte/Olympus' });
    expect(result.success).toBe(false);
  });
});

describe('emailSchema', () => {
  it('normaliza espacios y mayúsculas', () => {
    expect(emailSchema.parse('  Iveth@Homely.DEV ')).toBe('iveth@homely.dev');
  });
});
