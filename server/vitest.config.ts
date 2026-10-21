import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'vitest/config';

if (existsSync('.env')) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync('.env', 'utf8')))) {
    process.env[key] ??= value;
  }
}

const testDatabaseUrl = process.env['DATABASE_URL_TEST'];
if (!testDatabaseUrl) throw new Error('Falta DATABASE_URL_TEST en server/.env');

export default defineConfig({
  resolve: { conditions: ['source'] },
  ssr: { resolve: { conditions: ['source'] } },
  test: {
    environment: 'node',
    // Los tests crean usuarios: el registro va abierto (el cierre se prueba en auth.test.ts).
    env: { NODE_ENV: 'test', DATABASE_URL: testDatabaseUrl, REGISTRATION_ENABLED: 'true' },
    globalSetup: ['./tests/global-setup.ts'],
    // Los tests de integración comparten la BD de test: se ejecutan en serie.
    fileParallelism: false,
  },
});
