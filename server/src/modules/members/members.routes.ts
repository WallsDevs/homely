import {
  listMembersQuerySchema,
  memberIdParamsSchema,
  updateMeSchema,
  updateRoleSchema,
  updateStatusSchema,
} from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { membersService } from './members.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. */
export const membersRouter = Router();

membersRouter.get(
  '/',
  endpoint({ query: listMembersQuerySchema }, async ({ query }, req, res) => {
    const items = await membersService.list(householdOf(req), query.includeInactive);
    res.json({ items });
  }),
);

membersRouter.patch(
  '/me',
  endpoint({ body: updateMeSchema }, async ({ body }, req, res) => {
    res.json(await membersService.updateMe(householdOf(req), body));
  }),
);

membersRouter.post(
  '/me/leave',
  endpoint({}, async (_input, req, res) => {
    await membersService.leave(householdOf(req));
    res.status(204).end();
  }),
);

membersRouter.patch(
  '/:id/role',
  requireRole('ADMIN'),
  endpoint(
    { params: memberIdParamsSchema, body: updateRoleSchema },
    async ({ params, body }, req, res) => {
      res.json(await membersService.changeRole(householdOf(req), params.id, body.role));
    },
  ),
);

membersRouter.patch(
  '/:id/status',
  requireRole('ADMIN'),
  endpoint(
    { params: memberIdParamsSchema, body: updateStatusSchema },
    async ({ params, body }, req, res) => {
      res.json(await membersService.setActive(householdOf(req), params.id, body.isActive));
    },
  ),
);
