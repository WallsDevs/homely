import { describe, expect, it } from 'vitest';
import { currencySymbol, formatMoney } from './money.ts';

describe('formatMoney', () => {
  it('formatea con la moneda del hogar y dos decimales', () => {
    expect(formatMoney('60', 'USD')).toMatch(/60,00/);
    expect(formatMoney('1234.5', 'EUR')).toMatch(/1234,50|1\.234,50/);
  });

  it('modo compacto sin decimales', () => {
    expect(formatMoney('265.40', 'USD', true)).toMatch(/265/);
    expect(formatMoney('265.40', 'USD', true)).not.toMatch(/,40/);
  });

  it('símbolo estrecho de la moneda', () => {
    expect(currencySymbol('USD')).toBe('$');
    expect(currencySymbol('EUR')).toBe('€');
  });
});
