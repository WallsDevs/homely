import { describe, expect, it } from 'vitest';
import { deltaOf, percent, rateTone } from './format.ts';

describe('percent', () => {
  it('redondea y muestra guion sin datos', () => {
    expect(percent(0.857)).toBe('86 %');
    expect(percent(1)).toBe('100 %');
    expect(percent(null)).toBe('—');
  });
});

describe('deltaOf', () => {
  it('describe la variación en puntos', () => {
    expect(deltaOf(0.12)).toEqual({ text: '+12 % vs. anterior', direction: 'up' });
    expect(deltaOf(-0.05)).toEqual({ text: '−5 % vs. anterior', direction: 'down' });
    expect(deltaOf(0.001)?.direction).toBe('flat');
    expect(deltaOf(null)).toBeUndefined();
  });
});

describe('rateTone', () => {
  it('verde al 100 %, ámbar desde 60 %, rojo por debajo', () => {
    expect(rateTone(1)).toBe('success');
    expect(rateTone(0.75)).toBe('warning');
    expect(rateTone(0.4)).toBe('danger');
    expect(rateTone(null)).toBe('accent');
  });
});
