import { Prisma } from '@prisma/client';
import type { ApiErrorBody } from '@homely/shared';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import { AppError } from '../lib/errors.ts';
import { logger } from '../lib/logger.ts';

export const notFoundHandler: RequestHandler = (req) => {
  throw AppError.notFound(`Ruta ${req.method} ${req.path}`);
};

/** Único punto donde un error se convierte en respuesta HTTP. */
export const errorHandler: ErrorRequestHandler = (error: unknown, req, res, _next) => {
  const appError = toAppError(error);
  const isServerError = appError.status >= 500;

  if (isServerError) {
    (req.log ?? logger).error({ err: error }, 'Error no controlado');
  }

  const body: ApiErrorBody = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.details ? { details: appError.details } : {}),
      ...(isServerError ? { requestId: String(req.id) } : {}),
    },
  };
  res.status(appError.status).json(body);
};

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') return AppError.conflict('CONFLICT', 'El recurso ya existe');
    if (error.code === 'P2025') return AppError.notFound('Recurso');
    // Conflicto de serialización entre transacciones concurrentes: el cliente puede reintentar.
    if (error.code === 'P2034') {
      return AppError.conflict(
        'CONFLICT',
        'Otra persona hizo un cambio a la vez. Inténtalo de nuevo.',
      );
    }
  }

  if (isBodyParserError(error)) {
    if (error.type === 'entity.parse.failed') {
      return new AppError('VALIDATION_ERROR', 400, 'El cuerpo de la petición no es JSON válido');
    }
    if (error.type === 'entity.too.large') {
      return new AppError('VALIDATION_ERROR', 413, 'El cuerpo de la petición es demasiado grande');
    }
  }

  return new AppError('INTERNAL_ERROR', 500, 'Algo salió mal. Inténtalo de nuevo.');
}

function isBodyParserError(error: unknown): error is { type: string } {
  return (
    typeof error === 'object' && error !== null && 'type' in error && typeof error.type === 'string'
  );
}
