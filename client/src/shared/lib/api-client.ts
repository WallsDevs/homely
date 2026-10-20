import type { ApiErrorBody, ErrorCode } from '@homely/shared';
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

/** El access token vive solo en memoria (nunca en localStorage). Se rellena en Fase 1. */
let accessToken: string | null = null;

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

type RequestOptions<T> = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  /** Si se pasa, la respuesta se valida contra el contrato de `@homely/shared`. */
  schema?: z.ZodType<T>;
  signal?: AbortSignal;
};

export async function api<T>(path: string, options: RequestOptions<T> = {}): Promise<T> {
  const { method = 'GET', body, query, schema, signal } = options;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;

  const response = await fetch(`${BASE_URL}${path}${toQueryString(query)}`, {
    method,
    headers,
    credentials: 'include',
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    ...(signal ? { signal } : {}),
  });

  if (response.status === 204) return undefined as T;

  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(response.status, isApiErrorBody(payload) ? payload.error : fallbackError());
  }

  return schema ? schema.parse(payload) : (payload as T);
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
  return { code: 'INTERNAL_ERROR', message: 'No se pudo conectar con el servidor' };
}
