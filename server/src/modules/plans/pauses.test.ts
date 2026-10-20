import {
  addDays,
  pauseSchema,
  planSchema,
  startOfWeek,
  todayIn,
  WEEKDAYS,
  weeklyReportSchema,
} from '@homely/shared';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  addMember,
  app,
  createAdminWithHousehold,
  membershipIdOf,
  resetDb,
  type TestUser,
} from '../../../tests/helpers.ts';
import { generateCurrentWeekForAllHouseholds } from '../../jobs/generate-weekly-tasks.ts';
import { fromDbDate } from '../../lib/dates.ts';
import { prisma } from '../../lib/prisma.ts';

beforeEach(resetDb);

const today = () => todayIn('America/Bogota');
const ALL_DAYS = [...WEEKDAYS];

async function createPlan(admin: TestUser, title: string, assignee: TestUser | null) {
  const res = await request(app)
    .post('/api/v1/plans')
    .set(admin.auth)
    .send({ title, weekdays: ALL_DAYS, assigneeId: assignee ? membershipIdOf(assignee) : null });
  expect(res.status).toBe(201);
  return planSchema.parse(res.body);
}

async function createPause(admin: TestUser, body: Record<string, unknown>) {
  const res = await request(app).post('/api/v1/plan-pauses').set(admin.auth).send(body);
  expect(res.status).toBe(201);
  return pauseSchema.parse(res.body);
}

/** Días con tarea pendiente de un plan, ordenados. */
async function pendingDays(planId: string) {
  const rows = await prisma.task.findMany({
    where: { planId, status: 'PENDING' },
    orderBy: { dueDate: 'asc' },
  });
  return rows.map((row) => fromDbDate(row.dueDate));
}

/** Pide el tablero de las próximas 4 semanas para forzar la generación perezosa. */
async function viewFourWeeks(user: TestUser) {
  for (let week = 0; week <= 4; week++) {
    await request(app)
      .get(`/api/v1/tasks/board?week=${addDays(today(), 7 * week)}`)
      .set(user.auth)
      .expect(200);
  }
}

const range = (fromOffset: number, toOffset: number) => ({
  startsOn: addDays(today(), fromOffset),
  endsOn: addDays(today(), toOffset),
});

async function setup() {
  const iveth = await createAdminWithHousehold('Iveth');
  const luis = await addMember(iveth, 'Luis', 'MEMBER');
  const trash = await createPlan(iveth, 'Sacar la basura', luis);
  const dishes = await createPlan(iveth, 'Lavar los platos', iveth);
  await viewFourWeeks(iveth);
  return { iveth, luis, trash, dishes };
}

describe('pausa de todo el hogar (PL-09, PL-10)', () => {
  it('quita las pendientes del rango, conserva completadas y manuales, y no genera en el rango', async () => {
    const { iveth, luis, trash, dishes } = await setup();
    const pause = range(2, 8);

    // Una completada dentro del rango y una manual deben sobrevivir.
    const [doneTask] = await prisma.task.findMany({
      where: { planId: trash.id, dueDate: new Date(`${pause.startsOn}T00:00:00Z`) },
    });
    await request(app).post(`/api/v1/tasks/${doneTask?.id}/complete`).set(luis.auth).expect(200);
    await request(app)
      .post('/api/v1/tasks')
      .set(iveth.auth)
      .send({ title: 'Manual en vacaciones', assigneeId: null, dueDate: addDays(today(), 4) })
      .expect(201);

    const created = await createPause(iveth, { ...pause, reason: 'Vacaciones' });
    expect(created).toMatchObject({ scope: 'HOUSEHOLD', status: 'UPCOMING', reason: 'Vacaciones' });

    for (const plan of [trash, dishes]) {
      const days = await pendingDays(plan.id);
      expect(days.some((day) => day >= pause.startsOn && day <= pause.endsOn)).toBe(false);
      expect(days).toContain(addDays(today(), 1));
      expect(days).toContain(addDays(today(), 9));
    }
    expect(await prisma.task.count({ where: { id: doneTask?.id ?? '' } })).toBe(1);
    expect(await prisma.task.count({ where: { title: 'Manual en vacaciones' } })).toBe(1);

    // Ni la generación perezosa ni el job vuelven a crear tareas dentro del rango.
    await viewFourWeeks(luis);
    await generateCurrentWeekForAllHouseholds();
    const after = await pendingDays(trash.id);
    expect(after.some((day) => day >= pause.startsOn && day <= pause.endsOn)).toBe(false);
  });

  it('acortar la pausa regenera los días liberados; borrarla regenera todo', async () => {
    const { iveth, trash } = await setup();
    const pause = await createPause(iveth, range(1, 10));

    const shortened = await request(app)
      .patch(`/api/v1/plan-pauses/${pause.id}`)
      .set(iveth.auth)
      .send({ endsOn: addDays(today(), 3) });
    expect(shortened.status).toBe(200);
    await viewFourWeeks(iveth);
    let days = await pendingDays(trash.id);
    expect(days).not.toContain(addDays(today(), 2));
    expect(days).toContain(addDays(today(), 4));
    expect(days).toContain(addDays(today(), 10));

    await request(app).delete(`/api/v1/plan-pauses/${pause.id}`).set(iveth.auth).expect(204);
    await viewFourWeeks(iveth);
    days = await pendingDays(trash.id);
    expect(days).toContain(addDays(today(), 1));
    expect(days).toContain(addDays(today(), 2));
  });

  it('alargar la pausa quita más días; terminarla hoy libera desde mañana', async () => {
    const { iveth, trash } = await setup();
    // Empezó ayer (se puede registrar una pausa ya en curso).
    const pause = await createPause(iveth, range(-1, 3));
    expect(pause.status).toBe('ACTIVE');

    await request(app)
      .patch(`/api/v1/plan-pauses/${pause.id}`)
      .set(iveth.auth)
      .send({ endsOn: addDays(today(), 6) })
      .expect(200);
    expect(await pendingDays(trash.id)).not.toContain(addDays(today(), 5));

    // "Terminar hoy": endsOn = ayer. La pausa deja de listarse y mañana ya se genera.
    await request(app)
      .patch(`/api/v1/plan-pauses/${pause.id}`)
      .set(iveth.auth)
      .send({ endsOn: addDays(today(), -1) })
      .expect(200);
    await viewFourWeeks(iveth);
    expect(await pendingDays(trash.id)).toContain(addDays(today(), 1));
    const list = await request(app).get('/api/v1/plan-pauses').set(iveth.auth);
    expect(list.body.items).toHaveLength(0);
  });
});

