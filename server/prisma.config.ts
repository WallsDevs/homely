import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { defineConfig } from 'prisma/config';

// Con un archivo de config, Prisma ya no carga .env por su cuenta.
// Las variables ya definidas (p. ej. DATABASE_URL de test) tienen prioridad.
if (existsSync('.env')) {
  for (const [key, value] of Object.entries(parseEnv(readFileSync('.env', 'utf8')))) {
    process.env[key] ??= value;
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    seed: 'tsx --conditions=source prisma/seed.ts',
  },
});
