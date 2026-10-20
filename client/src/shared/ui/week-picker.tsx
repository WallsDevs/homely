import { addDays, type IsoDate } from '@homely/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { weekRangeLabel } from '../lib/format-date.ts';
import { Button, IconButton } from './button.tsx';

type WeekPickerProps = {
  weekStart: IsoDate;
  weekEnd: IsoDate;
  /** Hoy en la zona del hogar: si cae fuera de la semana se ofrece volver. */
  today: IsoDate;
  /** Recibe cualquier día de la semana elegida. */
  onChange: (day: IsoDate) => void;
};

export function WeekPicker({ weekStart, weekEnd, today, onChange }: WeekPickerProps) {
  const isCurrent = today >= weekStart && today <= weekEnd;

  return (
    <div className="flex items-center gap-1">
      <IconButton
        aria-label="Semana anterior"
        icon={<ChevronLeft className="size-5" />}
        onClick={() => onChange(addDays(weekStart, -7))}
      />
      <span className="min-w-28 text-center text-body font-medium tabular" aria-live="polite">
        {weekRangeLabel(weekStart, weekEnd)}
      </span>
      <IconButton
        aria-label="Semana siguiente"
        icon={<ChevronRight className="size-5" />}
        onClick={() => onChange(addDays(weekStart, 7))}
      />
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={() => onChange(today)}>
          Esta semana
        </Button>
      )}
    </div>
  );
}
