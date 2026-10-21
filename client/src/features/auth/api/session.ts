import {
  authOptionsSchema,
  authResponseSchema,
  sessionSchema,
  type CreateHouseholdInput,
  type JoinHouseholdInput,
  type LoginInput,
  type RegisterInput,
  type Session,
} from '@homely/shared';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ApiError,
  api,
  hasAccessToken,
  refreshAccessToken,
  setAccessToken,
} from '@/shared/lib/api-client.ts';

export const sessionKey = ['session'] as const;

/**
 * Al abrir la app no hay access token en memoria: se intenta recuperar con la cookie de refresh.
 * `null` = no hay sesión (mostrar login).
 */
async function fetchSession(): Promise<Session | null> {
  if (!hasAccessToken() && !(await refreshAccessToken())) return null;
  try {
    return await api('/auth/me', { schema: sessionSchema });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) return null;
    throw error;
  }
}

/** Si el registro de cuentas nuevas está abierto (lo decide el servidor). */
export function useAuthOptions() {
  return useQuery({
    queryKey: ['auth-options'],
    queryFn: ({ signal }) =>
      api('/auth/options', { schema: authOptionsSchema, signal, skipAuthRefresh: true }),
    staleTime: Infinity,
  });
}

export function useSession() {
  return useQuery({
    queryKey: sessionKey,
    queryFn: fetchSession,
    staleTime: Infinity,
    retry: false,
  });
}

/** Sesión garantizada con hogar. Solo en pantallas detrás de `RequireHousehold`. */
export function useHouseholdSession() {
  const { data } = useSession();
  if (!data?.membership || !data.household) {
    throw new Error('useHouseholdSession requiere una sesión con hogar');
  }
  return {
    user: data.user,
    membership: data.membership,
    household: data.household,
    isAdmin: data.membership.role === 'ADMIN',
  };
}

function useSetSession() {
  const queryClient = useQueryClient();
  return (session: Session | null) => queryClient.setQueryData(sessionKey, session);
}

export function useLogin() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: (input: LoginInput) =>
      api('/auth/login', {
        method: 'POST',
        body: input,
        schema: authResponseSchema,
        skipAuthRefresh: true,
      }),
    onSuccess: ({ accessToken, session }) => {
      setAccessToken(accessToken);
      setSession(session);
    },
  });
}

export function useRegister() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: (input: RegisterInput) =>
      api('/auth/register', {
        method: 'POST',
        body: input,
        schema: authResponseSchema,
        skipAuthRefresh: true,
      }),
    onSuccess: ({ accessToken, session }) => {
      setAccessToken(accessToken);
      setSession(session);
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ everywhere }: { everywhere: boolean }) =>
      api<void>(everywhere ? '/auth/logout-all' : '/auth/logout', { method: 'POST' }),
    onSettled: () => {
      setAccessToken(null);
      // Nada de los datos del hogar debe sobrevivir al cierre de sesión.
      queryClient.clear();
      queryClient.setQueryData(sessionKey, null);
    },
  });
}

export function useCreateHousehold() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: (input: CreateHouseholdInput) =>
      api('/households', { method: 'POST', body: input, schema: sessionSchema }),
    onSuccess: setSession,
  });
}

export function useJoinHousehold() {
  const setSession = useSetSession();
  return useMutation({
    mutationFn: (input: JoinHouseholdInput) =>
      api('/households/join', { method: 'POST', body: input, schema: sessionSchema }),
    onSuccess: setSession,
  });
}
