import {
  createPlanSchema,
  planIdParamsSchema,
  setPlanActiveSchema,
  updatePlanSchema,
} from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { plansService } from './plans.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. Todos ven; solo admins cambian. */
export const plansRouter = Router();

plansRouter.get(
  '/',
  endpoint({}, async (_input, req, res) => {
    res.json({ items: await plansService.list(householdOf(req)) });
  }),
);

plansRouter.post(
  '/',
  requireRole('ADMIN'),
  endpoint({ body: createPlanSchema }, async ({ body }, req, res) => {
    res.status(201).json(await plansService.create(householdOf(req), body));
  }),
);

plansRouter.get(
  '/:id',
  endpoint({ params: planIdParamsSchema }, async ({ params }, req, res) => {
    res.json(await plansService.get(householdOf(req), params.id));
  }),
);

plansRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  endpoint(
    { params: planIdParamsSchema, body: updatePlanSchema },
    async ({ params, body }, req, res) => {
      res.json(await plansService.update(householdOf(req), params.id, body));
    },
  ),
);

plansRouter.patch(
  '/:id/status',
  requireRole('ADMIN'),
  endpoint(
    { params: planIdParamsSchema, body: setPlanActiveSchema },
    async ({ params, body }, req, res) => {
      res.json(await plansService.setActive(householdOf(req), params.id, body.isActive));
    },
  ),
);

plansRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  endpoint({ params: planIdParamsSchema }, async ({ params }, req, res) => {
    await plansService.remove(householdOf(req), params.id);
    res.status(204).end();
  }),
);
