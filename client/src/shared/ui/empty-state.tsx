import type { ReactNode } from 'react';

type EmptyStateProps = {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-80 flex-col items-center gap-3 py-12 text-center">
      <span className="text-fg-3 [&>svg]:size-8">{icon}</span>
      <h2 className="text-h2">{title}</h2>
      <p className="text-small text-fg-2">{description}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
