import { endOfMonth, startOfMonth, todayIn, type Expense } from '@homely/shared';
import { Plus, Receipt, Search } from 'lucide-react';
import { useState } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { useMembers } from '@/features/members/api/members.ts';
import { useDebouncedValue } from '@/shared/hooks/use-debounced-value.ts';
import { dayHeading } from '@/shared/lib/format-date.ts';
import {
  Button,
  Card,
  EmptyState,
  Input,
  MonthPicker,
  PageHeader,
  Select,
  Skeleton,
} from '@/shared/ui/index.ts';
import { useCategories, useExpenses } from '../api/expenses.ts';
import { ExpenseRow } from '../components/expense-row.tsx';
import { useExpenseUI } from '../components/expense-ui.ts';
import { ExpensesNav } from '../components/expenses-nav.tsx';
import { useMoney } from '../lib/use-money.ts';

/** EX-03: gastos del mes agrupados por día, con filtros y el total del filtro siempre visible. */
export function ExpensesPage() {
  const { household } = useHouseholdSession();
  const { openCreate } = useExpenseUI();
  const money = useMoney();
  const today = todayIn(household.timezone);
  const categories = useCategories(true);
  const members = useMembers(true);

  const [month, setMonth] = useState(startOfMonth(today));
  const [categoryId, setCategoryId] = useState('');
  const [paidById, setPaidById] = useState('');
  const [search, setSearch] = useState('');
  const q = useDebouncedValue(search.trim());

  const expenses = useExpenses({
    from: month,
    to: endOfMonth(month),
    ...(categoryId ? { categoryId } : {}),
    ...(paidById ? { paidById } : {}),
    ...(q ? { q } : {}),
  });
  const items = expenses.data?.pages.flatMap((page) => page.items);
  const totals = expenses.data?.pages[0]?.totals;

  return (
    <>
      <PageHeader
        title="Gastos"
        action={
          <Button icon={<Plus className="size-4" />} onClick={openCreate}>
            Nuevo gasto
          </Button>
        }
      />
      <ExpensesNav />

      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <MonthPicker month={month} today={today} onChange={setMonth} />
          <div className="mt-3 px-1">
            {totals ? (
              <>
                <span className="text-display tabular">{money.format(totals.amount)}</span>
                <span className="ml-2 text-small text-fg-3">
                  {totals.count} {totals.count === 1 ? 'gasto' : 'gastos'}
                </span>
              </>
            ) : (
              <Skeleton className="h-9 w-40" />
            )}
          </div>
        </div>
        <div className="grid gap-3 md:w-[36rem] md:grid-cols-3">
          <Input
            label="Buscar"
            hideLabel
            type="search"
            placeholder="Buscar"
            prefix={<Search className="size-4" />}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Select
            label="Categoría"
            className="[&>label]:sr-only"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            options={[
              { value: '', label: 'Todas las categorías' },
              ...(categories.data?.map((c) => ({ value: c.id, label: c.name })) ?? []),
            ]}
          />
          <Select
            label="Quién pagó"
            className="[&>label]:sr-only"
            value={paidById}
            onChange={(event) => setPaidById(event.target.value)}
            options={[
              { value: '', label: 'Cualquiera' },
              ...(members.data?.map((m) => ({ value: m.id, label: `Pagó ${m.displayName}` })) ??
                []),
            ]}
          />
        </div>
      </div>

      {!items ? (
        <Skeleton className="h-64" />
      ) : items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Receipt />}
            title="Sin gastos"
            description="No hay gastos con estos filtros. Registra uno con el botón +."
          />
        </Card>
      ) : (
        <ExpensesByDay expenses={items} today={today} />
      )}

      {expenses.hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="secondary"
            loading={expenses.isFetchingNextPage}
            onClick={() => void expenses.fetchNextPage()}
          >
            Cargar más
          </Button>
        </div>
      )}
    </>
  );
}

function ExpensesByDay({ expenses, today }: { expenses: Expense[]; today: string }) {
  const money = useMoney();
  const days = new Map<string, Expense[]>();
  for (const expense of expenses) {
    days.set(expense.date, [...(days.get(expense.date) ?? []), expense]);
  }

  return (
    <div className="flex flex-col gap-5">
      {[...days].map(([day, items]) => {
        const subtotal = items.reduce((sum, item) => sum + Number(item.amount), 0);
        return (
          <section key={day}>
            <h2 className="mb-2 flex justify-between px-1 text-caption text-fg-3 uppercase">
              <span>{dayHeading(day, today)}</span>
              <span className="tabular">{money.format(subtotal)}</span>
            </h2>
            <Card className="p-0 md:p-0">
              <ul className="divide-y divide-line">
                {items.map((expense) => (
                  <ExpenseRow key={expense.id} expense={expense} />
                ))}
              </ul>
            </Card>
          </section>
        );
      })}
    </div>
  );
}
