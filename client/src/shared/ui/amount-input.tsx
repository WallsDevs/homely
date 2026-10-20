import { useId, type ComponentProps } from 'react';
import { cn } from '../lib/cn.ts';

type AmountInputProps = Omit<ComponentProps<'input'>, 'type' | 'inputMode'> & {
  label: string;
  currencySymbol: string;
  error?: string | undefined;
};

/**
 * Monto grande y centrado para registrar gastos (EX-01). Abre el teclado numérico en móvil.
 * Acepta coma o punto como separador decimal: quien escribe "12,50" no debe pelear con el campo.
 */
export function AmountInput({
  label,
  currencySymbol,
  error,
  id,
  className,
  onChange,
  ...props
}: AmountInputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <div className={cn('flex flex-col items-center gap-1', className)}>
      <label htmlFor={inputId} className="text-small font-medium text-fg-2">
        {label}
      </label>
      <div className="flex items-baseline justify-center gap-1">
        <span className="text-h1 text-fg-3">{currencySymbol}</span>
        <input
          id={inputId}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="0"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="w-[7ch] min-w-0 bg-transparent text-center text-[40px] leading-tight font-semibold tracking-tight text-fg tabular outline-none placeholder:text-fg-3 md:text-[32px]"
          onChange={(event) => {
            event.target.value = event.target.value.replace(',', '.').replace(/[^\d.]/g, '');
            onChange?.(event);
          }}
          {...props}
        />
      </div>
      {error && (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
