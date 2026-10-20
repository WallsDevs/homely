import { Suspense } from 'react';
import { Outlet } from 'react-router';
import { Skeleton } from '@/shared/ui/index.ts';

/** Pantallas sin sesión u onboarding: una sola columna centrada, sin navegación. */
export function AuthLayout() {
  return (
    <div className="flex min-h-dvh flex-col px-4 pt-[max(2.5rem,env(safe-area-inset-top))] pb-10 md:justify-center md:py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-8 flex items-center gap-2.5">
          <img src="/favicon.svg" alt="" className="size-9" />
          <span className="text-h2">Homely</span>
        </div>
        <Suspense fallback={<Skeleton className="h-80" />}>
          <Outlet />
        </Suspense>
      </div>
    </div>
  );
}
