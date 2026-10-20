import { QueryClient } from '@tanstack/react-query';
import { ApiError } from './api-client.ts';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      // Un 4xx no se arregla reintentando.
      retry: (failureCount, error) =>
        !(error instanceof ApiError && error.isClientError) && failureCount < 2,
    },
    mutations: { retry: false },
  },
});
