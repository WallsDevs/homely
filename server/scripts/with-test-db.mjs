// Ejecuta un comando con DATABASE_URL apuntando a la BD de test (para e2e). Nunca toca la de desarrollo.
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';

const fileEnv = existsSync('.env') ? parseEnv(readFileSync('.env', 'utf8')) : {};
const testUrl = process.env.DATABASE_URL_TEST ?? fileEnv.DATABASE_URL_TEST;
if (!testUrl) {
  console.error('Falta DATABASE_URL_TEST');
  process.exit(1);
}

const [command, ...args] = process.argv.slice(2);
const result = spawnSync(`npx ${command}`, args, {
  stdio: 'inherit',
  shell: true,
  env: { ...process.env, ...fileEnv, DATABASE_URL: testUrl },
});
process.exit(result.status ?? 1);
