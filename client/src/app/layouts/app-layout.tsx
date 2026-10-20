import { Suspense, useState } from 'react';
import { Outlet } from 'react-router';
import { TaskUIProvider } from '@/features/tasks/components/task-ui-context.tsx';
import { PageSkeleton } from '@/shared/ui/index.ts';
import { BottomNav } from './bottom-nav.tsx';
import { Fab, QuickActions } from './quick-actions.tsx';
import { Sidebar } from './sidebar.tsx';

export function AppLayout() {
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const openQuickActions = () => setQuickActionsOpen(true);

  return (
    <TaskUIProvider>
      <div className="min-h-dvh md:flex">
        <Sidebar onQuickAction={openQuickActions} />

        <main className="min-w-0 flex-1 pb-[calc(6rem+env(safe-area-inset-bottom))] md:pb-12">
          <div className="mx-auto w-full max-w-[1120px] px-4 pt-6 md:px-6 md:pt-8 lg:px-8 lg:pt-10">
            <Suspense fallback={<PageSkeleton />}>
              <Outlet />
            </Suspense>
          </div>
        </main>

        <BottomNav />
        <Fab onClick={openQuickActions} />
        <QuickActions open={quickActionsOpen} onClose={() => setQuickActionsOpen(false)} />
      </div>
    </TaskUIProvider>
  );
}
