import { addDays, endOfMonth, startOfMonth, type IsoDate } from '@homely/shared';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel } from '../lib/format-date.ts';
import { Button, IconButton } from './button.tsx';

type MonthPickerProps = {
  /** Cualquier día del mes mostrado. */
  month: IsoDate;
  today: IsoDate;
  onChange: (month: IsoDate) => void;
};

export function MonthPicker({ month, today, onChange }: MonthPickerProps) {
  const start = startOfMonth(month);
  const isCurrent = start === startOfMonth(today);

  return (
    <div className="flex items-center gap-1">
      <IconButton
        aria-label="Mes anterior"
        icon={<ChevronLeft className="size-5" />}
        onClick={() => onChange(startOfMonth(addDays(start, -1)))}
      />
      <span className="min-w-32 text-center text-body font-medium" aria-live="polite">
        {monthLabel(start)}
      </span>
      <IconButton
        aria-label="Mes siguiente"
        icon={<ChevronRight className="size-5" />}
        onClick={() => onChange(addDays(endOfMonth(start), 1))}
      />
      {!isCurrent && (
        <Button variant="ghost" size="sm" onClick={() => onChange(startOfMonth(today))}>
          Este mes
        </Button>
      )}
    </div>
  );
}
