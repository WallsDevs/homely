import { Navigate, Outlet, useLocation } from 'react-router';
import { useSession } from '@/features/auth/api/session.ts';
import { Button } from '@/shared/ui/index.ts';

type FromState = { from?: string } | null;

/** Pantalla mientras se recupera la sesión al abrir la app. */
function Splash() {
  return (
    <div className="flex min-h-dvh items-center justify-center" aria-busy>
      <img src="/favicon.svg" alt="Homely" className="size-12 animate-pulse" />
    </div>
  );
}

function SessionError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-body text-fg-2">No pudimos conectar con Homely.</p>
      <Button variant="secondary" onClick={onRetry}>
        Reintentar
      </Button>
    </div>
  );
}

/** Solo sin sesión (login, registro). Con sesión vuelve a donde se quería ir. */
export function RequireGuest() {
  const session = useSession();
  const location = useLocation();
  if (session.isPending) return <Splash />;
  if (session.isError) return <SessionError onRetry={() => void session.refetch()} />;
  if (session.data) {
    const from = (location.state as FromState)?.from;
    return <Navigate to={from ?? '/'} replace />;
  }
  return <Outlet />;
}

/** Con sesión pero sin hogar: onboarding. */
export function RequireNoHousehold() {
  const session = useSession();
  if (session.isPending) return <Splash />;
  if (session.isError) return <SessionError onRetry={() => void session.refetch()} />;
  if (!session.data) return <Navigate to="/login" replace />;
  if (session.data.household) return <Navigate to="/" replace />;
  return <Outlet />;
}

/** El resto de la app: sesión + hogar. */
export function RequireHousehold() {
  const session = useSession();
  const location = useLocation();
  if (session.isPending) return <Splash />;
  if (session.isError) return <SessionError onRetry={() => void session.refetch()} />;
  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }
  if (!session.data.household) return <Navigate to="/onboarding" replace />;
  return <Outlet />;
}

/** Ruta solo para admins; un miembro que entra por URL vuelve al inicio. */
export function RequireAdmin() {
  const session = useSession();
  if (session.data?.membership?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <Outlet />;
}
