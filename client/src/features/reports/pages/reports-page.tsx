import type { IsoDate, MemberWeek, WeeklyReport } from '@homely/shared';
import { ArrowDownRight, ArrowUpRight, Flame } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { GoalCard } from '@/features/expenses/components/goal-card.tsx';
import { useMoney } from '@/features/expenses/lib/use-money.ts';
import { cn } from '@/shared/lib/cn.ts';
import { weekRangeLabel } from '@/shared/lib/format-date.ts';
import {
  Avatar,
  Badge,
  Card,
  CardHeader,
  CategoryIcon,
  PageHeader,
  ProgressBar,
  Skeleton,
  StatTile,
  WeekPicker,
} from '@/shared/ui/index.ts';
import { useWeeklyReport } from '../api/reports.ts';
import { ReportsNav } from '../components/reports-nav.tsx';
import { TopMissedCard } from '../components/top-missed-card.tsx';
import { deltaOf, percent, rateTone } from '../lib/format.ts';

/** RP-01 … RP-06 + gastos de la semana (EX-08). */
export function ReportsPage() {
  const [week, setWeek] = useState<IsoDate | undefined>(undefined);
  const report = useWeeklyReport(week);
  const data = report.data;

  return (
    <>
      <PageHeader
        title="Reportes"
        subtitle={data ? `Semana del ${weekRangeLabel(data.weekStart, data.weekEnd)}` : undefined}
      />
      <ReportsNav />

      {!data ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-28" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <WeekPicker
              weekStart={data.weekStart}
              weekEnd={data.weekEnd}
              today={data.today}
              onChange={setWeek}
            />
            <Badge tone={data.isClosed ? 'neutral' : 'accent'}>
              {data.isClosed ? 'Semana cerrada' : 'Semana en curso'}
            </Badge>
          </div>

          <HouseholdTiles report={data} />

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start">
            <MembersCard report={data} />
            <TopMissedCard weekStart={data.weekStart} weekEnd={data.weekEnd} />
          </div>

          <ExpensesCard report={data} />
        </div>
      )}
    </>
  );
}

function HouseholdTiles({ report }: { report: WeeklyReport }) {
  const { household, isClosed } = report;
  return (
    <section aria-label="Resumen del hogar" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <StatTile
        label="Cumplimiento"
        value={percent(household.rate)}
        {...withDelta(household.deltaRate)}
      />
      <StatTile label="Hechas" value={String(household.done)} />
      <StatTile label={isClosed ? 'Sin hacer' : 'Pendientes'} value={String(household.pending)} />
      <StatTile label="Omitidas" value={String(household.skipped)} />
    </section>
  );
}

/** `exactOptionalPropertyTypes`: solo se pasa `delta` cuando existe. */
function withDelta(delta: number | null) {
  const value = deltaOf(delta);
  return value ? { delta: value } : {};
}

/** RP-02: barra comparativa por miembro, con racha y variación. */
function MembersCard({ report }: { report: WeeklyReport }) {
  return (
    <Card>
      <CardHeader title="Por persona" />
      {report.members.length === 0 ? (
        <p className="text-body text-fg-2">Nadie tuvo tareas esta semana.</p>
      ) : (
        <ul className="flex flex-col gap-5">
          {report.members.map((entry) => (
            <MemberRow key={entry.member.id} entry={entry} isClosed={report.isClosed} />
          ))}
        </ul>
      )}
    </Card>
  );
}

function MemberRow({ entry, isClosed }: { entry: MemberWeek; isClosed: boolean }) {
  const delta = deltaOf(entry.deltaRate);
  return (
    <li className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Avatar name={entry.member.displayName} color={entry.member.color} size={32} />
        <Link
          to={`/reports/history?member=${entry.member.id}`}
          className="min-w-0 flex-1 truncate font-medium hover-pointer:underline"
        >
          {entry.member.displayName}
        </Link>
        {entry.streak > 1 && (
          <Badge tone="warning" title="Semanas seguidas al 100 %">
            <Flame className="size-3" aria-hidden /> {entry.streak} sem.
          </Badge>
        )}
        <span className="text-body font-medium tabular">{percent(entry.rate)}</span>
        {delta && delta.direction !== 'flat' && (
          <span
            className={cn(
              'inline-flex items-center text-small tabular',
              delta.direction === 'up' ? 'text-success' : 'text-danger',
            )}
            aria-label={delta.text}
          >
            {delta.direction === 'up' ? (
              <ArrowUpRight className="size-3.5" aria-hidden />
            ) : (
              <ArrowDownRight className="size-3.5" aria-hidden />
            )}
          </span>
        )}
      </div>
      <ProgressBar
        value={entry.rate ?? 0}
        tone={rateTone(entry.rate)}
        label={`Cumplimiento de ${entry.member.displayName}`}
      />
      <p className="text-small text-fg-3 tabular">
        {entry.done} de {entry.assigned - entry.skipped} hechas
        {entry.pending > 0 && ` · ${entry.pending} ${isClosed ? 'sin hacer' : 'pendientes'}`}
        {entry.skipped > 0 && ` · ${entry.skipped} omitidas`}
      </p>
    </li>
  );
}

function ExpensesCard({ report }: { report: WeeklyReport }) {
  const money = useMoney();
  const { expenses } = report;
  const total = Number(expenses.total);
  const previous = Number(expenses.previousTotal);
  // Solo se compara una semana cerrada: a mitad de semana la comparación engaña.
  const delta = !report.isClosed || previous === 0 ? null : (total - previous) / previous;

  return (
    <Card>
      <CardHeader title="Gastos de la semana" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div>
          <p className="text-display tabular">{money.format(total)}</p>
          {delta !== null && (
            <p className={cn('text-small tabular', delta > 0 ? 'text-danger' : 'text-success')}>
              {delta > 0 ? '+' : '−'}
              {Math.abs(Math.round(delta * 100))} % vs. semana anterior
            </p>
          )}
          {expenses.byPayer.length > 0 && (
            <ul className="mt-4 flex flex-col gap-1.5">
              {expenses.byPayer.map((payer) => (
                <li
                  key={payer.member?.id ?? 'none'}
                  className="flex justify-between text-small text-fg-2"
                >
                  <span>Pagó {payer.member?.displayName ?? 'nadie en particular'}</span>
                  <span className="tabular">{money.format(payer.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="lg:col-span-2">
          {expenses.byCategory.length === 0 ? (
            <p className="text-body text-fg-2">Sin gastos esta semana.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {expenses.byCategory.map(({ category, amount }) => (
                <li key={category.id} className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2.5">
                    <CategoryIcon icon={category.icon} color={category.color} size="sm" />
                    <span className="flex-1 truncate">{category.name}</span>
                    <span className="font-medium tabular">{money.format(amount)}</span>
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
          )}
        </div>
      </div>

      {expenses.goals.length > 0 && (
        <div className="mt-6 border-t border-line pt-5">
          <h3 className="mb-4 text-caption text-fg-3 uppercase">Metas</h3>
          <div className="grid gap-5 md:grid-cols-2">
            {expenses.goals.map((goal) => (
              <GoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}
