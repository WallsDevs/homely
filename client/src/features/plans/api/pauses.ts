import {
  pauseSchema,
  pausesResponseSchema,
  type CreatePauseInput,
  type Pause,
  type Plan,
  type UpdatePauseInput,
} from '@homely/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { reportKeys } from '@/features/reports/api/reports.ts';
import { taskKeys } from '@/features/tasks/api/tasks.ts';
import { api } from '@/shared/lib/api-client.ts';
import { planKeys } from './plans.ts';

export const pauseKeys = { all: ['plan-pauses'] as const };

export function usePauses({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: pauseKeys.all,
    enabled,
    queryFn: ({ signal }) =>
      api('/plan-pauses', { schema: pausesResponseSchema, signal }).then((res) => res.items),
  });
}

/** Una pausa cambia qué tareas existen: se refrescan pausas, planes, tareas y reportes. */
function useInvalidateAfterPause() {
  const queryClient = useQueryClient();
  return () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: pauseKeys.all }),
      queryClient.invalidateQueries({ queryKey: planKeys.all }),
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
      queryClient.invalidateQueries({ queryKey: reportKeys.all }),
    ]);
  };
}

export function useCreatePause() {
  const invalidate = useInvalidateAfterPause();
  return useMutation({
    mutationFn: (input: CreatePauseInput) =>
      api('/plan-pauses', { method: 'POST', body: input, schema: pauseSchema }),
    onSuccess: invalidate,
  });
}

export function useUpdatePause() {
  const invalidate = useInvalidateAfterPause();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePauseInput }) =>
      api(`/plan-pauses/${id}`, { method: 'PATCH', body: input, schema: pauseSchema }),
    onSuccess: invalidate,
  });
}

export function useDeletePause() {
  const invalidate = useInvalidateAfterPause();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/plan-pauses/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

/** La pausa activa hoy que afecta a un plan (la que termina más tarde), si hay alguna. */
export function activePauseFor(
  pauses: readonly Pause[] | undefined,
  plan: Pick<Plan, 'id'> & { assignee: { id: string } | null },
): Pause | undefined {
  return pauses
    ?.filter(
      (pause) =>
        pause.status === 'ACTIVE' &&
        (pause.scope === 'HOUSEHOLD' ||
          (pause.scope === 'MEMBER' && pause.member?.id === plan.assignee?.id) ||
          (pause.scope === 'PLAN' && pause.plan?.id === plan.id)),
    )
    .sort((a, b) => b.endsOn.localeCompare(a.endsOn))[0];
}

/** Texto corto del alcance: «Todo el hogar», «Luis», «Sacar la basura». */
export function pauseScopeLabel(pause: Pause): string {
  if (pause.scope === 'MEMBER') return pause.member?.displayName ?? 'Una persona';
  if (pause.scope === 'PLAN') return pause.plan?.title ?? 'Un plan';
  return 'Todo el hogar';
}