describe('alcances por persona y por plan', () => {
  it('pausar a Luis detiene sus planes y deja los de Iveth', async () => {
    const { iveth, luis, trash, dishes } = await setup();
    const pause = range(1, 5);
    const created = await createPause(iveth, { ...pause, memberId: membershipIdOf(luis) });
    expect(created).toMatchObject({ scope: 'MEMBER', member: { displayName: 'Luis' } });

    await viewFourWeeks(iveth);
    expect(await pendingDays(trash.id)).not.toContain(addDays(today(), 3));
    expect(await pendingDays(dishes.id)).toContain(addDays(today(), 3));
  });

  it('pausar un plan detiene solo ese plan', async () => {
    const { iveth, trash, dishes } = await setup();
    const created = await createPause(iveth, { ...range(1, 5), planId: trash.id });
    expect(created).toMatchObject({ scope: 'PLAN', plan: { title: 'Sacar la basura' } });

    await viewFourWeeks(iveth);
    expect(await pendingDays(trash.id)).not.toContain(addDays(today(), 3));
    expect(await pendingDays(dishes.id)).toContain(addDays(today(), 3));
  });

  it('la próxima fecha del plan salta la pausa', async () => {
    const { iveth, trash } = await setup();
    await createPause(iveth, { ...range(0, 4), planId: trash.id });

    const res = await request(app).get('/api/v1/plans').set(iveth.auth);
    const plan = res.body.items.find((p: { id: string }) => p.id === trash.id);
    expect(plan.nextDueDate).toBe(addDays(today(), 5));
  });
});

describe('validaciones y permisos', () => {
  it('rechaza pausas ya terminadas, alcances mixtos y miembros de otro hogar', async () => {
    const { iveth, luis } = await setup();
    const otro = await createAdminWithHousehold('Otro', 'Otra casa');

    const past = await request(app)
      .post('/api/v1/plan-pauses')
      .set(iveth.auth)
      .send(range(-10, -2));
    expect(past.status).toBe(400);
    expect(past.body.error.details.endsOn).toBeDefined();

    const mixed = await request(app)
      .post('/api/v1/plan-pauses')
      .set(iveth.auth)
      .send({ ...range(1, 3), memberId: membershipIdOf(luis), planId: 'x' });
    expect(mixed.status).toBe(400);

    const foreign = await request(app)
      .post('/api/v1/plan-pauses')
      .set(iveth.auth)
      .send({ ...range(1, 3), memberId: membershipIdOf(otro) });
    expect(foreign.status).toBe(400);
    expect(foreign.body.error.details.memberId).toBeDefined();
  });

  it('solo los admins crean; todos ven; otro hogar no ve nada', async () => {
    const { iveth, luis } = await setup();
    await request(app).post('/api/v1/plan-pauses').set(luis.auth).send(range(1, 3)).expect(403);
    const pause = await createPause(iveth, range(1, 3));

    const list = await request(app).get('/api/v1/plan-pauses').set(luis.auth);
    expect(list.body.items.map((p: { id: string }) => p.id)).toEqual([pause.id]);

    const otro = await createAdminWithHousehold('Otro', 'Otra casa');
    await request(app).delete(`/api/v1/plan-pauses/${pause.id}`).set(otro.auth).expect(404);
  });

  it('queda en la auditoría', async () => {
    const { iveth } = await setup();
    await createPause(iveth, { ...range(1, 3), reason: 'Viaje' });
    const log = await prisma.auditLog.findFirst({ where: { action: 'PLAN_PAUSE_CREATED' } });
    expect(log?.metadata).toMatchObject({ scope: 'HOUSEHOLD' });
  });
});

describe('reportes durante una pausa (PL-11)', () => {
  it('una semana entera en pausa no tiene cumplimiento ni rompe rachas', async () => {
    const { iveth, luis } = await setup();
    const nextWeek = addDays(startOfWeek(today(), 'MON'), 7);
    await createPause(iveth, { startsOn: nextWeek, endsOn: addDays(nextWeek, 6) });

    const res = await request(app).get(`/api/v1/reports/weekly?week=${nextWeek}`).set(luis.auth);
    const report = weeklyReportSchema.parse(res.body);
    expect(report.household).toMatchObject({ assigned: 0, rate: null });
    for (const member of report.members) expect(member.rate).toBeNull();
  });
});
