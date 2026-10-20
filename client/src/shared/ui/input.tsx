import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../lib/cn.ts';

type InputProps = Omit<ComponentProps<'input'>, 'prefix'> & {
  label: string;
  helper?: string;
  error?: string | undefined;
  prefix?: ReactNode;
  suffix?: ReactNode;
  hideLabel?: boolean;
};

export function Input({
  label,
  helper,
  error,
  prefix,
  suffix,
  hideLabel = false,
  id,
  className,
  ...props
}: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const hint = error ?? helper;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label
        htmlFor={inputId}
        className={cn('text-small font-medium text-fg-2', hideLabel && 'sr-only')}
      >
        {label}
      </label>
      <div
        className={cn(
          'flex h-12 items-center gap-2 rounded-md border bg-surface px-3 transition-colors duration-150 md:h-10',
          'focus-within:border-accent focus-within:ring-2 focus-within:ring-accent-soft',
          error ? 'border-danger' : 'border-line',
        )}
      >
        {prefix && <span className="text-fg-3">{prefix}</span>}
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={hint ? hintId : undefined}
          // 16 px en móvil evita el zoom automático de iOS al enfocar.
          className="h-full min-w-0 flex-1 bg-transparent text-[16px] text-fg outline-none placeholder:text-fg-3 md:text-body"
          {...props}
        />
        {suffix && <span className="text-fg-3">{suffix}</span>}
      </div>
      {hint && (
        <p id={hintId} className={cn('text-small', error ? 'text-danger' : 'text-fg-3')}>
          {hint}
        </p>
      )}
    </div>
  );
}
