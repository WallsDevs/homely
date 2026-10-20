import {
  createExpenseSchema,
  expenseIdParamsSchema,
  expenseSummaryQuerySchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { expensesService } from './expenses.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. Los permisos finos van en el service. */
export const expensesRouter = Router();

expensesRouter.get(
  '/',
  endpoint({ query: listExpensesQuerySchema }, async ({ query }, req, res) => {
    res.json(await expensesService.list(householdOf(req), query));
  }),
);

expensesRouter.get(
  '/summary',
  endpoint({ query: expenseSummaryQuerySchema }, async ({ query }, req, res) => {
    res.json(await expensesService.summary(householdOf(req), query.period, query.date));
  }),
);

expensesRouter.post(
  '/',
  endpoint({ body: createExpenseSchema }, async ({ body }, req, res) => {
    res.status(201).json(await expensesService.create(householdOf(req), body));
  }),
);

expensesRouter.get(
  '/:id',
  endpoint({ params: expenseIdParamsSchema }, async ({ params }, req, res) => {
    res.json(await expensesService.get(householdOf(req), params.id));
  }),
);

expensesRouter.patch(
  '/:id',
  endpoint(
    { params: expenseIdParamsSchema, body: updateExpenseSchema },
    async ({ params, body }, req, res) => {
      res.json(await expensesService.update(householdOf(req), params.id, body));
    },
  ),
);

expensesRouter.delete(
  '/:id',
  endpoint({ params: expenseIdParamsSchema }, async ({ params }, req, res) => {
    await expensesService.remove(householdOf(req), params.id);
    res.status(204).end();
  }),
);
