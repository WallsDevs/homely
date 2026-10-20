import type { Goal, GoalStatus } from '@homely/shared';
import { Wallet } from 'lucide-react';
import { Badge, CategoryIcon, ProgressBar, type BadgeTone } from '@/shared/ui/index.ts';
import { useMoney } from '../lib/use-money.ts';

const statusStyle: Record<
  GoalStatus,
  { label: string; tone: BadgeTone; bar: 'success' | 'warning' | 'danger' }
> = {
  OK: { label: 'Al día', tone: 'success', bar: 'success' },
  WARNING: { label: 'Cerca', tone: 'warning', bar: 'warning' },
  EXCEEDED: { label: 'Excedida', tone: 'danger', bar: 'danger' },
};

const periodLabel = { WEEKLY: 'esta semana', MONTHLY: 'este mes' } as const;

/** EX-06: nombre · gastado de meta · barra · estado. */
export function GoalCard({ goal }: { goal: Goal }) {
  const money = useMoney();
  const style = statusStyle[goal.progress.status];
  const name = goal.category?.name ?? 'Total del hogar';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {goal.category ? (
          <CategoryIcon icon={goal.category.icon} color={goal.category.color} />
        ) : (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <Wallet className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{name}</p>
          <p className="text-small text-fg-3 tabular">
            {money.format(goal.progress.spent)} de {money.format(goal.amount)}{' '}
            {periodLabel[goal.period]}
          </p>
        </div>
        <Badge tone={style.tone}>
          {style.label} · {Math.round(goal.progress.ratio * 100)} %
        </Badge>
      </div>
      <ProgressBar
        value={goal.progress.ratio}
        tone={style.bar}
        label={`${name}: ${Math.round(goal.progress.ratio * 100)} % de la meta`}
      />
    </div>
  );
}
