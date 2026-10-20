import { createHouseholdSchema, joinHouseholdSchema, updateHouseholdSchema } from '@homely/shared';
import { Router } from 'express';
import { authOf, householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireHousehold, requireRole } from '../../middlewares/auth.ts';
import { strictRateLimit } from '../../middlewares/rate-limit.ts';
import { householdsService } from './households.service.ts';

/** Montado detrás de `requireAuth`. Crear y unirse no requieren hogar; el resto sí. */
export const householdsRouter = Router();

householdsRouter.post(
  '/',
  endpoint({ body: createHouseholdSchema }, async ({ body }, req, res) => {
    res.status(201).json(await householdsService.create(authOf(req), body));
  }),
);

householdsRouter.post(
  '/join',
  strictRateLimit,
  endpoint({ body: joinHouseholdSchema }, async ({ body }, req, res) => {
    res.json(await householdsService.join(authOf(req), body.code));
  }),
);

householdsRouter.get(
  '/current',
  requireHousehold,
  endpoint({}, async (_input, req, res) => {
    res.json(await householdsService.current(householdOf(req)));
  }),
);

householdsRouter.patch(
  '/current',
  requireHousehold,
  requireRole('ADMIN'),
  endpoint({ body: updateHouseholdSchema }, async ({ body }, req, res) => {
    res.json(await householdsService.update(householdOf(req), body));
  }),
);
