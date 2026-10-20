import {
  boardSchema,
  myTasksSchema,
  taskSchema,
  tasksPageSchema,
  type Board,
  type CreateTaskInput,
  type IsoDate,
  type ListTasksQuery,
  type MyTasks,
  type Task,
  type TaskMember,
  type TasksPage,
  type UpdateTaskInput,
} from '@homely/shared';
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
  type InfiniteData,
  type QueryClient,
  type QueryKey,
} from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client.ts';

export type TaskFilters = Omit<ListTasksQuery, 'cursor' | 'limit'>;

export const taskKeys = {
  all: ['tasks'] as const,
  mine: ['tasks', 'mine'] as const,
  board: (week: IsoDate | undefined) => ['tasks', 'board', week ?? 'current'] as const,
  list: (filters: TaskFilters) => ['tasks', 'list', filters] as const,
};

export function useMyTasks() {
  return useQuery({
    queryKey: taskKeys.mine,
    queryFn: ({ signal }) => api('/tasks/mine', { schema: myTasksSchema, signal }),
  });
}

export function useBoard(week: IsoDate | undefined) {
  return useQuery({
    queryKey: taskKeys.board(week),
    queryFn: ({ signal }) => api('/tasks/board', { query: { week }, schema: boardSchema, signal }),
    // Al cambiar de semana se mantiene la anterior a la vista hasta que llega la nueva.
    placeholderData: (previous) => previous,
  });
}

const PAGE_SIZE = 30;

export function useTaskList(filters: TaskFilters) {
  return useInfiniteQuery({
    queryKey: taskKeys.list(filters),
    queryFn: ({ pageParam, signal }) =>
      api('/tasks', {
        query: { ...filters, limit: PAGE_SIZE, cursor: pageParam },
        schema: tasksPageSchema,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

// ───────── Caché: una tarea aparece en varias vistas (mis tareas, tablero, listados) ─────────

type TaskCache = MyTasks | Board | InfiniteData<TasksPage>;

function mapTasks(data: TaskCache, fn: (task: Task) => Task): TaskCache {
  if ('columns' in data) {
    return {
      ...data,
      columns: data.columns.map((column) => {
        const tasks = column.tasks.map(fn);
        return {
          ...column,
          tasks,
          total: tasks.filter((t) => t.status !== 'SKIPPED').length,
          done: tasks.filter((t) => t.status === 'DONE').length,
        };
      }),
    };
  }
  if ('overdue' in data) {
    return {
      ...data,
      overdue: data.overdue.map(fn),
      today: data.today.map(fn),
      upcoming: data.upcoming.map(fn),
    };
  }
  return { ...data, pages: data.pages.map((page) => ({ ...page, items: page.items.map(fn) })) };
}

function patchTask(queryClient: QueryClient, id: string, patch: (task: Task) => Task) {
  queryClient.setQueriesData<TaskCache>({ queryKey: taskKeys.all }, (data) =>
    data ? mapTasks(data, (task) => (task.id === id ? patch(task) : task)) : data,
  );
}

type Snapshot = [QueryKey, TaskCache | undefined][];

function snapshot(queryClient: QueryClient): Snapshot {
  return queryClient.getQueriesData<TaskCache>({ queryKey: taskKeys.all });
}

function restore(queryClient: QueryClient, saved: Snapshot | undefined) {
  for (const [key, data] of saved ?? []) queryClient.setQueryData(key, data);
}

// ───────── Mutaciones ─────────

/**
 * TK-03 / TK-10: completar o deshacer, optimista. `me` es quien aparece como "completada por";
 * `today` (día del hogar) decide si al deshacer queda vencida.
 */
export function useToggleTask(me: TaskMember, today: IsoDate) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ task, done }: { task: Task; done: boolean }) =>
      api(`/tasks/${task.id}/${done ? 'complete' : 'uncomplete'}`, {
        method: 'POST',
        schema: taskSchema,
      }),
    onMutate: async ({ task, done }) => {
      await queryClient.cancelQueries({ queryKey: taskKeys.all });
      const saved = snapshot(queryClient);
      patchTask(queryClient, task.id, (current) => ({
        ...current,
        status: done ? 'DONE' : 'PENDING',
        completedBy: done ? me : null,
        completedAt: done ? new Date().toISOString() : null,
        isOverdue: !done && current.dueDate < today,
      }));
      return { saved };
    },
    onError: (_error, _vars, context) => restore(queryClient, context?.saved),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useSkipTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/tasks/${id}/skip`, { method: 'POST', schema: taskSchema }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTaskInput) =>
      api('/tasks', { method: 'POST', body: input, schema: taskSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      api(`/tasks/${id}`, { method: 'PATCH', body: input, schema: taskSchema }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/tasks/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: taskKeys.all }),
  });
}
