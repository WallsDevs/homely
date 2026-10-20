import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../app.ts';

/** Un "client compilado" mínimo en una carpeta temporal. */
function fakeDist(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'homely-dist-'));
  writeFileSync(path.join(dir, 'index.html'), '<!doctype html><title>Homely</title>');
  mkdirSync(path.join(dir, 'assets'));
  writeFileSync(path.join(dir, 'assets', 'index-abc123.js'), 'console.log(1)');
  return dir;
}

describe('servir el client en producción', () => {
  const dist = fakeDist();
  // Ruta relativa a propósito: es como suele venir en la variable de entorno.
  const app = createApp({ clientDistDir: path.relative(process.cwd(), dist) });

  it('las rutas de la SPA devuelven index.html sin caché', async () => {
    for (const route of ['/', '/tasks/board', '/reports/history?member=x']) {
      const res = await request(app).get(route).set('Accept', 'text/html');
      expect(res.status).toBe(200);
      expect(res.text).toContain('<title>Homely</title>');
      expect(res.headers['cache-control']).toBe('no-cache');
    }
  });

  it('los assets con hash se cachean un año', async () => {
    const res = await request(app).get('/assets/index-abc123.js');
    expect(res.status).toBe(200);
    expect(res.headers['cache-control']).toBe('public, max-age=31536000, immutable');
  });

  it('aplica una CSP estricta', async () => {
    const res = await request(app).get('/').set('Accept', 'text/html');
    const csp = String(res.headers['content-security-policy']);
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain('unsafe-inline');
  });

  it('la API sigue respondiendo JSON, incluso en rutas inexistentes', async () => {
    const res = await request(app).get('/api/v1/no-existe').set('Accept', 'text/html');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
