import { CalendarX } from 'lucide-react';
import { useSearchParams } from 'react-router';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { useMembers } from '@/features/members/api/members.ts';
import { weekRangeLabel } from '@/shared/lib/format-date.ts';
import {
  Card,
  EmptyState,
  PageHeader,
  ProgressBar,
  Select,
  Skeleton,
  StatTile,
} from '@/shared/ui/index.ts';
import { useHistory } from '../api/reports.ts';
import { ReportsNav } from '../components/reports-nav.tsx';
import { TopMissedCard } from '../components/top-missed-card.tsx';
import { percent, rateTone } from '../lib/format.ts';

/** RP-10 / RP-11: el año de un miembro, semana a semana. Miembro y año viven en la URL. */
export function HistoryPage() {
  const { membership } = useHouseholdSession();
  const members = useMembers(true);
  const [params, setParams] = useSearchParams();
  const memberId = params.get('member') ?? membership.id;
  const yearParam = params.get('year');
  const year = yearParam ? Number(yearParam) : undefined;
  const history = useHistory(memberId, year);
  const data = history.data;

  const update = (key: 'member' | 'year', value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader title="Reportes" subtitle="Historial del año, semana a semana" />
      <ReportsNav />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 md:w-[28rem]">
        <Select
          label="Persona"
          value={memberId}
          onChange={(event) => update('member', event.target.value)}
          options={members.data?.map((m) => ({ value: m.id, label: m.displayName })) ?? []}
        />
        <Select
          label="Año"
          value={String(data?.year ?? '')}
          onChange={(event) => update('year', event.target.value)}
          options={(data?.availableYears ?? []).map((y) => ({
            value: String(y),
            label: String(y),
          }))}
        />
      </div>

      {!data ? (
        <Skeleton className="h-64" />
      ) : (
        <div className="flex flex-col gap-6">
          <section aria-label="Resumen del año" className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile label="Cumplimiento" value={percent(data.totals.rate)} />
            <StatTile label="Hechas" value={String(data.totals.done)} />
            <StatTile label="Sin hacer" value={String(data.totals.pending)} />
            <StatTile
              label="Semanas al 100 %"
              value={`${data.totals.perfectWeeks} de ${data.totals.weeksWithTasks}`}
            />
          </section>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-start">
            {data.weeks.length === 0 ? (
              <Card>
                <EmptyState
                  icon={<CalendarX />}
                  title="Sin tareas este año"
                  description={`${data.member.displayName} no tuvo tareas asignadas en ${data.year}.`}
                />
              </Card>
            ) : (
              <Card className="p-0 md:p-0">
                <ul className="divide-y divide-line">
                  {data.weeks.map((week) => (
                    <li key={week.weekStart} className="flex flex-col gap-2 px-4 py-3 md:px-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-body font-medium">
                          {weekRangeLabel(week.weekStart, week.weekEnd)}
                        </span>
                        <span className="text-small text-fg-2 tabular">
                          {week.done}/{week.assigned - week.skipped} · {percent(week.rate)}
                        </span>
                      </div>
                      <ProgressBar
                        value={week.rate ?? 0}
                        tone={rateTone(week.rate)}
                        label={`Semana del ${weekRangeLabel(week.weekStart, week.weekEnd)}`}
                      />
                      {week.missed.length > 0 && (
                        <p className="text-small text-danger">
                          Sin hacer: {week.missed.join(', ')}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </Card>
            )}

            <TopMissedCard
              weekStart={`${data.year}-01-01`}
              weekEnd={`${data.year}-12-31`}
              memberId={memberId}
              fixedRange={{
                from: `${data.year}-01-01`,
                to: `${data.year}-12-31`,
                label: `${data.member.displayName} · ${data.year}`,
              }}
            />
          </div>
        </div>
      )}
    </>
  );
}
