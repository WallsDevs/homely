import { ChevronRight } from 'lucide-react';
import { Link } from 'react-router';
import { Card, ProgressBar, Skeleton } from '@/shared/ui/index.ts';
import { useWeeklyReport } from '../api/reports.ts';
import { percent, rateTone } from '../lib/format.ts';

/** Dashboard · Semana: cumplimiento del hogar y acceso al reporte (RP-06). */
export function WeekProgressCard() {
  const report = useWeeklyReport(undefined);
  if (report.isPending) return <Skeleton className="h-28" />;
  const household = report.data?.household;
  if (!household) return null;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-h2">Esta semana</h2>
        <span className="text-h2 tabular">{percent(household.rate)}</span>
      </div>
      <ProgressBar
        value={household.rate ?? 0}
        tone={rateTone(household.rate)}
        label="Cumplimiento del hogar esta semana"
      />
      <p className="text-small text-fg-3 tabular">
        {household.done} hechas · {household.pending} pendientes
      </p>
      <Link
        to="/reports"
        className="inline-flex items-center gap-1 self-start text-small font-medium text-accent"
      >
        Ver reporte <ChevronRight className="size-4" aria-hidden />
      </Link>
    </Card>
  );
}
