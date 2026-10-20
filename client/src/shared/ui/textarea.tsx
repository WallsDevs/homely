import { useId, type ComponentProps } from 'react';
import { cn } from '../lib/cn.ts';

type TextareaProps = ComponentProps<'textarea'> & {
  label: string;
  error?: string | undefined;
};

export function Textarea({ label, error, id, className, ...props }: TextareaProps) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const errorId = `${textareaId}-error`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={textareaId} className="text-small font-medium text-fg-2">
        {label}
      </label>
      <textarea
        id={textareaId}
        rows={3}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className={cn(
          'min-h-20 resize-y rounded-md border bg-surface px-3 py-2.5 text-[16px] text-fg outline-none md:text-body',
          'transition-colors duration-150 placeholder:text-fg-3 focus:border-accent focus:ring-2 focus:ring-accent-soft',
          error ? 'border-danger' : 'border-line',
        )}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-small text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
