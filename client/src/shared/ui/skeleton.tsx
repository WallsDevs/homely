import { cn } from '../lib/cn.ts';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-md bg-surface-2', className)} />;
}

/** Esqueleto genérico de página mientras se carga una ruta perezosa. */
export function PageSkeleton() {
  return (
    <output aria-label="Cargando" className="flex flex-col gap-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-64" />
    </output>
  );
}
