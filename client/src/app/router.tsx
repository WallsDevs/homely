import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { AppLayout } from './layouts/app-layout.tsx';

// Code-splitting por ruta: cada página es un chunk que se carga al navegar.
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard-page.tsx').then((m) => ({
    default: m.DashboardPage,
  })),
);
const ComingSoonPage = lazy(() =>
  import('@/features/placeholder/pages/coming-soon-page.tsx').then((m) => ({
    default: m.ComingSoonPage,
  })),
);
const MorePage = lazy(() =>
  import('@/features/placeholder/pages/more-page.tsx').then((m) => ({ default: m.MorePage })),
);
const appRoutes: RouteObject[] = [
  { index: true, element: <DashboardPage /> },
  {
    path: 'tasks',
    element: (
      <ComingSoonPage
        title="Tareas"
        phase={2}
        description="Tus tareas de hoy y de la semana, y el tablero del hogar por miembro."
      />
    ),
  },
  {
    path: 'plans',
    element: (
      <ComingSoonPage
        title="Planes"
        phase={3}
        description="Tareas que se asignan solas cada semana, como sacar la basura miércoles y sábado."
      />
    ),
  },
  {
    path: 'expenses',
    element: (
      <ComingSoonPage
        title="Gastos"
        phase={4}
        description="Registra gastos en segundos, por categoría, con metas opcionales."
      />
    ),
  },
  {
    path: 'reports',
    element: (
      <ComingSoonPage
        title="Reportes"
        phase={5}
        description="Cumplimiento semanal por miembro, historial del año y gastos frente a metas."
      />
    ),
  },
  {
    path: 'members',
    element: (
      <ComingSoonPage
        title="Miembros"
        phase={1}
        description="Invita a tu hogar con un código y gestiona roles."
      />
    ),
  },
  {
    path: 'settings',
    element: (
      <ComingSoonPage
        title="Ajustes"
        phase={1}
        description="Datos del hogar, perfil y limpieza de datos."
      />
    ),
  },
  { path: 'more', element: <MorePage /> },
];

// La galería del sistema de diseño solo existe en desarrollo; el import queda fuera del build.
if (import.meta.env.DEV) {
  const DevUiPage = lazy(() =>
    import('@/features/dev/pages/dev-ui-page.tsx').then((m) => ({ default: m.DevUiPage })),
  );
  appRoutes.push({ path: 'dev/ui', element: <DevUiPage /> });
}

export const router = createBrowserRouter([
  { path: '/', element: <AppLayout />, children: appRoutes },
]);
