import { createInvitationSchema, invitationIdParamsSchema } from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { invitationsService } from './invitations.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. Todo es solo para admins. */
export const invitationsRouter = Router();

invitationsRouter.use(requireRole('ADMIN'));

invitationsRouter.get(
  '/',
  endpoint({}, async (_input, req, res) => {
    res.json({ items: await invitationsService.list(householdOf(req)) });
  }),
);

invitationsRouter.post(
  '/',
  endpoint({ body: createInvitationSchema }, async ({ body }, req, res) => {
    res.status(201).json(await invitationsService.create(householdOf(req), body));
  }),
);

invitationsRouter.delete(
  '/:id',
  endpoint({ params: invitationIdParamsSchema }, async ({ params }, req, res) => {
    await invitationsService.revoke(householdOf(req), params.id);
    res.status(204).end();
  }),
);
