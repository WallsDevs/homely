import {
  categoriesResponseSchema,
  categorySchema,
  expenseSchema,
  expensesPageSchema,
  expenseSummarySchema,
  goalSchema,
  goalsResponseSchema,
  type CreateCategoryInput,
  type CreateExpenseInput,
  type CreateGoalInput,
  type GoalPeriod,
  type IsoDate,
  type ListExpensesQuery,
  type UpdateCategoryInput,
  type UpdateExpenseInput,
  type UpdateGoalInput,
} from '@homely/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client.ts';

export type ExpenseFilters = Omit<ListExpensesQuery, 'cursor' | 'limit'>;

export const expenseKeys = {
  all: ['expenses'] as const,
  list: (filters: ExpenseFilters) => ['expenses', 'list', filters] as const,
  summary: (period: GoalPeriod, date: IsoDate | undefined) =>
    ['expenses', 'summary', period, date ?? 'current'] as const,
  categories: (includeArchived: boolean) => ['categories', { includeArchived }] as const,
  categoriesAll: ['categories'] as const,
  goals: ['goals'] as const,
};

const PAGE_SIZE = 40;

export function useExpenses(filters: ExpenseFilters) {
  return useInfiniteQuery({
    queryKey: expenseKeys.list(filters),
    queryFn: ({ pageParam, signal }) =>
      api('/expenses', {
        query: { ...filters, limit: PAGE_SIZE, cursor: pageParam },
        schema: expensesPageSchema,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    placeholderData: (previous) => previous,
  });
}

export function useExpenseSummary(period: GoalPeriod = 'MONTHLY', date?: IsoDate) {
  return useQuery({
    queryKey: expenseKeys.summary(period, date),
    queryFn: ({ signal }) =>
      api('/expenses/summary', { query: { period, date }, schema: expenseSummarySchema, signal }),
  });
}

export function useCategories(includeArchived = false) {
  return useQuery({
    queryKey: expenseKeys.categories(includeArchived),
    queryFn: ({ signal }) =>
      api('/categories', {
        query: { includeArchived: includeArchived || undefined },
        schema: categoriesResponseSchema,
        signal,
      }).then((res) => res.items),
    staleTime: 5 * 60_000,
  });
}

export function useGoals() {
  return useQuery({
    queryKey: expenseKeys.goals,
    queryFn: ({ signal }) =>
      api('/goals', { schema: goalsResponseSchema, signal }).then((res) => res.items),
  });
}

/** Un gasto cambia listados, resúmenes y el progreso de las metas. */
function useInvalidateSpending() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
      queryClient.invalidateQueries({ queryKey: expenseKeys.goals }),
    ]);
}

export function useCreateExpense() {
  const invalidate = useInvalidateSpending();
  return useMutation({
    mutationFn: (input: CreateExpenseInput) =>
      api('/expenses', { method: 'POST', body: input, schema: expenseSchema }),
    onSuccess: invalidate,
  });
}

export function useUpdateExpense() {
  const invalidate = useInvalidateSpending();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateExpenseInput }) =>
      api(`/expenses/${id}`, { method: 'PATCH', body: input, schema: expenseSchema }),
    onSuccess: invalidate,
  });
}

export function useDeleteExpense() {
  const invalidate = useInvalidateSpending();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/expenses/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}

// ───────── Categorías ─────────

function useInvalidateCategories() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: expenseKeys.categoriesAll }),
      // El nombre, color o icono de una categoría aparece en gastos y metas.
      queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
      queryClient.invalidateQueries({ queryKey: expenseKeys.goals }),
    ]);
}

export function useCreateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      api('/categories', { method: 'POST', body: input, schema: categorySchema }),
    onSuccess: invalidate,
  });
}

export function useUpdateCategory() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateCategoryInput }) =>
      api(`/categories/${id}`, { method: 'PATCH', body: input, schema: categorySchema }),
    onSuccess: invalidate,
  });
}

export function useReorderCategories() {
  const invalidate = useInvalidateCategories();
  return useMutation({
    mutationFn: (ids: string[]) =>
      api('/categories/order', {
        method: 'PUT',
        body: { ids },
        schema: categoriesResponseSchema,
      }),
    onSuccess: invalidate,
  });
}

// ───────── Metas ─────────

function useInvalidateGoals() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: expenseKeys.goals }),
      queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
    ]);
}

export function useCreateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (input: CreateGoalInput) =>
      api('/goals', { method: 'POST', body: input, schema: goalSchema }),
    onSuccess: invalidate,
  });
}

export function useUpdateGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateGoalInput }) =>
      api(`/goals/${id}`, { method: 'PATCH', body: input, schema: goalSchema }),
    onSuccess: invalidate,
  });
}

export function useDeleteGoal() {
  const invalidate = useInvalidateGoals();
  return useMutation({
    mutationFn: (id: string) => api<void>(`/goals/${id}`, { method: 'DELETE' }),
    onSuccess: invalidate,
  });
}
