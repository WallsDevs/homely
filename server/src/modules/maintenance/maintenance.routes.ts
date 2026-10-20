import { purgeRangeSchema, purgeSchema } from '@homely/shared';
import { Router } from 'express';
import { z } from 'zod';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { requireRole } from '../../middlewares/auth.ts';
import { strictRateLimit } from '../../middlewares/rate-limit.ts';
import { maintenanceService } from './maintenance.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. Solo admins. */
export const maintenanceRouter = Router();

maintenanceRouter.use(requireRole('ADMIN'));

maintenanceRouter.post(
  '/purge/preview',
  endpoint({ body: purgeRangeSchema }, async ({ body }, req, res) => {
    res.json(await maintenanceService.preview(householdOf(req), body.from, body.to));
  }),
);

maintenanceRouter.post(
  '/purge',
  strictRateLimit,
  endpoint({ body: purgeSchema }, async ({ body }, req, res) => {
    res.json(
      await maintenanceService.purge(householdOf(req), body.from, body.to, body.confirmation),
    );
  }),
);

maintenanceRouter.get(
  '/audit-log',
  endpoint(
    { query: z.object({ cursor: z.string().max(64).optional() }) },
    async ({ query }, req, res) => {
      res.json(await maintenanceService.auditLog(householdOf(req), query.cursor));
    },
  ),
);
