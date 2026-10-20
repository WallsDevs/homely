import { ChevronDown } from 'lucide-react';
import { useId, type ComponentProps } from 'react';
import { cn } from '../lib/cn.ts';

export type SelectOption = { value: string; label: string };

type SelectProps = ComponentProps<'select'> & {
  label: string;
  options: readonly SelectOption[];
  helper?: string;
  error?: string | undefined;
};

/** `<select>` nativo: en móvil abre el selector del sistema, que es el más cómodo con el pulgar. */
export function Select({ label, options, helper, error, id, className, ...props }: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const hintId = `${selectId}-hint`;
  const hint = error ?? helper;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={selectId} className="text-small font-medium text-fg-2">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            'h-12 w-full appearance-none rounded-md border bg-surface pr-10 pl-3 text-[16px] text-fg outline-none md:h-10 md:text-body',
            'transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent-soft',
            error ? 'border-danger' : 'border-line',
          )}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-fg-3"
        />
      </div>
      {hint && (
        <p id={hintId} className={cn('text-small', error ? 'text-danger' : 'text-fg-3')}>
          {hint}
        </p>
      )}
    </div>
  );
}
