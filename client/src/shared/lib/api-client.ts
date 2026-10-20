import { refreshResponseSchema, type ApiErrorBody, type ErrorCode } from '@homely/shared';
import type { z } from 'zod';

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api/v1';

export class ApiError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly details: Record<string, string[]> | undefined;
  readonly requestId: string | undefined;

  constructor(status: number, body: ApiErrorBody['error']) {
    super(body.message);
    this.name = 'ApiError';
    this.status = status;
    this.code = body.code;
    this.details = body.details;
    this.requestId = body.requestId;
  }

  get isClientError(): boolean {
    return this.status >= 400 && this.status < 500;
  }
}

// ───────── Sesión ─────────
// El access token vive solo en memoria (nunca en localStorage): un XSS no puede robarlo
// de forma persistente. El refresh token va en una cookie httpOnly que JS no puede leer.

let accessToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;
const sessionExpiredListeners = new Set<() => void>();

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

export function hasAccessToken(): boolean {
  return accessToken !== null;
}

export function onSessionExpired(listener: () => void): () => void {
  sessionExpiredListeners.add(listener);
  return () => sessionExpiredListeners.delete(listener);
}

/**
 * Pide un access token nuevo con la cookie de refresh. Las llamadas concurrentes comparten la
 * misma petición: el server rota el refresh token en cada uso y trataría un segundo uso del
 * mismo token como robo, cerrando todas las sesiones.
 */
export function refreshAccessToken(): Promise<boolean> {
  refreshInFlight ??= fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { Accept: 'application/json' },
  })
    .then(async (response) => {
      if (!response.ok) return false;
      accessToken = refreshResponseSchema.parse(await response.json()).accessToken;
      return true;
    })
    .catch(() => false)
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

// ───────── Peticiones ─────────

type RequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Si se pasa, la respuesta se valida contra el contrato de `@homely/shared`. */
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
  /** Login y registro no deben intentar refrescar ante un 401: el 401 es la respuesta. */
  skipAuthRefresh?: boolean;
};

export async function api<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  let response = await send(path, options);

  if (response.status === 401 && !options.skipAuthRefresh) {
    if (await refreshAccessToken()) {
      response = await send(path, options);
    } else {
      accessToken = null;
      for (const listener of sessionExpiredListeners) listener();
    }
  }

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, isApiErrorBody(payload) ? payload.error : fallbackError());
  }

  return options.schema ? options.schema.parse(payload) : (payload as T);
}

function send(path: string, { method = 'GET', body, query, signal }: RequestOptions<unknown>) {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  return fetch(`${BASE_URL}${path}${toQueryString(query)}`, {
    method,
    headers,
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  }).catch((): Response => {
    // Sin red: se normaliza a un error de la API para que la UI lo trate igual.
    const offline: ApiErrorBody = { error: fallbackError() };
    return new Response(JSON.stringify(offline), { status: 503 });
  });
}

function toQueryString(query: RequestOptions<unknown>['query']): string {
  if (!query) return '';
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const result = params.toString();
  return result ? `?${result}` : '';
}

function isApiErrorBody(payload: unknown): payload is ApiErrorBody {
  return (
    typeof payload === 'object' &&
    payload !== null &&
    'error' in payload &&
    typeof payload.error === 'object' &&
    payload.error !== null &&
    'code' in payload.error
  );
}

function fallbackError(): ApiErrorBody['error'] {
  return {
    code: 'INTERNAL_ERROR',
    message: 'No se pudo conectar con el servidor. Revisa tu conexión.',
  };
}

/** Mensaje legible para mostrar en un toast a partir de cualquier error. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return error.requestId
      ? `${error.message} (ref. ${error.requestId.slice(0, 8)})`
      : error.message;
  }
  return 'Algo salió mal. Inténtalo de nuevo.';
}
