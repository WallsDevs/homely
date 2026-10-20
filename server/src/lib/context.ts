import type { Role, Weekday } from '@homely/shared';
import type { Request } from 'express';

/** Usuario autenticado (lo rellena `requireAuth`). */
export type AuthCtx = { userId: string };

/** Usuario autenticado + su membresía activa y su hogar (lo rellena `requireHousehold`). */
export type HouseholdCtx = AuthCtx & {
  membershipId: string;
  role: Role;
  householdId: string;
  household: { name: string; timezone: string; weekStartsOn: Weekday; currency: string };
};

declare global {
  // oxlint-disable-next-line typescript/no-namespace -- augmentación estándar de Express
  namespace Express {
    interface Request {
      auth?: AuthCtx;
      householdCtx?: HouseholdCtx;
    }
  }
}

/** Uso en handlers detrás de `requireAuth`. Si falta, la ruta está mal montada: error 500. */
export function authOf(req: Request): AuthCtx {
  if (!req.auth) throw new Error('requireAuth no se ejecutó antes de esta ruta');
  return req.auth;
}

/** Uso en handlers detrás de `requireHousehold`. */
export function householdOf(req: Request): HouseholdCtx {
  if (!req.householdCtx) throw new Error('requireHousehold no se ejecutó antes de esta ruta');
  return req.householdCtx;
}
