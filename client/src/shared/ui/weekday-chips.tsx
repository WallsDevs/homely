import { WEEKDAYS, type Weekday } from '@homely/shared';
import { cn } from '../lib/cn.ts';
import { describeWeekdays, LONG } from '../lib/weekdays.ts';

const SHORT: Record<Weekday, string> = {
  MON: 'L',
  TUE: 'M',
  WED: 'X',
  THU: 'J',
  FRI: 'V',
  SAT: 'S',
  SUN: 'D',
};

type WeekdayChipsProps = {
  value: readonly Weekday[];
  /** Sin `onChange` se muestran en modo lectura. */
  onChange?: (days: Weekday[]) => void;
  label?: string;
  error?: string | undefined;
  size?: 'sm' | 'md';
};

/** L M X J V S D. Seleccionables (formulario de plan) o de solo lectura (lista de planes). */
export function WeekdayChips({ value, onChange, label, error, size = 'md' }: WeekdayChipsProps) {
  const chipSize = size === 'md' ? 'size-10 text-body' : 'size-6 text-caption';

  if (!onChange) {
    return (
      <span className="flex gap-1" aria-label={describeWeekdays(value)}>
        {WEEKDAYS.map((day) => (
          <span
            key={day}
            aria-hidden
            className={cn(
              'flex items-center justify-center rounded-full font-medium',
              chipSize,
              value.includes(day) ? 'bg-accent-soft text-accent' : 'text-fg-3',
            )}
          >
            {SHORT[day]}
          </span>
        ))}
      </span>
    );
  }

  const toggle = (day: Weekday) =>
    onChange(
      value.includes(day)
        ? value.filter((d) => d !== day)
        : WEEKDAYS.filter((d) => d === day || value.includes(d)),
    );

  return (
    <fieldset>
      {label && <legend className="mb-2 text-small font-medium text-fg-2">{label}</legend>}
      <div className="flex justify-between gap-1 md:justify-start md:gap-2">
        {WEEKDAYS.map((day) => {
          const checked = value.includes(day);
          return (
            <label
              key={day}
              title={LONG[day]}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-full font-medium transition-colors',
                'has-focus-visible:ring-2 has-focus-visible:ring-accent has-focus-visible:ring-offset-2 has-focus-visible:ring-offset-surface',
                chipSize,
                checked
                  ? 'bg-accent text-accent-fg'
                  : 'border border-line text-fg-2 hover-pointer:bg-surface-2',
              )}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => toggle(day)}
                aria-label={LONG[day]}
                className="sr-only"
              />
              <span aria-hidden>{SHORT[day]}</span>
            </label>
          );
        })}
      </div>
      {error && <p className="mt-1.5 text-small text-danger">{error}</p>}
    </fieldset>
  );
}
