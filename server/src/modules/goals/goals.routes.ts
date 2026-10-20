import { createGoalSchema, goalIdParamsSchema, updateGoalSchema } from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { goalsService } from './goals.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. Todos ven; solo admins cambian. */
export const goalsRouter = Router();

goalsRouter.get(
  '/',
  endpoint({}, async (_input, req, res) => {
    res.json({ items: await goalsService.list(householdOf(req)) });
  }),
);

goalsRouter.post(
  '/',
  requireRole('ADMIN'),
  endpoint({ body: createGoalSchema }, async ({ body }, req, res) => {
    res.status(201).json(await goalsService.create(householdOf(req), body));
  }),
);

goalsRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  endpoint(
    { params: goalIdParamsSchema, body: updateGoalSchema },
    async ({ params, body }, req, res) => {
      res.json(await goalsService.update(householdOf(req), params.id, body));
    },
  ),
);

goalsRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  endpoint({ params: goalIdParamsSchema }, async ({ params }, req, res) => {
    await goalsService.remove(householdOf(req), params.id);
    res.status(204).end();
  }),
);
