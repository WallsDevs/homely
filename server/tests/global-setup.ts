import { execSync } from 'node:child_process';

/** Aplica las migraciones a la BD de test antes de toda la suite. */
export default function setup() {
  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env['DATABASE_URL_TEST'] },
  });
}
