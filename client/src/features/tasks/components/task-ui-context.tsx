import { todayIn, type Task } from '@homely/shared';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { useHouseholdSession } from '@/features/auth/api/session.ts';
import { errorMessage } from '@/shared/lib/api-client.ts';
import { useToast } from '@/shared/ui/index.ts';
import { useToggleTask } from '../api/tasks.ts';
import { TaskDetailSheet } from './task-detail-sheet.tsx';
import { TaskFormSheet } from './task-form-sheet.tsx';
import { TaskUIContext, type TaskFormDefaults, type TaskUI } from './task-ui.ts';

type FormState = { open: false } | { open: true; task?: Task; defaults?: TaskFormDefaults };

/** Montado en el layout: cualquier pantalla abre el detalle o el formulario de una tarea. */
export function TaskUIProvider({ children }: { children: ReactNode }) {
  const { membership, household, isAdmin } = useHouseholdSession();
  const toast = useToast();
  const today = todayIn(household.timezone);
  const me = useMemo(
    () => ({ id: membership.id, displayName: membership.displayName, color: membership.color }),
    [membership.id, membership.displayName, membership.color],
  );
  const toggleMutation = useToggleTask(me, today);
  const [detail, setDetail] = useState<Task | null>(null);
  const [form, setForm] = useState<FormState>({ open: false });

  const canResolve = useCallback(
    (task: Task) => isAdmin || task.assignee?.id === membership.id,
    [isAdmin, membership.id],
  );

  const { mutate } = toggleMutation;
  const toggle = useCallback(
    (task: Task) => {
      const done = task.status !== 'DONE';
      const onError = (error: unknown) =>
        toast.show({ message: errorMessage(error), tone: 'danger' });
      mutate(
        { task, done },
        {
          onError,
          onSuccess: () => {
            if (!done) return;
            toast.show({
              message: 'Tarea completada',
              tone: 'success',
              action: {
                label: 'Deshacer',
                onClick: () => mutate({ task, done: false }, { onError }),
              },
            });
          },
        },
      );
    },
    [mutate, toast],
  );

  const value = useMemo<TaskUI>(
    () => ({
      today,
      me,
      isAdmin,
      canResolve,
      toggle,
      openDetail: setDetail,
      openCreate: (defaults) => setForm({ open: true, ...(defaults ? { defaults } : {}) }),
      openEdit: (task) => {
        setDetail(null);
        setForm({ open: true, task });
      },
    }),
    [today, me, isAdmin, canResolve, toggle],
  );

  return (
    <TaskUIContext value={value}>
      {children}
      <TaskDetailSheet task={detail} onClose={() => setDetail(null)} />
      {isAdmin && (
        <TaskFormSheet
          open={form.open}
          task={form.open ? form.task : undefined}
          defaults={form.open ? form.defaults : undefined}
          onClose={() => setForm({ open: false })}
        />
      )}
    </TaskUIContext>
  );
}
