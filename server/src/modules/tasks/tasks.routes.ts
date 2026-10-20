import {
  boardQuerySchema,
  createTaskSchema,
  listTasksQuerySchema,
  taskIdParamsSchema,
  updateTaskSchema,
} from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { tasksService } from './tasks.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. */
export const tasksRouter = Router();

tasksRouter.get(
  '/',
  endpoint({ query: listTasksQuerySchema }, async ({ query }, req, res) => {
    res.json(await tasksService.list(householdOf(req), query));
  }),
);

tasksRouter.get(
  '/mine',
  endpoint({}, async (_input, req, res) => {
    res.json(await tasksService.mine(householdOf(req)));
  }),
);

tasksRouter.get(
  '/board',
  endpoint({ query: boardQuerySchema }, async ({ query }, req, res) => {
    res.json(await tasksService.board(householdOf(req), query.week));
  }),
);

tasksRouter.post(
  '/',
  requireRole('ADMIN'),
  endpoint({ body: createTaskSchema }, async ({ body }, req, res) => {
    res.status(201).json(await tasksService.create(householdOf(req), body));
  }),
);

tasksRouter.get(
  '/:id',
  endpoint({ params: taskIdParamsSchema }, async ({ params }, req, res) => {
    res.json(await tasksService.get(householdOf(req), params.id));
  }),
);

tasksRouter.patch(
  '/:id',
  requireRole('ADMIN'),
  endpoint(
    { params: taskIdParamsSchema, body: updateTaskSchema },
    async ({ params, body }, req, res) => {
      res.json(await tasksService.update(householdOf(req), params.id, body));
    },
  ),
);

tasksRouter.delete(
  '/:id',
  requireRole('ADMIN'),
  endpoint({ params: taskIdParamsSchema }, async ({ params }, req, res) => {
    await tasksService.remove(householdOf(req), params.id);
    res.status(204).end();
  }),
);

tasksRouter.post(
  '/:id/complete',
  endpoint({ params: taskIdParamsSchema }, async ({ params }, req, res) => {
    res.json(await tasksService.complete(householdOf(req), params.id));
  }),
);

tasksRouter.post(
  '/:id/uncomplete',
  endpoint({ params: taskIdParamsSchema }, async ({ params }, req, res) => {
    res.json(await tasksService.uncomplete(householdOf(req), params.id));
  }),
);

tasksRouter.post(
  '/:id/skip',
  requireRole('ADMIN'),
  endpoint({ params: taskIdParamsSchema }, async ({ params }, req, res) => {
    res.json(await tasksService.skip(householdOf(req), params.id));
  }),
);
