import { healthResponseSchema } from '@homely/shared';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client.ts';

export const healthKeys = { all: ['health'] as const };

export function useHealth() {
  return useQuery({
    queryKey: healthKeys.all,
    queryFn: ({ signal }) => api('/health', { schema: healthResponseSchema, signal }),
    staleTime: 60_000,
    retry: false,
  });
}
