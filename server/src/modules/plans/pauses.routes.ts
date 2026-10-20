import { createPauseSchema, pauseIdParamsSchema, updatePauseSchema } from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { pausesService } from './pauses.service.ts';

/** Montado en `/plan-pauses` detrás de `requireAuth` + `requireHousehold`. Todos ven; admins cambian. */
export const pausesRouter = Router();

pausesRouter.get(
  '/',
  endpoint({}, async (_input, req, res) => {
    res.json({ items: await pausesService.list(householdOf(req)) });
  }),
);

pausesRouter.post(
  '/',
  requireRole('ADMIN'),
  endpoint({ body: createPauseSchema }, async ({ body }, req, res) => {
    res.status(201).json(await pausesService.create(householdOf(req), body));
  }),
);

pausesRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  endpoint(
    { params: pauseIdParamsSchema, body: updatePauseSchema },
    async ({ params, body }, req, res) => {
      res.json(await pausesService.update(householdOf(req), params.id, body));
    },
  ),
);

pausesRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  endpoint({ params: pauseIdParamsSchema }, async ({ params }, req, res) => {
    await pausesService.remove(householdOf(req), params.id);
    res.status(204).end();
  }),
);
