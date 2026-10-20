import type { ComponentProps, ReactNode } from 'react';
import { cn } from '../lib/cn.ts';

export function Card({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-md border border-line bg-surface p-4 md:p-5', className)}
      {...props}
    />
  );
}

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function CardHeader({ title, subtitle, action }: CardHeaderProps) {
  return (
    <header className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="truncate text-h2">{title}</h2>
        {subtitle && <p className="text-small text-fg-2">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}
