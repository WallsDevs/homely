import type { Role } from '@homely/shared';
import type { RequestHandler } from 'express';
import { authOf, householdOf } from '../lib/context.ts';
import { AppError } from '../lib/errors.ts';
import { verifyAccessToken } from '../lib/jwt.ts';
import { membersRepository } from '../modules/members/members.repository.ts';

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : undefined;
  const userId = token ? verifyAccessToken(token) : null;
  if (!userId) throw AppError.unauthenticated();

  req.auth = { userId };
  next();
};

/**
 * Carga la membresía activa del usuario y su hogar. Se consulta en cada petición a propósito:
 * desactivar a un miembro o cambiarle el rol surte efecto de inmediato, sin esperar a que expire
 * su token. Es una sola consulta por índice.
 */
export const requireHousehold: RequestHandler = async (req, _res, next) => {
  const { userId } = authOf(req);
  const membership = await membersRepository.findActiveByUser(userId);
  if (!membership) throw new AppError('NO_HOUSEHOLD', 403, 'Aún no perteneces a un hogar');

  const { household } = membership;
  req.householdCtx = {
    userId,
    membershipId: membership.id,
    role: membership.role,
    householdId: household.id,
    household: {
      name: household.name,
      timezone: household.timezone,
      weekStartsOn: household.weekStartsOn,
      currency: household.currency,
    },
  };
  next();
};

export function requireRole(role: Role): RequestHandler {
  return (req, _res, next) => {
    if (householdOf(req).role !== role) throw AppError.forbidden();
    next();
  };
}
