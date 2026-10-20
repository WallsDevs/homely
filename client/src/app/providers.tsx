import { QueryClientProvider } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';
import { sessionKey } from '@/features/auth/api/session.ts';
import { onSessionExpired } from '@/shared/lib/api-client.ts';
import { queryClient } from '@/shared/lib/query-client.ts';
import { ThemeProvider } from '@/shared/lib/theme.tsx';
import { ToastProvider } from '@/shared/ui/index.ts';

/** Si la sesión caduca durante el uso, se limpia todo y los guards llevan al login. */
function SessionExpiryHandler() {
  useEffect(
    () =>
      onSessionExpired(() => {
        queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== sessionKey[0] });
        queryClient.setQueryData(sessionKey, null);
      }),
    [],
  );
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionExpiryHandler />
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
