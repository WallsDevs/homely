import { ChevronRight, TriangleAlert, Wallet } from 'lucide-react';
import { Link } from 'react-router';
import { cn } from '@/shared/lib/cn.ts';
import { Card, CategoryIcon, EmptyState, Skeleton } from '@/shared/ui/index.ts';
import { useExpenseSummary } from '../api/expenses.ts';
import { useMoney } from '../lib/use-money.ts';

const TOP_CATEGORIES = 3;

/** EX-07: avisos de metas en WARNING/EXCEEDED. Discretos, arriba del Inicio. */
export function GoalAlerts() {
  const summary = useExpenseSummary();
  const money = useMoney();
  const alerts = summary.data?.goals.filter((goal) => goal.progress.status !== 'OK') ?? [];
  if (alerts.length === 0) return null;

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((goal) => {
        const exceeded = goal.progress.status === 'EXCEEDED';
        return (
          <Link
            key={goal.id}
            to="/expenses/goals"
            className={cn(
              'flex items-center gap-3 rounded-md border px-4 py-3',
              exceeded
                ? 'border-danger/30 bg-danger-soft text-danger'
                : 'border-warning/30 bg-warning-soft text-warning',
            )}
          >
            <TriangleAlert className="size-5 shrink-0" aria-hidden />
            <span className="flex-1 text-body">
              <strong className="font-medium">{goal.category?.name ?? 'Gasto total'}:</strong>{' '}
              <span className="tabular">
                {money.format(goal.progress.spent, true)} de {money.format(goal.amount, true)}
              </span>{' '}
              · {Math.round(goal.progress.ratio * 100)} %{exceeded ? ' — meta excedida' : ''}
            </span>
            <ChevronRight className="size-4 shrink-0" aria-hidden />
          </Link>
        );
      })}
    </div>
  );
}

/** Dashboard · Gastos del mes: total, mes anterior como referencia y categorías principales. */
export function MonthSpendingCard() {
  const summary = useExpenseSummary();
  const money = useMoney();

  if (summary.isPending) return <Skeleton className="h-56" />;
  const data = summary.data;
  const total = Number(data?.total ?? 0);
  const previous = Number(data?.previousTotal ?? 0);
  const top = data?.byCategory.slice(0, TOP_CATEGORIES) ?? [];

  return (
    <Card className="flex flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <h2 className="text-h2">Gastos del mes</h2>
        <Link to="/expenses" className="text-small font-medium text-accent">
          Ver gastos
        </Link>
      </header>

      {total === 0 ? (
        <EmptyState
          icon={<Wallet />}
          title="Sin gastos este mes"
          description="Registra uno con el botón + y aquí verás el total y en qué se va."
        />
      ) : (
        <>
          <div>
            <p className="text-display tabular">{money.format(total)}</p>
            {/* El mes en curso está a medias: el anterior va como referencia, sin porcentaje. */}
            {previous > 0 && (
              <p className="mt-1 text-small text-fg-3 tabular">
                Mes anterior: {money.format(previous)}
              </p>
            )}
          </div>
          <ul className="flex flex-col gap-3">
            {top.map(({ category, amount }) => (
              <li key={category.id} className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2.5">
                  <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                  <span className="flex-1 truncate text-body">{category.name}</span>
                  <span className="text-body font-medium tabular">
                    {money.format(amount, true)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" aria-hidden>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((Number(amount) / total) * 100)}%`,
                      backgroundColor: category.color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
