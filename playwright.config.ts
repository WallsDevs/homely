import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig, devices } from '@playwright/test';

/*
 * Pruebas de humo de punta a punta contra el build de PRODUCCIÓN (server entregando el client),
 * usando la BD de test, nunca la de desarrollo. `npm run e2e` siembra la BD antes de correr.
 */
const serverEnv = existsSync('server/.env')
  ? parseEnv(readFileSync('server/.env', 'utf8'))
  : ({} as Record<string, string>);
const testDatabaseUrl = process.env['DATABASE_URL_TEST'] ?? serverEnv['DATABASE_URL_TEST'] ?? '';
const PORT = 4200;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'e2e/.results',
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'movil',
      use: { ...devices['Pixel 7'], viewport: { width: 360, height: 780 } },
    },
    {
      name: 'escritorio',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: 'node --env-file=server/.env server/dist/server.js',
    url: `http://localhost:${PORT}/api/v1/health`,
    reuseExistingServer: false,
    timeout: 30_000,
    env: {
      NODE_ENV: 'production',
      PORT: String(PORT),
      CLIENT_ORIGIN: `http://localhost:${PORT}`,
      CLIENT_DIST_DIR: 'client/dist',
      DATABASE_URL: testDatabaseUrl,
      LOG_LEVEL: 'warn',
      // Las pruebas navegan mucho más rápido que una persona y desde la misma IP.
      RATE_LIMIT_PER_MINUTE: '10000',
      AUTH_RATE_LIMIT_PER_MINUTE: '1000',
    },
  },
});
