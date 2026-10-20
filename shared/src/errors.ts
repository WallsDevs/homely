/** Catálogo de códigos de error de la API (04-api.md). */
export const ERROR_CODES = [
  'VALIDATION_ERROR',
  'INVALID_RANGE',
  'UNAUTHENTICATED',
  'INVALID_CREDENTIALS',
  'FORBIDDEN',
  'NO_HOUSEHOLD',
  'NOT_FOUND',
  'CONFLICT',
  'EMAIL_TAKEN',
  'LAST_ADMIN',
  'ALREADY_IN_HOUSEHOLD',
  'DUPLICATE_GOAL',
  'CATEGORY_IN_USE',
  'INVITATION_INVALID',
  'RATE_LIMITED',
  'INTERNAL_ERROR',
] as const;
export type ErrorCode = (typeof ERROR_CODES)[number];

export type ApiErrorBody = {
  error: {
    code: ErrorCode;
    message: string;
    details?: Record<string, string[]>;
    requestId?: string;
  };
};
