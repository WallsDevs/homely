import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { healthResponseSchema } from '@homely/shared';
import { createApp } from './app.ts';

const app = createApp();

describe('GET /api/v1/health', () => {
  it('responde ok con la BD disponible y cumple el contrato', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(healthResponseSchema.parse(res.body)).toMatchObject({ ok: true, db: 'ok' });
    expect(res.headers['x-request-id']).toBeTruthy();
  });

  it('aplica cabeceras de seguridad y oculta x-powered-by', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});

describe('manejo de errores', () => {
  it('ruta inexistente → 404 NOT_FOUND con formato uniforme', async () => {
    const res = await request(app).get('/api/v1/no-existe');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Ruta GET /api/v1/no-existe no encontrado' },
    });
  });

  it('JSON mal formado → 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/health')
      .set('content-type', 'application/json')
      .send('{"roto":');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
