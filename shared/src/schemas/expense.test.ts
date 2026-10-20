import { describe, expect, it } from 'vitest';
import { createExpenseSchema, goalStatusOf } from './expense.ts';

describe('goalStatusOf (EX-06)', () => {
  it('respeta los umbrales 80 % y 100 %', () => {
    expect(goalStatusOf(0.799)).toBe('OK');
    expect(goalStatusOf(0.8)).toBe('WARNING');
    expect(goalStatusOf(1)).toBe('WARNING');
    expect(goalStatusOf(1.001)).toBe('EXCEEDED');
  });
});

describe('createExpenseSchema', () => {
  it('acepta un gasto mínimo y normaliza la descripción vacía', () => {
    const expense = createExpenseSchema.parse({
      amount: '60',
      categoryId: 'c1',
      date: '2026-10-19',
      description: '',
    });
    expect(expense).toMatchObject({ amount: '60', description: null });
  });

  it('rechaza montos inválidos', () => {
    for (const amount of ['0', '-3', '12.345', 'abc']) {
      expect(
        createExpenseSchema.safeParse({ amount, categoryId: 'c1', date: '2026-10-19' }).success,
      ).toBe(false);
    }
  });
});
