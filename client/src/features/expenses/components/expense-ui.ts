import type { Expense } from '@homely/shared';
import { createContext, use } from 'react';

export type ExpenseUI = {
  /** EX-02: quien lo registró o un admin. */
  canEdit: (expense: Expense) => boolean;
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
};

export const ExpenseUIContext = createContext<ExpenseUI | null>(null);

export function useExpenseUI(): ExpenseUI {
  const context = use(ExpenseUIContext);
  if (!context) throw new Error('useExpenseUI debe usarse dentro de <ExpenseUIProvider>');
  return context;
}
