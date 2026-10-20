import {
  planSchema,
  plansResponseSchema,
  type CreatePlanInput,
  type UpdatePlanInput,
} from '@homely/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { taskKeys } from '@/features/tasks/api/tasks.ts';
import { api } from '@/shared/lib/api-client.ts';

export const planKeys = { all: ['plans'] as const };

export function usePlans({ enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: planKeys.all,
    enabled,
    queryFn: ({ signal }) =>
      api('/plans', { schema: plansResponseSchema, signal }).then((res) => res.items),
  });
}

/** Cambiar un plan genera o borra tareas: se refrescan planes y todas las vistas de tareas. */
function useInvalidatePlansAndTasks() {
  const queryClient = useQueryClient();
  // Sin esperar: el formulario se cierra al confirmar el server y las vistas se refrescan detrás.
  return () => {
    void Promise.all([
      queryClient.invalidateQueries({ queryKey: planKeys.all }),
      queryClient.invalidateQueries({ queryKey: taskKeys.all }),
    ]);
  };
}

export function useCreatePlan() {
  const invalidate = useInvalidatePlansAndTasks();
  return useMutation({
    mutationFn: (input: CreatePlanInput) =>
      api('/plans', { method: 'POST', body: input, schema: planSchema }),
    onSuccess: invalidate,
  });
}

export function useUpdatePlan() {
  const invalidate = useInvalidatePlansAndTasks();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdatePlanInput }) =>
      api(`/plans/${id}`, { method: 'PATCH', body: input, schema: planSchema }),
    onSuccess: invalidate,
  });
}

export function useSetPlanActive() {
  const invalidate = useInvalidatePlansAndTasks();
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api(`/plans/${id}/status`, { method: 'PATCH', body: { isActive }, schema: planSchema }),
    onSuccess: invalidate,
  });
}

export function useDeletePlan() {
  const invalidate = useInvalidatePlansAndTasks();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/plans/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
