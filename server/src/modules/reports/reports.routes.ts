import { historyQuerySchema, topMissedQuerySchema, weeklyReportQuerySchema } from '@homely/shared';
import { Router } from 'express';
import { householdOf } from '../../lib/context.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { reportsService } from './reports.service.ts';

/** Montado detrás de `requireAuth` + `requireHousehold`. Todos los miembros ven los reportes. */
export const reportsRouter = Router();

reportsRouter.get(
  '/weekly',
  endpoint({ query: weeklyReportQuerySchema }, async ({ query }, req, res) => {
    res.json(await reportsService.weekly(householdOf(req), query.week));
  }),
);

reportsRouter.get(
  '/tasks/top-missed',
  endpoint({ query: topMissedQuerySchema }, async ({ query }, req, res) => {
    res.json(
      await reportsService.topMissed(householdOf(req), query.from, query.to, query.memberId),
    );
  }),
);

reportsRouter.get(
  '/tasks/history',
  endpoint({ query: historyQuerySchema }, async ({ query }, req, res) => {
    res.json(await reportsService.history(householdOf(req), query.memberId, query.year));
  }),
);
