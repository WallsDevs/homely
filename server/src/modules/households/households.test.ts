import { sessionSchema } from '@homely/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  app,
  createAdminWithHousehold,
  createInvitation,
  membershipIdOf,
  registerUser,
  resetDb,
} from '../../../tests/helpers.ts';
import { prisma } from '../../lib/prisma.ts';

beforeEach(resetDb);

describe('crear hogar (HM-01)', () => {
  it('deja al creador como ADMIN y siembra las categorías por defecto', async () => {
    const admin = await createAdminWithHousehold('Iveth', 'Casa');

    const session = sessionSchema.parse(admin.session);
    expect(session.membership?.role).toBe('ADMIN');
    expect(session.household).toMatchObject({
      name: 'Casa',
      currency: 'USD',
      timezone: 'America/Bogota',
      weekStartsOn: 'MON',
    });

    const categories = await prisma.expenseCategory.count({
      where: { householdId: session.household?.id ?? '' },
    });
    expect(categories).toBe(9);
  });

  it('un usuario no puede crear un segundo hogar (v1)', async () => {
    const admin = await createAdminWithHousehold();
    const res = await request(app)
      .post('/api/v1/households')
      .set(admin.auth)
      .send({ name: 'Otra casa', timezone: 'UTC' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('ALREADY_IN_HOUSEHOLD');
  });

  it('las rutas de hogar responden NO_HOUSEHOLD a quien aún no tiene hogar', async () => {
    const user = await registerUser('Luis');
    const res = await request(app).get('/api/v1/members').set(user.auth);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NO_HOUSEHOLD');
  });
});

describe('unirse con código (HM-02, HM-03)', () => {
  it('con un código ADMIN, la pareja entra con exactamente los mismos permisos', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const invitation = await createInvitation(iveth, 'ADMIN');
    const luis = await registerUser('Luis');

    // El código se acepta en minúsculas y con guion, como se dicta por WhatsApp.
    const res = await request(app)
      .post('/api/v1/households/join')
      .set(luis.auth)
      .send({ code: invitation.code.toLowerCase() });

    expect(res.status).toBe(200);
    expect(res.body.membership.role).toBe('ADMIN');
    expect(res.body.household.id).toBe(iveth.session.household?.id);

    // Luis, como admin, también puede invitar y editar el hogar.
    await request(app)
      .post('/api/v1/invitations')
      .set(luis.auth)
      .send({ role: 'MEMBER' })
      .expect(201);
    await request(app)
      .patch('/api/v1/households/current')
      .set(luis.auth)
      .send({ name: 'Nuestra casa' })
      .expect(200);
  });

  it('cada miembro recibe un color distinto', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const luis = await addMember(iveth, 'Luis', 'MEMBER');
    expect(luis.session.membership?.color).not.toBe(iveth.session.membership?.color);
  });

  it('un código de un solo uso no sirve dos veces', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const invitation = await createInvitation(iveth, 'MEMBER', 1);
    const luis = await registerUser('Luis');
    const ana = await registerUser('Ana');

    await request(app)
      .post('/api/v1/households/join')
      .set(luis.auth)
      .send({ code: invitation.code })
      .expect(200);
    const res = await request(app)
      .post('/api/v1/households/join')
      .set(ana.auth)
      .send({ code: invitation.code });

    expect(res.status).toBe(410);
    expect(res.body.error.code).toBe('INVITATION_INVALID');
  });

  it('rechaza códigos revocados, expirados e inexistentes', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const revoked = await createInvitation(iveth, 'MEMBER');
    const expired = await createInvitation(iveth, 'MEMBER');
    await request(app).delete(`/api/v1/invitations/${revoked.id}`).set(iveth.auth).expect(204);
    await prisma.invitation.update({
      where: { id: expired.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    const luis = await registerUser('Luis');

    for (const code of [revoked.code, expired.code, 'ZZZZ-ZZZZ']) {
      const res = await request(app).post('/api/v1/households/join').set(luis.auth).send({ code });
      expect(res.status).toBe(410);
    }
  });

  it('lista invitaciones con su estado', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const invitation = await createInvitation(iveth, 'ADMIN');
    await request(app).delete(`/api/v1/invitations/${invitation.id}`).set(iveth.auth);
    await createInvitation(iveth, 'MEMBER');

    const res = await request(app).get('/api/v1/invitations').set(iveth.auth);
    expect(res.status).toBe(200);
    expect(res.body.items.map((i: { status: string }) => i.status)).toEqual(['ACTIVE', 'REVOKED']);
    expect(res.body.items[0].code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});

describe('permisos de MEMBER', () => {
  it('no puede invitar, editar el hogar ni cambiar roles', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const ana = await addMember(iveth, 'Ana', 'MEMBER');

    const responses = await Promise.all([
      request(app).post('/api/v1/invitations').set(ana.auth).send({}),
      request(app).patch('/api/v1/households/current').set(ana.auth).send({ name: 'Mía' }),
      request(app)
        .patch(`/api/v1/members/${membershipIdOf(iveth)}/role`)
        .set(ana.auth)
        .send({ role: 'MEMBER' }),
    ]);

    for (const res of responses) {
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    }
  });
});

describe('aislamiento entre hogares', () => {
  it('un admin de otro hogar no ve ni toca miembros ajenos (404, no 403)', async () => {
    const iveth = await createAdminWithHousehold('Iveth', 'Casa A');
    const ana = await addMember(iveth, 'Ana', 'MEMBER');
    const otro = await createAdminWithHousehold('Otro', 'Casa B');

    const list = await request(app).get('/api/v1/members').set(otro.auth);
    expect(list.body.items).toHaveLength(1);

    const res = await request(app)
      .patch(`/api/v1/members/${membershipIdOf(ana)}/status`)
      .set(otro.auth)
      .send({ isActive: false });
    expect(res.status).toBe(404);
  });
});

describe('editar hogar (HM-07)', () => {
  it('valida la zona horaria', async () => {
    const iveth = await createAdminWithHousehold();
    const res = await request(app)
      .patch('/api/v1/households/current')
      .set(iveth.auth)
      .send({ timezone: 'Marte/Olympus' });
    expect(res.status).toBe(400);
    expect(res.body.error.details.timezone).toBeDefined();
  });

  it('actualiza moneda e inicio de semana', async () => {
    const iveth = await createAdminWithHousehold();
    const res = await request(app)
      .patch('/api/v1/households/current')
      .set(iveth.auth)
      .send({ currency: 'cop', weekStartsOn: 'SUN' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ currency: 'COP', weekStartsOn: 'SUN' });
  });
});
