import { createApp } from './app.ts';
import { env } from './config/env.ts';
import { logger } from './lib/logger.ts';
import { prisma } from './lib/prisma.ts';

await prisma.$connect();

const server = createApp().listen(env.PORT, () => {
  logger.info(`Homely API escuchando en http://localhost:${env.PORT}/api/v1`);
});

function shutdown(signal: string) {
  logger.info(`${signal} recibido, cerrando…`);
  server.close(() => {
    void prisma.$disconnect().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
