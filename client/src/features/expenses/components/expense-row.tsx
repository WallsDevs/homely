import type { Expense } from '@homely/shared';
import { CategoryIcon } from '@/shared/ui/index.ts';
import { useMoney } from '../lib/use-money.ts';
import { useExpenseUI } from './expense-ui.ts';

/** Fila de gasto: icono de categoría, descripción, quién pagó y monto alineado a la derecha. */
export function ExpenseRow({ expense }: { expense: Expense }) {
  const { canEdit, openEdit } = useExpenseUI();
  const money = useMoney();
  const editable = canEdit(expense);

  const content = (
    <>
      <CategoryIcon icon={expense.category.icon} color={expense.category.color} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{expense.description ?? expense.category.name}</span>
        <span className="truncate text-small text-fg-3">
          {expense.description ? expense.category.name : null}
          {expense.description && expense.paidBy ? ' · ' : null}
          {expense.paidBy ? `pagó ${expense.paidBy.displayName}` : null}
        </span>
      </span>
      <span className="shrink-0 font-medium tabular">{money.format(expense.amount)}</span>
    </>
  );

  return (
    <li>
      {editable ? (
        <button
          type="button"
          onClick={() => openEdit(expense)}
          className="flex min-h-14 w-full items-center gap-3 px-4 py-2 text-left transition-colors active:bg-surface-2 hover-pointer:bg-surface-2"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-h-14 items-center gap-3 px-4 py-2">{content}</div>
      )}
    </li>
  );
}
