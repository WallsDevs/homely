import {
  createCategorySchema,
  listCategoriesQuerySchema,
  reorderCategoriesSchema,
  updateCategorySchema,
} from '@homely/shared';
import { Router } from 'express';
import { z } from 'zod';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { categoriesService } from './categories.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. Todos ven; solo admins cambian. */
export const categoriesRouter = Router();

const idParams = z.object({ id: z.string().min(1).max(64) });

categoriesRouter.get(
  '/',
  endpoint({ query: listCategoriesQuerySchema }, async ({ query }, req, res) => {
    res.json({ items: await categoriesService.list(householdOf(req), query.includeArchived) });
  }),
);

categoriesRouter.post(
  '/',
  requireRole('ADMIN'),
  endpoint({ body: createCategorySchema }, async ({ body }, req, res) => {
    res.status(201).json(await categoriesService.create(householdOf(req), body));
  }),
);

categoriesRouter.put(
  '/order',
  requireRole('ADMIN'),
  endpoint({ body: reorderCategoriesSchema }, async ({ body }, req, res) => {
    res.json({ items: await categoriesService.reorder(householdOf(req), body.ids) });
  }),
);

categoriesRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  endpoint({ params: idParams, body: updateCategorySchema }, async ({ params, body }, req, res) => {
    res.json(await categoriesService.update(householdOf(req), params.id, body));
  }),
);
