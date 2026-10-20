import { CircleAlert, Compass } from 'lucide-react';
import type { ReactNode } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { Button } from '@/shared/ui/index.ts';

function Screen({
  icon,
  title,
  description,
  children,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <span className="text-fg-3 [&>svg]:size-10">{icon}</span>
      <h1 className="text-h1">{title}</h1>
      <p className="max-w-sm text-body text-fg-2">{description}</p>
      <div className="mt-2 flex gap-2">{children}</div>
    </main>
  );
}

/**
 * Último recurso si una pantalla falla al cargar o renderizar (p. ej. un chunk que ya no existe
 * tras desplegar una versión nueva). Nunca muestra detalles técnicos.
 */
export function RouteError() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFound />;

  return (
    <Screen
      icon={<CircleAlert />}
      title="Algo salió mal"
      description="No pudimos mostrar esta pantalla. Recargar suele resolverlo; si no, vuelve al inicio."
    >
      <Button onClick={() => window.location.reload()}>Recargar</Button>
      <Button variant="secondary" onClick={() => window.location.assign('/')}>
        Ir al inicio
      </Button>
    </Screen>
  );
}

export function NotFound() {
  return (
    <Screen
      icon={<Compass />}
      title="Esta página no existe"
      description="Puede que el enlace esté mal escrito o que la página se haya movido."
    >
      <Link
        to="/"
        className="inline-flex h-10 items-center rounded-md bg-accent px-4 font-medium text-accent-fg"
      >
        Ir al inicio
      </Link>
    </Screen>
  );
}
