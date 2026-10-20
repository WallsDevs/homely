import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import { createContext, use, useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { cn } from '../lib/cn.ts';

type ToastTone = 'neutral' | 'success' | 'danger';

type ToastInput = {
  message: string;
  tone?: ToastTone;
  action?: { label: string; onClick: () => void };
};

type ToastItem = ToastInput & { id: number };

type ToastContextValue = { show: (toast: ToastInput) => void };

const ToastContext = createContext<ToastContextValue | null>(null);
const DURATION_MS = 4000;
const MAX_VISIBLE = 3;

const icons: Record<ToastTone, ReactNode> = {
  neutral: <Info className="size-4 text-fg-3" aria-hidden />,
  success: <CircleCheck className="size-4 text-success" aria-hidden />,
  danger: <CircleAlert className="size-4 text-danger" aria-hidden />,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const show = useCallback(
    (toast: ToastInput) => {
      const id = nextId.current++;
      setToasts((current) => [...current, { ...toast, id }].slice(-MAX_VISIBLE));
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext value={value}>
      {children}
      <div
        aria-live="polite"
        className={cn(
          'pointer-events-none fixed inset-x-4 z-50 flex flex-col items-center gap-2',
          // Por encima de la barra inferior en móvil; abajo a la derecha en escritorio.
          'bottom-[calc(5rem+env(safe-area-inset-bottom))] md:inset-x-auto md:right-6 md:bottom-6 md:items-end',
        )}
      >
        {toasts.map((toast) => (
          <output
            key={toast.id}
            className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-center gap-3 rounded-md border border-line bg-surface px-4 py-3 shadow-float"
          >
            {icons[toast.tone ?? 'neutral']}
            <p className="flex-1 text-small">{toast.message}</p>
            {toast.action && (
              <button
                type="button"
                className="text-small font-medium text-accent"
                onClick={() => {
                  toast.action?.onClick();
                  dismiss(toast.id);
                }}
              >
                {toast.action.label}
              </button>
            )}
          </output>
        ))}
      </div>
    </ToastContext>
  );
}

export function useToast(): ToastContextValue {
  const context = use(ToastContext);
  if (!context) throw new Error('useToast debe usarse dentro de <ToastProvider>');
  return context;
}
