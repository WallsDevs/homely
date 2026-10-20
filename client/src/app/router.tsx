import { lazy } from 'react';
import { createBrowserRouter, type RouteObject } from 'react-router';
import { RequireAdmin, RequireGuest, RequireHousehold, RequireNoHousehold } from './guards.tsx';
import { AppLayout } from './layouts/app-layout.tsx';
import { AuthLayout } from './layouts/auth-layout.tsx';
import { NotFound, RouteError } from './route-error.tsx';

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
const ExpensesPage = lazy(() =>
  import('@/features/expenses/pages/expenses-page.tsx').then((m) => ({ default: m.ExpensesPage })),
);
const GoalsPage = lazy(() =>
  import('@/features/expenses/pages/goals-page.tsx').then((m) => ({ default: m.GoalsPage })),
);
const CategoriesPage = lazy(() =>
  import('@/features/expenses/pages/categories-page.tsx').then((m) => ({
    default: m.CategoriesPage,
  })),
);
const ReportsPage = lazy(() =>
  import('@/features/reports/pages/reports-page.tsx').then((m) => ({ default: m.ReportsPage })),
);
const HistoryPage = lazy(() =>
  import('@/features/reports/pages/history-page.tsx').then((m) => ({ default: m.HistoryPage })),
);
const DataPage = lazy(() =>
  import('@/features/settings/pages/data-page.tsx').then((m) => ({ default: m.DataPage })),
);
const MembersPage = lazy(() =>
  import('@/features/members/pages/members-page.tsx').then((m) => ({ default: m.MembersPage })),
);
const SettingsPage = lazy(() =>
  import('@/features/settings/pages/settings-page.tsx').then((m) => ({
    default: m.SettingsPage,
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
  { path: 'expenses', element: <ExpensesPage /> },
  { path: 'expenses/goals', element: <GoalsPage /> },
  {
    element: <RequireAdmin />,
    children: [
      { path: 'expenses/categories', element: <CategoriesPage /> },
      { path: 'settings/data', element: <DataPage /> },
    ],
  },
  { path: 'reports', element: <ReportsPage /> },
  { path: 'reports/history', element: <HistoryPage /> },
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
    errorElement: <RouteError />,
    children: [
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
      { path: '*', element: <NotFound /> },
    ],
  },
]);
