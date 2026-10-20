import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { queryClient } from '@/shared/lib/query-client.ts';
import { ThemeProvider } from '@/shared/lib/theme.tsx';
import { ToastProvider } from '@/shared/ui/index.ts';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
