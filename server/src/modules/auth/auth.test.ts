import { authResponseSchema, sessionSchema } from '@homely/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { app, refreshCookieFrom, registerUser, resetDb } from '../../../tests/helpers.ts';
import { prisma } from '../../lib/prisma.ts';

beforeEach(resetDb);

describe('POST /auth/register', () => {
  it('crea la cuenta, devuelve sesión sin hogar y una cookie de refresh segura', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Iveth', email: ' Iveth@Test.dev ', password: 'contraseña-segura' });

    expect(res.status).toBe(201);
    const body = authResponseSchema.parse(res.body);
    expect(body.session.user).toMatchObject({ name: 'Iveth', email: 'iveth@test.dev' });
    expect(body.session.membership).toBeNull();

    const cookie = (res.headers['set-cookie'] as unknown as string[])[0] ?? '';
    expect(cookie).toMatch(/^homely_rt=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Path=/api/v1/auth');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('no permite dos cuentas con el mismo correo, sin importar mayúsculas', async () => {
    await registerUser('Iveth', 'iveth@test.dev');
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Otra', email: 'IVETH@test.dev', password: 'contraseña-segura' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  it('valida correo y longitud de contraseña con errores por campo', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ name: 'Iveth', email: 'no-es-correo', password: 'corta' });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['email', 'password']),
    );
  });
});

describe('POST /auth/login', () => {
  beforeEach(async () => {
    await registerUser('Iveth', 'iveth@test.dev');
  });

  it('inicia sesión con credenciales correctas', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'iveth@test.dev', password: 'contraseña-segura' });

    expect(res.status).toBe(200);
    expect(authResponseSchema.parse(res.body).accessToken).toBeTruthy();
  });

  it('responde igual a contraseña incorrecta y a correo inexistente', async () => {
    const wrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'iveth@test.dev', password: 'otra-contraseña' });
    const unknownEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nadie@test.dev', password: 'otra-contraseña' });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body).toEqual(unknownEmail.body);
    expect(wrongPassword.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});

describe('GET /auth/me', () => {
  it('exige token', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  it('rechaza tokens manipulados', async () => {
    const user = await registerUser('Iveth');
    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${user.token}x`);
    expect(res.status).toBe(401);
  });

  it('devuelve la sesión del usuario', async () => {
    const user = await registerUser('Iveth');
    const res = await request(app).get('/api/v1/auth/me').set(user.auth);
    expect(res.status).toBe(200);
    expect(sessionSchema.parse(res.body).user.name).toBe('Iveth');
  });
});

describe('POST /auth/refresh', () => {
  it('rota el refresh token y emite un access token nuevo', async () => {
    const user = await registerUser('Iveth');

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie);

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTruthy();
    expect(refreshCookieFrom(res)).not.toBe(user.cookie);
  });

  it('reusar un token recién rotado (recarga a mitad de la rotación) no cierra la sesión', async () => {
    const user = await registerUser('Iveth');
    await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie).expect(200);

    // El navegador no recibió la cookie nueva y vuelve a mandar la anterior.
    const retry = await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie);
    expect(retry.status).toBe(200);
    const again = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookieFrom(retry));
    expect(again.status).toBe(200);
  });

  it('si se reusa un token rotado fuera del margen, revoca toda la familia (posible robo)', async () => {
    const user = await registerUser('Iveth');
    const first = await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie);
    const rotatedCookie = refreshCookieFrom(first);
    // Simula que la rotación ocurrió hace 5 minutos.
    await prisma.refreshToken.updateMany({
      where: { rotatedAt: { not: null } },
      data: { rotatedAt: new Date(Date.now() - 5 * 60_000) },
    });

    const reuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie);
    expect(reuse.status).toBe(401);

    // El token legítimo más reciente también quedó revocado.
    const afterReuse = await request(app).post('/api/v1/auth/refresh').set('Cookie', rotatedCookie);
    expect(afterReuse.status).toBe(401);
  });

  it('sin cookie responde 401', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');
    expect(res.status).toBe(401);
  });
});

describe('logout', () => {
  it('revoca el refresh token actual, sin margen de gracia', async () => {
    const user = await registerUser('Iveth');
    const logout = await request(app).post('/api/v1/auth/logout').set('Cookie', user.cookie);
    expect(logout.status).toBe(204);

    // Justo después del logout: un token cerrado a propósito nunca entra en el margen.
    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', user.cookie);
    expect(res.status).toBe(401);
  });

  it('logout-all revoca las sesiones de todos los dispositivos', async () => {
    const user = await registerUser('Iveth', 'iveth@test.dev');
    const phone = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'iveth@test.dev', password: 'contraseña-segura' });
    const phoneCookie = refreshCookieFrom(phone);

    await request(app).post('/api/v1/auth/logout-all').set(user.auth).expect(204);

    const res = await request(app).post('/api/v1/auth/refresh').set('Cookie', phoneCookie);
    expect(res.status).toBe(401);
  });
});
