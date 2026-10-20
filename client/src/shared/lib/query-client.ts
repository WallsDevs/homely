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
      // Si una consulta falla y no hay nada que mostrar, la pantalla de error (con «Recargar»)
      // es mejor que un esqueleto de carga eterno. Con datos previos, se siguen mostrando.
      // Un 401 lo gestiona el flujo de sesión, no la pantalla de error.
      throwOnError: (error, query) =>
        query.state.data === undefined && !(error instanceof ApiError && error.status === 401),
    },
    mutations: { retry: false },
  },
});
