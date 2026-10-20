import { rateLimit } from 'express-rate-limit';
import { env, isTest } from '../config/env.ts';
import { AppError } from '../lib/errors.ts';

function perMinute(limit: number, scope: string) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    handler: (req, _res, next) => {
      req.log.warn({ scope, limit }, 'Límite de peticiones alcanzado');
      next(AppError.rateLimited());
    },
  });
}

/** Toda la API. Generoso: varios miembros del hogar suelen compartir la misma IP. */
export const globalRateLimit = perMinute(env.RATE_LIMIT_PER_MINUTE, 'api');

/** Login, registro y unirse a un hogar. */
export const strictRateLimit = perMinute(env.AUTH_RATE_LIMIT_PER_MINUTE, 'auth');
