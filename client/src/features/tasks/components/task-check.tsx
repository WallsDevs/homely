import { Check } from 'lucide-react';
import { cn } from '@/shared/lib/cn.ts';

type TaskCheckProps = {
  checked: boolean;
  label: string;
  disabled?: boolean;
  onChange: () => void;
};

/** Checkbox redondo de 28 px dentro de un área táctil de 44 px, en la zona del pulgar. */
export function TaskCheck({ checked, label, disabled = false, onChange }: TaskCheckProps) {
  return (
    <label
      className={cn(
        'relative -m-2 flex size-11 shrink-0 items-center justify-center',
        disabled ? 'cursor-not-allowed' : 'cursor-pointer',
      )}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        aria-label={label}
        className={cn(
          'peer size-7 appearance-none rounded-full border-2 transition-colors duration-150',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent',
          checked ? 'border-success bg-success' : 'border-line bg-surface',
          !checked && !disabled && 'hover-pointer:border-success',
          disabled && !checked && 'border-dashed opacity-60',
        )}
      />
      <Check
        aria-hidden
        strokeWidth={3}
        className={cn(
          'pointer-events-none absolute size-4 text-canvas transition-transform duration-150',
          checked ? 'scale-100' : 'scale-0',
        )}
      />
    </label>
  );
}
