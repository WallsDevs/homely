import type { ComponentProps } from 'react';
import { cn } from '../lib/cn.ts';

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

const tones: Record<BadgeTone, string> = {
  neutral: 'bg-surface-2 text-fg-2',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  info: 'bg-info-soft text-info',
};

type BadgeProps = ComponentProps<'span'> & { tone?: BadgeTone };

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-5 items-center gap-1 rounded-full px-2 text-caption whitespace-nowrap uppercase',
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}
