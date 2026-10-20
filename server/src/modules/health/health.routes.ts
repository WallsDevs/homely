import type { HealthResponse } from '@homely/shared';
import { Router } from 'express';
import { env } from '../../config/env.ts';
import { endpoint } from '../../lib/endpoint.ts';
import { prisma } from '../../lib/prisma.ts';

export const healthRouter = Router();

healthRouter.get(
  '/',
  endpoint({}, async (_input, _req, res) => {
    const db = await prisma.$queryRaw`SELECT 1`.then(
      () => 'ok' as const,
      () => 'down' as const,
    );
    const body: HealthResponse = { ok: db === 'ok', version: env.APP_VERSION, db };
    res.status(db === 'ok' ? 200 : 503).json(body);
  }),
);
