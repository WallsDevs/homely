import { cn } from '../lib/cn.ts';

type ProgressBarProps = {
  /** Fracción 0…n. Se recorta visualmente a 1; el tono comunica si se excedió. */
  value: number;
  tone?: 'accent' | 'success' | 'warning' | 'danger';
  label: string;
};

const tones = {
  accent: '[&::-moz-progress-bar]:bg-accent [&::-webkit-progress-value]:bg-accent',
  success: '[&::-moz-progress-bar]:bg-success [&::-webkit-progress-value]:bg-success',
  warning: '[&::-moz-progress-bar]:bg-warning [&::-webkit-progress-value]:bg-warning',
  danger: '[&::-moz-progress-bar]:bg-danger [&::-webkit-progress-value]:bg-danger',
};

export function ProgressBar({ value, tone = 'accent', label }: ProgressBarProps) {
  const percent = Math.round(Math.min(Math.max(value, 0), 1) * 100);
  return (
    <progress
      aria-label={label}
      value={percent}
      max={100}
      className={cn(
        'block h-1.5 w-full appearance-none overflow-hidden rounded-full border-0 bg-surface-2',
        '[&::-webkit-progress-bar]:bg-surface-2',
        '[&::-moz-progress-bar]:rounded-full [&::-webkit-progress-value]:rounded-full',
        '[&::-webkit-progress-value]:transition-[width] [&::-webkit-progress-value]:duration-500',
        tones[tone],
      )}
    />
  );
}
