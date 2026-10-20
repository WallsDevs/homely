import { describe, expect, it } from 'vitest';
import { dateRangeSchema, isoDateSchema, moneySchema } from './common.ts';

describe('isoDateSchema', () => {
  it('acepta fechas AAAA-MM-DD válidas', () => {
    expect(isoDateSchema.safeParse('2026-10-19').success).toBe(true);
  });

  it('rechaza fechas con hora o inexistentes', () => {
    expect(isoDateSchema.safeParse('2026-10-19T10:00:00Z').success).toBe(false);
    expect(isoDateSchema.safeParse('2026-02-30').success).toBe(false);
  });
});

describe('moneySchema', () => {
  it('acepta montos con hasta dos decimales', () => {
    expect(moneySchema.safeParse('60').success).toBe(true);
    expect(moneySchema.safeParse('1234.5').success).toBe(true);
    expect(moneySchema.safeParse('0.01').success).toBe(true);
  });

  it('rechaza cero, negativos, más de dos decimales y números', () => {
    expect(moneySchema.safeParse('0').success).toBe(false);
    expect(moneySchema.safeParse('-5').success).toBe(false);
    expect(moneySchema.safeParse('1.999').success).toBe(false);
    expect(moneySchema.safeParse(60).success).toBe(false);
  });
});

describe('dateRangeSchema', () => {
  it('rechaza rangos invertidos', () => {
    expect(dateRangeSchema.safeParse({ from: '2025-12-31', to: '2025-01-01' }).success).toBe(false);
    expect(dateRangeSchema.safeParse({ from: '2025-01-01', to: '2025-12-31' }).success).toBe(true);
  });
});

describe('moneySchema · mensajes', () => {
  it('un formato inválido da un solo error', () => {
    const result = moneySchema.safeParse('12,50');
    expect(result.success).toBe(false);
    expect(result.error?.issues).toHaveLength(1);
  });
});
