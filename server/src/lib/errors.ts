import type { ErrorCode } from '@homely/shared';

export type FieldErrors = Record<string, string[]>;

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details: FieldErrors | undefined;

  constructor(code: ErrorCode, status: number, message: string, details?: FieldErrors) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static validation(details: FieldErrors): AppError {
    return new AppError('VALIDATION_ERROR', 400, 'Datos inválidos', details);
  }

  static unauthenticated(message = 'Necesitas iniciar sesión'): AppError {
    return new AppError('UNAUTHENTICATED', 401, message);
  }

  static forbidden(message = 'No tienes permiso para hacer esto'): AppError {
    return new AppError('FORBIDDEN', 403, message);
  }

  /** Un recurso de otro hogar también responde 404, para no revelar que existe. */
  static notFound(entity: string): AppError {
    return new AppError('NOT_FOUND', 404, `${entity} no encontrado`);
  }

  static conflict(code: ErrorCode, message: string): AppError {
    return new AppError(code, 409, message);
  }

  static rateLimited(): AppError {
    return new AppError('RATE_LIMITED', 429, 'Demasiadas peticiones, inténtalo en un momento');
  }
}
