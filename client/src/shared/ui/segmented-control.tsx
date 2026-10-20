import { useId, type ReactNode } from 'react';
import { cn } from '../lib/cn.ts';

export type SegmentOption<T extends string> = { value: T; label: string; icon?: ReactNode };

type SegmentedControlProps<T extends string> = {
  label: string;
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Muestra solo iconos; las etiquetas quedan para lectores de pantalla y como tooltip. */
  iconsOnly?: boolean;
  hideLabel?: boolean;
  className?: string;
};

/** Selector segmentado con radios nativos: teclado (flechas) y lectores de pantalla sin esfuerzo. */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
  iconsOnly = false,
  hideLabel = true,
  className,
}: SegmentedControlProps<T>) {
  const name = useId();

  return (
    <fieldset className={cn('min-w-0', className)}>
      <legend className={cn('mb-1.5 text-small font-medium text-fg-2', hideLabel && 'sr-only')}>
        {label}
      </legend>
      <div
        className="grid gap-0.5 rounded-md bg-surface-2 p-0.5"
        style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <label
              key={option.value}
              title={option.label}
              className={cn(
                'flex h-9 min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-[5px] px-2 text-small transition-colors',
                'has-focus-visible:ring-2 has-focus-visible:ring-accent',
                selected
                  ? 'bg-surface font-medium text-fg shadow-sm'
                  : 'text-fg-3 hover-pointer:text-fg',
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={selected}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon && <span className="shrink-0 [&>svg]:size-4">{option.icon}</span>}
              <span className={cn('truncate', iconsOnly && 'sr-only')}>{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
