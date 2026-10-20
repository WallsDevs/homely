import { rateLimit } from 'express-rate-limit';
import { isTest } from '../config/env.ts';
import { AppError } from '../lib/errors.ts';

function perMinute(limit: number) {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => isTest,
    handler: (_req, _res, next) => next(AppError.rateLimited()),
  });
}

/** 100 peticiones por minuto e IP para toda la API. */
export const globalRateLimit = perMinute(100);

/** 10 peticiones por minuto e IP en login, registro y unirse a un hogar. */
export const strictRateLimit = perMinute(10);
