import { addDays, type IsoDate } from '@homely/shared';
import { CircleCheckBig } from 'lucide-react';
import { useState } from 'react';
import { Card, CardHeader, SegmentedControl, Skeleton } from '@/shared/ui/index.ts';
import { useTopMissed } from '../api/reports.ts';

type Range = 'week' | 'month' | 'year';

type TopMissedCardProps = {
  weekStart: IsoDate;
  weekEnd: IsoDate;
  memberId?: string;
  /** Rango fijo (historial anual). Sin él, se elige semana / 4 semanas / año. */
  fixedRange?: { from: IsoDate; to: IsoDate; label: string };
};

/** RP-04: «qué tareas nunca se hacen», para la conversación en casa. */
export function TopMissedCard({ weekStart, weekEnd, memberId, fixedRange }: TopMissedCardProps) {
  const [range, setRange] = useState<Range>('month');
  const ranges: Record<Range, { from: IsoDate; to: IsoDate }> = {
    week: { from: weekStart, to: weekEnd },
    month: { from: addDays(weekStart, -21), to: weekEnd },
    year: { from: `${weekEnd.slice(0, 4)}-01-01`, to: weekEnd },
  };
  const selected = fixedRange ?? ranges[range];
  const missed = useTopMissed(selected.from, selected.to, memberId);

  return (
    <Card>
      <CardHeader title="Lo que más se queda sin hacer" subtitle={fixedRange?.label} />
      {!fixedRange && (
        <SegmentedControl
          label="Periodo"
          value={range}
          onChange={setRange}
          className="mb-4"
          options={[
            { value: 'week', label: 'Esta semana' },
            { value: 'month', label: '4 semanas' },
            { value: 'year', label: 'Este año' },
          ]}
        />
      )}
      {missed.isPending ? (
        <Skeleton className="h-24" />
      ) : missed.data?.length === 0 ? (
        <p className="flex items-center gap-2 text-body text-success">
          <CircleCheckBig className="size-5" aria-hidden /> Nada quedó sin hacer en este periodo.
        </p>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {missed.data?.map((item, index) => (
            <li key={item.title} className="flex items-center gap-3">
              <span className="w-5 text-small text-fg-3 tabular">{index + 1}.</span>
              <span className="flex-1 truncate text-body">{item.title}</span>
              <span className="text-small font-medium text-danger tabular">
                {item.missed} {item.missed === 1 ? 'vez' : 'veces'}
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}
