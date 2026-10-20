import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  app,
  createAdminWithHousehold,
  createInvitation,
  membershipIdOf,
  resetDb,
} from '../../../tests/helpers.ts';
import { prisma } from '../../lib/prisma.ts';

beforeEach(resetDb);

describe('siempre al menos un admin', () => {
  it('el único admin no puede degradarse, desactivarse ni salir', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const id = membershipIdOf(iveth);

    const demote = await request(app)
      .patch(`/api/v1/members/${id}/role`)
      .set(iveth.auth)
      .send({ role: 'MEMBER' });
    const deactivate = await request(app)
      .patch(`/api/v1/members/${id}/status`)
      .set(iveth.auth)
      .send({ isActive: false });
    const leave = await request(app).post('/api/v1/members/me/leave').set(iveth.auth);

    for (const res of [demote, deactivate, leave]) {
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('LAST_ADMIN');
    }
  });

  it('con dos admins, uno puede degradar al otro; el que queda ya no puede degradarse', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const luis = await addMember(iveth, 'Luis', 'ADMIN');

    await request(app)
      .patch(`/api/v1/members/${membershipIdOf(luis)}/role`)
      .set(iveth.auth)
      .send({ role: 'MEMBER' })
      .expect(200);

    const res = await request(app)
      .patch(`/api/v1/members/${membershipIdOf(iveth)}/role`)
      .set(iveth.auth)
      .send({ role: 'MEMBER' });
    expect(res.body.error.code).toBe('LAST_ADMIN');
  });

  it('registra el cambio de rol en auditoría', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const ana = await addMember(iveth, 'Ana', 'MEMBER');
    await request(app)
      .patch(`/api/v1/members/${membershipIdOf(ana)}/role`)
      .set(iveth.auth)
      .send({ role: 'ADMIN' })
      .expect(200);

    const log = await prisma.auditLog.findFirst({ where: { action: 'MEMBER_ROLE_CHANGED' } });
    expect(log?.metadata).toMatchObject({ from: 'MEMBER', to: 'ADMIN' });
    expect(log?.actorId).toBe(membershipIdOf(iveth));
  });
});

describe('desactivar miembros (regla 3 de roles)', () => {
  it('el miembro desactivado pierde acceso de inmediato y sus planes quedan sin asignar', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const luis = await addMember(iveth, 'Luis', 'MEMBER');
    const plan = await prisma.taskPlan.create({
      data: {
        householdId: iveth.session.household?.id ?? '',
        title: 'Sacar la basura',
        weekdays: ['WED', 'SAT'],
        assigneeId: membershipIdOf(luis),
      },
    });

    await request(app)
      .patch(`/api/v1/members/${membershipIdOf(luis)}/status`)
      .set(iveth.auth)
      .send({ isActive: false })
      .expect(200);

    const res = await request(app).get('/api/v1/members').set(luis.auth);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('NO_HOUSEHOLD');

    const updatedPlan = await prisma.taskPlan.findUniqueOrThrow({ where: { id: plan.id } });
    expect(updatedPlan.assigneeId).toBeNull();
  });

  it('los inactivos solo aparecen al pedirlos explícitamente', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const luis = await addMember(iveth, 'Luis', 'MEMBER');
    await request(app)
      .patch(`/api/v1/members/${membershipIdOf(luis)}/status`)
      .set(iveth.auth)
      .send({ isActive: false });

    const active = await request(app).get('/api/v1/members').set(iveth.auth);
    const all = await request(app).get('/api/v1/members?includeInactive=true').set(iveth.auth);
    expect(active.body.items).toHaveLength(1);
    expect(all.body.items).toHaveLength(2);
  });

  it('quien sale y vuelve a entrar recupera su misma membresía (y su historial)', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const luis = await addMember(iveth, 'Luis', 'MEMBER');
    await request(app).post('/api/v1/members/me/leave').set(luis.auth).expect(204);

    const invitation = await createInvitation(iveth, 'ADMIN');
    const res = await request(app)
      .post('/api/v1/households/join')
      .set(luis.auth)
      .send({ code: invitation.code });

    expect(res.status).toBe(200);
    expect(res.body.membership.id).toBe(membershipIdOf(luis));
    expect(res.body.membership.role).toBe('ADMIN');
  });
});

describe('PATCH /members/me (HM-06)', () => {
  it('cada miembro edita su nombre visible y color', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const ana = await addMember(iveth, 'Ana', 'MEMBER');

    const res = await request(app)
      .patch('/api/v1/members/me')
      .set(ana.auth)
      .send({ displayName: 'Anita', color: '#4FA3A5' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ displayName: 'Anita', color: '#4FA3A5', role: 'MEMBER' });
  });

  it('rechaza colores inválidos', async () => {
    const iveth = await createAdminWithHousehold('Iveth');
    const res = await request(app)
      .patch('/api/v1/members/me')
      .set(iveth.auth)
      .send({ color: 'rojo' });
    expect(res.status).toBe(400);
  });
});
