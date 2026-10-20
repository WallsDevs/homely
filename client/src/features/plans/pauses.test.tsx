import type { Pause } from '@homely/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it } from 'vitest';
import { TaskUIContext, type TaskUI } from '@/features/tasks/components/task-ui.ts';
import { activePauseFor, pauseKeys } from './api/pauses.ts';
import { ActivePauseBanner } from './components/pause-banner.tsx';

const today = '2026-12-22';
const luis = { id: 'm-luis', displayName: 'Luis', color: '#5B8DEF' };

const pause = (overrides: Partial<Pause>): Pause => ({
  id: 'p1',
  scope: 'HOUSEHOLD',
  member: null,
  plan: null,
  startsOn: '2026-12-20',
  endsOn: '2026-12-28',
  reason: null,
  status: 'ACTIVE',
  createdAt: '',
  ...overrides,
});

const taskUI: TaskUI = {
  today,
  me: luis,
  isAdmin: true,
  canResolve: () => true,
  toggle: () => undefined,
  openDetail: () => undefined,
  openCreate: () => undefined,
  openEdit: () => undefined,
};

function renderBanner(pauses: Pause[]) {
  const queryClient = new QueryClient();
  queryClient.setQueryData(pauseKeys.all, pauses);
  const router = createMemoryRouter([{ path: '/', element: <ActivePauseBanner /> }]);
  return render(
    <QueryClientProvider client={queryClient}>
      <TaskUIContext value={taskUI}>
        <RouterProvider router={router} />
      </TaskUIContext>
    </QueryClientProvider>,
  );
}

describe('ActivePauseBanner (PL-12)', () => {
  it('describe la pausa en curso según su alcance', () => {
    renderBanner([
      pause({ reason: 'Vacaciones' }),
      pause({ id: 'p2', scope: 'MEMBER', member: luis, endsOn: '2026-12-24' }),
      pause({ id: 'p3', scope: 'PLAN', plan: { id: 'x', title: 'Sacar la basura' } }),
    ]);
    expect(screen.getByText(/Planes en pausa hasta lun 28/)).toBeInTheDocument();
    expect(screen.getByText(/· Vacaciones/)).toBeInTheDocument();
    expect(screen.getByText(/Los planes de Luis están en pausa hasta jue 24/)).toBeInTheDocument();
    expect(screen.getByText(/«Sacar la basura» en pausa hasta/)).toBeInTheDocument();
  });

  it('no muestra nada sin pausas en curso', () => {
    renderBanner([pause({ status: 'UPCOMING', startsOn: '2027-01-10', endsOn: '2027-01-12' })]);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});

describe('activePauseFor', () => {
  const trash = { id: 'trash', assignee: luis };
  const dishes = { id: 'dishes', assignee: { id: 'm-iveth' } };

  it('respeta el alcance y prefiere la pausa que termina más tarde', () => {
    const member = pause({ id: 'member', scope: 'MEMBER', member: luis, endsOn: '2026-12-30' });
    const household = pause({ id: 'household' });
    expect(activePauseFor([household, member], trash)?.id).toBe('member');
    expect(activePauseFor([member], dishes)).toBeUndefined();
    expect(
      activePauseFor([pause({ scope: 'PLAN', plan: { id: 'trash', title: '' } })], dishes),
    ).toBeUndefined();
    expect(activePauseFor([pause({ status: 'UPCOMING' })], trash)).toBeUndefined();
  });
});
