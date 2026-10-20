import type { Expense } from '@homely/shared';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { ExpenseFormSheet } from './expense-form-sheet.tsx';
import { ExpenseUIContext, type ExpenseUI } from './expense-ui.ts';

type FormState = { open: false } | { open: true; expense?: Expense };

/** Montado en el layout: el formulario de gasto se abre desde cualquier pantalla (EX-01). */
export function ExpenseUIProvider({ children }: { children: ReactNode }) {
  const { membership, isAdmin } = useHouseholdSession();
  const [form, setForm] = useState<FormState>({ open: false });

  const canEdit = useCallback(
    (expense: Expense) => isAdmin || expense.registeredBy?.id === membership.id,
    [isAdmin, membership.id],
  );

  const value = useMemo<ExpenseUI>(
    () => ({
      canEdit,
      openCreate: () => setForm({ open: true }),
      openEdit: (expense) => setForm({ open: true, expense }),
    }),
    [canEdit],
  );

  return (
    <ExpenseUIContext value={value}>
      {children}
      <ExpenseFormSheet
        open={form.open}
        expense={form.open ? form.expense : undefined}
        onClose={() => setForm({ open: false })}
      />
    </ExpenseUIContext>
  );
}
