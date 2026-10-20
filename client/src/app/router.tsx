import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RequireGuest, RequireHousehold, RequireNoHousehold } from './guards.tsx';
import { AppLayout } from './layouts/app-layout.tsx';
import { AuthLayout } from './layouts/auth-layout.tsx';

// Code-splitting por ruta: cada página es un chunk que se carga al navegar.
const LoginPage = lazy(() =>
  import('@/features/auth/pages/login-page.tsx').then((m) => ({ default: m.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('@/features/auth/pages/register-page.tsx').then((m) => ({ default: m.RegisterPage })),
);
const OnboardingPage = lazy(() =>
  import('@/features/auth/pages/onboarding-page.tsx').then((m) => ({
    default: m.OnboardingPage,
  })),
);
const DashboardPage = lazy(() =>
  import('@/features/dashboard/pages/dashboard-page.tsx').then((m) => ({
    default: m.DashboardPage,
  })),
);
const TasksPage = lazy(() =>
  import('@/features/tasks/pages/tasks-page.tsx').then((m) => ({ default: m.TasksPage })),
);
const BoardPage = lazy(() =>
  import('@/features/tasks/pages/board-page.tsx').then((m) => ({ default: m.BoardPage })),
);
const PlansPage = lazy(() =>
  import('@/features/plans/pages/plans-page.tsx').then((m) => ({ default: m.PlansPage })),
);
const MembersPage = lazy(() =>
  import('@/features/members/pages/members-page.tsx').then((m) => ({ default: m.MembersPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/settings-page.tsx').then((m) => ({
    default: m.SettingsPage,
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
  { path: 'tasks', element: <TasksPage /> },
  { path: 'tasks/board', element: <BoardPage /> },
  { path: 'plans', element: <PlansPage /> },
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
  { path: 'members', element: <MembersPage /> },
  { path: 'settings', element: <SettingsPage /> },
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
  {
    element: <RequireGuest />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: 'login', element: <LoginPage /> },
          { path: 'register', element: <RegisterPage /> },
        ],
      },
    ],
  },
  {
    element: <RequireNoHousehold />,
    children: [
      {
        element: <AuthLayout />,
        children: [{ path: 'onboarding', element: <OnboardingPage /> }],
      },
    ],
  },
  {
    element: <RequireHousehold />,
    children: [{ path: '/', element: <AppLayout />, children: appRoutes }],
  },
]);
