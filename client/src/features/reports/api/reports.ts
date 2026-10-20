import {
  auditLogSchema,
  historySchema,
  purgePreviewSchema,
  topMissedSchema,
  weeklyReportSchema,
  type IsoDate,
  type PurgeInput,
} from '@homely/shared';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { expenseKeys } from '@/features/expenses/api/expenses.ts';
import { taskKeys } from '@/features/tasks/api/tasks.ts';
import { api } from '@/shared/lib/api-client.ts';

export const reportKeys = {
  all: ['reports'] as const,
  weekly: (week: IsoDate | undefined) => ['reports', 'weekly', week ?? 'current'] as const,
  topMissed: (from: IsoDate, to: IsoDate, memberId?: string) =>
    ['reports', 'top-missed', from, to, memberId ?? 'all'] as const,
  history: (memberId: string, year: number | undefined) =>
    ['reports', 'history', memberId, year ?? 'current'] as const,
  audit: ['reports', 'audit-log'] as const,
};

export function useWeeklyReport(week: IsoDate | undefined) {
  return useQuery({
    queryKey: reportKeys.weekly(week),
    queryFn: ({ signal }) =>
      api('/reports/weekly', { query: { week }, schema: weeklyReportSchema, signal }),
    placeholderData: (previous) => previous,
  });
}

export function useTopMissed(from: IsoDate, to: IsoDate, memberId?: string) {
  return useQuery({
    queryKey: reportKeys.topMissed(from, to, memberId),
    queryFn: ({ signal }) =>
      api('/reports/tasks/top-missed', {
        query: { from, to, memberId },
        schema: topMissedSchema,
        signal,
      }).then((res) => res.items),
    placeholderData: (previous) => previous,
  });
}

export function useHistory(memberId: string, year: number | undefined) {
  return useQuery({
    queryKey: reportKeys.history(memberId, year),
    queryFn: ({ signal }) =>
      api('/reports/tasks/history', { query: { memberId, year }, schema: historySchema, signal }),
    placeholderData: (previous) => previous,
  });
}

export function useAuditLog() {
  return useInfiniteQuery({
    queryKey: reportKeys.audit,
    queryFn: ({ pageParam, signal }) =>
      api('/maintenance/audit-log', {
        query: { cursor: pageParam },
        schema: auditLogSchema,
        signal,
      }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  });
}

export function usePurgePreview() {
  return useMutation({
    mutationFn: (range: { from: IsoDate; to: IsoDate }) =>
      api('/maintenance/purge/preview', {
        method: 'POST',
        body: range,
        schema: purgePreviewSchema,
      }),
  });
}

export function usePurge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: PurgeInput) =>
      api('/maintenance/purge', { method: 'POST', body: input, schema: purgePreviewSchema }),
    // Tras borrar, cualquier vista de tareas, gastos o reportes puede haber cambiado.
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: reportKeys.all }),
        queryClient.invalidateQueries({ queryKey: taskKeys.all }),
        queryClient.invalidateQueries({ queryKey: expenseKeys.all }),
        queryClient.invalidateQueries({ queryKey: expenseKeys.goals }),
      ]),
  });
}
