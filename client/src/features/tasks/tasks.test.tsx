import { todayIn, type MyTasks, type Session, type Task } from '@homely/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionKey } from '@/features/auth/api/session.ts';
import { ToastProvider } from '@/shared/ui/index.ts';
import { taskKeys, useMyTasks } from './api/tasks.ts';
import { TaskItem } from './components/task-item.tsx';
import { TaskUIProvider } from './components/task-ui-context.tsx';

const TZ = 'America/Bogota';
const today = todayIn(TZ);
const iveth = { id: 'm-iveth', displayName: 'Iveth', color: '#E07A5F' };
const luis = { id: 'm-luis', displayName: 'Luis', color: '#5B8DEF' };

function session(role: 'ADMIN' | 'MEMBER', me = luis): Session {
  return {
    user: { id: 'u1', email: 'x@test.dev', name: me.displayName },
    household: { id: 'h1', name: 'Casa', currency: 'USD', timezone: TZ, weekStartsOn: 'MON' },
    membership: { ...me, userId: 'u1', avatarUrl: null, role, isActive: true, joinedAt: '' },
  };
}

function task(overrides: Partial<Task>): Task {
  return {
    id: 't1',
    title: 'Sacar la basura',
    description: null,
    priority: 'MEDIUM',
    status: 'PENDING',
    origin: 'PLAN',
    planId: 'p1',
    dueDate: today,
    assignee: luis,
    completedBy: null,
    completedAt: null,
    isOverdue: false,
    createdAt: '2026-10-19T00:00:00.000Z',
    ...overrides,
  };
}

function MyToday() {
  const mine = useMyTasks();
  return (
    <ul>
      {mine.data?.today.map((t) => (
        <TaskItem key={t.id} task={t} />
      ))}
    </ul>
  );
}

function setup(role: 'ADMIN' | 'MEMBER', tasks: Task[]) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  queryClient.setQueryData(sessionKey, session(role));
  const mine: MyTasks = {
    date: today,
    weekStart: today,
    weekEnd: today,
    overdue: [],
    today: tasks,
    upcoming: [],
  };
  queryClient.setQueryData(taskKeys.mine, mine);
  render(
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <TaskUIProvider>
          <MyToday />
        </TaskUIProvider>
      </ToastProvider>
    </QueryClientProvider>,
  );
  return queryClient;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TaskItem', () => {
  it('un miembro solo puede marcar sus propias tareas', () => {
    setup('MEMBER', [
      task({ id: 'mine', title: 'Mía' }),
      task({ id: 'other', title: 'De Iveth', assignee: iveth }),
    ]);

    expect(screen.getByRole('checkbox', { name: 'Completar «Mía»' })).toBeEnabled();
    expect(screen.getByRole('checkbox', { name: 'Completar «De Iveth»' })).toBeDisabled();
  });

  it('un admin puede marcar cualquier tarea', () => {
    setup('ADMIN', [task({ title: 'De Iveth', assignee: iveth })]);
    expect(screen.getByRole('checkbox', { name: 'Completar «De Iveth»' })).toBeEnabled();
  });

  it('indica las vencidas', () => {
    setup('MEMBER', [task({ isOverdue: true, dueDate: '2026-01-01' })]);
    expect(screen.getByText(/^Vencida/)).toBeInTheDocument();
  });
});

describe('completar tarea (TK-10)', () => {
  it('se marca al instante, antes de que responda el servidor', async () => {
    let resolveRequest: (response: Response) => void = () => undefined;
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(
        () =>
          new Promise<Response>((resolve) => {
            resolveRequest = resolve;
          }),
      ),
    );
    setup('MEMBER', [task({})]);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Completar «Sacar la basura»' }));

    // Sin respuesta aún, la UI ya refleja el cambio.
    expect(
      screen.getByRole('checkbox', { name: 'Marcar «Sacar la basura» como pendiente' }),
    ).toBeChecked();
    resolveRequest(new Response(JSON.stringify({}), { status: 500 }));
  });

  it('si el servidor falla, revierte y avisa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({ error: { code: 'FORBIDDEN', message: 'No tienes permiso' } }),
            { status: 403 },
          ),
        ),
      ),
    );
    setup('MEMBER', [task({})]);

    await userEvent.click(screen.getByRole('checkbox', { name: 'Completar «Sacar la basura»' }));

    await waitFor(() =>
      expect(
        screen.getByRole('checkbox', { name: 'Completar «Sacar la basura»' }),
      ).not.toBeChecked(),
    );
    expect(await screen.findByText('No tienes permiso')).toBeInTheDocument();
  });
});
