import type { Session } from '@homely/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RequireAdmin, RequireHousehold } from '@/app/guards.tsx';
import { sessionKey } from './api/session.ts';
import { LoginPage } from './pages/login-page.tsx';

const user = { id: 'u1', email: 'iveth@test.dev', name: 'Iveth' };
const household = {
  id: 'h1',
  name: 'Casa',
  currency: 'USD',
  timezone: 'America/Bogota',
  weekStartsOn: 'MON' as const,
};
const membership = (role: 'ADMIN' | 'MEMBER') => ({
  id: 'm1',
  userId: 'u1',
  displayName: 'Iveth',
  color: '#E07A5F',
  avatarUrl: null,
  role,
  isActive: true,
  joinedAt: '2026-10-19T00:00:00.000Z',
});

function renderWithSession(session: Session | null, initialPath: string, routes: ReactNode) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(sessionKey, session);
  const router = createMemoryRouter(
    [
      {
        element: <RequireHousehold />,
        children: [
          { path: '/', element: <p>Inicio</p> },
          { element: <RequireAdmin />, children: [{ path: '/admin', element: <p>Zona admin</p> }] },
        ],
      },
      { path: '/login', element: routes },
      { path: '/onboarding', element: <p>Onboarding</p> },
    ],
    { initialEntries: [initialPath] },
  );
  return render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('guards de rutas', () => {
  it('sin sesión lleva al login', () => {
    renderWithSession(null, '/', <p>Login</p>);
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('con sesión pero sin hogar lleva al onboarding', () => {
    renderWithSession({ user, membership: null, household: null }, '/', <p>Login</p>);
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
  });

  it('con hogar muestra la app', () => {
    renderWithSession({ user, membership: membership('MEMBER'), household }, '/', null);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
  });

  it('un MEMBER que entra a una ruta de admin vuelve al inicio', () => {
    renderWithSession({ user, membership: membership('MEMBER'), household }, '/admin', null);
    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.queryByText('Zona admin')).not.toBeInTheDocument();
  });

  it('un ADMIN entra a la ruta de admin', () => {
    renderWithSession({ user, membership: membership('ADMIN'), household }, '/admin', null);
    expect(screen.getByText('Zona admin')).toBeInTheDocument();
  });
});

describe('LoginPage', () => {
  it('oculta «Crear cuenta» si el registro está cerrado', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response(JSON.stringify({ registrationOpen: false }))),
      ),
    );
    renderWithSession(null, '/login', <LoginPage />);
    await screen.findByRole('button', { name: 'Iniciar sesión' });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(screen.queryByRole('link', { name: 'Crear cuenta' })).not.toBeInTheDocument();
  });

  it('muestra «Crear cuenta» si el registro está abierto', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() =>
        Promise.resolve(new Response(JSON.stringify({ registrationOpen: true }))),
      ),
    );
    renderWithSession(null, '/login', <LoginPage />);
    expect(await screen.findByRole('link', { name: 'Crear cuenta' })).toBeInTheDocument();
  });

  it('valida en el cliente antes de llamar al servidor', async () => {
    const fetchMock = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ registrationOpen: false }))),
    );
    vi.stubGlobal('fetch', fetchMock);
    renderWithSession(null, '/login', <LoginPage />);

    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByText('Escribe un correo válido')).toBeInTheDocument();
    expect(screen.getByText('Escribe tu contraseña')).toBeInTheDocument();
    // Solo se consultan las opciones públicas; el login nunca llega al servidor.
    const urls = fetchMock.mock.calls.map(([input]) => String(input));
    expect(urls.some((url) => url.includes('/auth/login'))).toBe(false);
  });

  it('muestra el error del servidor con credenciales incorrectas', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>(() =>
        Promise.resolve(
          new Response(
            JSON.stringify({
              error: { code: 'INVALID_CREDENTIALS', message: 'Correo o contraseña incorrectos' },
            }),
            { status: 401 },
          ),
        ),
      ),
    );
    renderWithSession(null, '/login', <LoginPage />);

    await userEvent.type(screen.getByLabelText('Correo'), 'iveth@test.dev');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'incorrecta');
    await userEvent.click(screen.getByRole('button', { name: 'Iniciar sesión' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Correo o contraseña incorrectos');
  });
});
