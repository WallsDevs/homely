import { describe, expect, it } from 'vitest';
import { cn } from './cn.ts';

describe('cn', () => {
  it('la última clase en conflicto gana', () => {
    expect(cn('p-4 md:p-5', 'p-0 md:p-0')).toBe('p-0 md:p-0');
    expect(cn('text-fg-2', 'text-danger')).toBe('text-danger');
  });

  it('no confunde tamaños de texto propios con colores', () => {
    expect(cn('text-small text-fg-2')).toBe('text-small text-fg-2');
    expect(cn('text-body', 'text-small')).toBe('text-small');
  });

  it('acepta condicionales', () => {
    const hidden = Math.random() > 2;
    expect(cn('a', hidden && 'b', undefined, ['c'])).toBe('a c');
  });
});
