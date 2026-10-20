import type { ReactNode } from 'react';

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  /** Acción primaria. En móvil se oculta: allí la acción vive en el FAB. */
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 md:mb-8">
      <div className="min-w-0">
        <h1 className="text-display">{title}</h1>
        {subtitle && <p className="mt-1 text-small text-fg-2">{subtitle}</p>}
      </div>
      {action && <div className="hidden shrink-0 lg:block">{action}</div>}
    </header>
  );
}
