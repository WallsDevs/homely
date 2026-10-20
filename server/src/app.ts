import { randomUUID } from 'node:crypto';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { Router } from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.ts';
import { logger } from './lib/logger.ts';
import { errorHandler, notFoundHandler } from './middlewares/error-handler.ts';
import { globalRateLimit } from './middlewares/rate-limit.ts';
import { healthRouter } from './modules/health/health.routes.ts';

/** Crea la app sin escuchar en un puerto, para poder testearla con Supertest. */
export function createApp() {
  const app = express();

  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const incoming = req.headers['x-request-id'];
        const id = typeof incoming === 'string' && incoming.length <= 64 ? incoming : randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
      autoLogging: { ignore: (req) => req.url === '/api/v1/health' },
    }),
  );
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  const api = Router();
  api.use(globalRateLimit);
  api.use('/health', healthRouter);

  app.use('/api/v1', api);
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
