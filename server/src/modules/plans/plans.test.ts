import {
  addDays,
  dateInWeek,
  planDetailSchema,
  planSchema,
  startOfWeek,
  todayIn,
  WEEKDAYS,
  type Weekday,
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

const TZ = 'America/Bogota';
const today = () => todayIn(TZ);
const ALL_DAYS = [...WEEKDAYS];

/** Días de la semana de `weekStart` que un plan debería generar (nunca días pasados). */
function expectedDays(weekdays: Weekday[], weekStart = startOfWeek(today(), 'MON')) {
  return weekdays.map((day) => dateInWeek(weekStart, day, 'MON')).filter((day) => day >= today());
}

async function createPlan(admin: TestUser, body: Record<string, unknown>) {
  const res = await request(app).post('/api/v1/plans').set(admin.auth).send(body);
  expect(res.status).toBe(201);
  return planSchema.parse(res.body);
}

async function planTaskDays(planId: string, status?: 'PENDING' | 'DONE') {
  const tasks = await prisma.task.findMany({
    where: { planId, ...(status ? { status } : {}) },
    orderBy: { dueDate: 'asc' },
  });
  return tasks.map((task) => fromDbDate(task.dueDate));
}

async function setup() {
  const iveth = await createAdminWithHousehold('Iveth');
  const luis = await addMember(iveth, 'Luis', 'MEMBER');
  return { iveth, luis };
}

describe('crear plan (PL-01, PL-05)', () => {
  it('«Sacar la basura · miércoles y sábado» genera ya lo que queda de esta semana', async () => {
    const { iveth, luis } = await setup();

    const plan = await createPlan(iveth, {
      title: 'Sacar la basura',
      weekdays: ['SAT', 'WED'],
      assigneeId: membershipIdOf(luis),
      priority: 'HIGH',
    });

    expect(plan).toMatchObject({
      title: 'Sacar la basura',
      weekdays: ['WED', 'SAT'],
      isActive: true,
      assignee: { displayName: 'Luis' },
    });
    expect(await planTaskDays(plan.id)).toEqual(expectedDays(['WED', 'SAT']));

    const tasks = await prisma.task.findMany({ where: { planId: plan.id } });
    for (const task of tasks) {
      expect(task).toMatchObject({ origin: 'PLAN', priority: 'HIGH', status: 'PENDING' });
      expect(task.assigneeId).toBe(membershipIdOf(luis));
    }
  });

  it('calcula el próximo día del plan', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });
    expect(plan.nextDueDate).toBe(today());
  });

  it('solo los admins crean planes; todos los ven', async () => {
    const { iveth, luis } = await setup();
    await createPlan(iveth, { title: 'Plan', weekdays: ['MON'], assigneeId: null });

    await request(app)
      .post('/api/v1/plans')
      .set(luis.auth)
      .send({ title: 'X', weekdays: ['MON'], assigneeId: null })
      .expect(403);
    const list = await request(app).get('/api/v1/plans').set(luis.auth);
    expect(list.body.items).toHaveLength(1);
  });

  it('valida días y responsable', async () => {
    const { iveth } = await setup();
    const otro = await createAdminWithHousehold('Otro', 'Otra casa');

    const noDays = await request(app)
      .post('/api/v1/plans')
      .set(iveth.auth)
      .send({ title: 'X', weekdays: [], assigneeId: null });
    expect(noDays.body.error.details.weekdays).toBeDefined();

    const foreign = await request(app)
      .post('/api/v1/plans')
      .set(iveth.auth)
      .send({ title: 'X', weekdays: ['MON'], assigneeId: membershipIdOf(otro) });
    expect(foreign.status).toBe(400);
  });
});

describe('idempotencia (PL-03)', () => {
  it('generar varias veces la misma semana no duplica tareas', async () => {
    const { iveth, luis } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });

    await request(app).get('/api/v1/tasks/mine').set(luis.auth);
    await request(app).get('/api/v1/tasks/board').set(iveth.auth);
    await generateCurrentWeekForAllHouseholds();

    expect(await planTaskDays(plan.id)).toEqual(expectedDays(ALL_DAYS));
  });

  it('una tarea de plan borrada a mano no reaparece esa semana', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });
    const [first] = await prisma.task.findMany({ where: { planId: plan.id } });
    await request(app).delete(`/api/v1/tasks/${first?.id}`).set(iveth.auth).expect(204);

    await request(app).get('/api/v1/tasks/board').set(iveth.auth);
    await generateCurrentWeekForAllHouseholds();

    expect(await planTaskDays(plan.id)).not.toContain(fromDbDate(first?.dueDate ?? new Date()));
  });
});

describe('generación perezosa (PL-04)', () => {
  it('al abrir semanas futuras del tablero se generan, hasta 4 semanas adelante', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Lunes', weekdays: ['MON'], assigneeId: null });
    const thisWeek = startOfWeek(today(), 'MON');

    for (const weeks of [1, 4, 5]) {
      await request(app)
        .get(`/api/v1/tasks/board?week=${addDays(thisWeek, 7 * weeks)}`)
        .set(iveth.auth)
        .expect(200);
    }

    const days = await planTaskDays(plan.id);
    expect(days).toContain(addDays(thisWeek, 7));
    expect(days).toContain(addDays(thisWeek, 28));
    expect(days).not.toContain(addDays(thisWeek, 35));
  });

  it('nunca genera semanas pasadas', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });

    await request(app)
      .get(`/api/v1/tasks/board?week=${addDays(today(), -7)}`)
      .set(iveth.auth)
      .expect(200);

    expect((await planTaskDays(plan.id)).every((day) => day >= today())).toBe(true);
  });
});

describe('editar, desactivar y eliminar', () => {
  it('cambiar los días rehace las pendientes futuras y conserva las completadas', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });
    const [todayTask] = await prisma.task.findMany({
      where: { planId: plan.id, dueDate: new Date(`${today()}T00:00:00Z`) },
    });
    await request(app).post(`/api/v1/tasks/${todayTask?.id}/complete`).set(iveth.auth).expect(200);

    const res = await request(app)
      .patch(`/api/v1/plans/${plan.id}`)
      .set(iveth.auth)
      .send({ weekdays: ['SUN'], title: 'Solo domingos' });
    expect(res.status).toBe(200);

    expect(await planTaskDays(plan.id, 'DONE')).toEqual([today()]);
    const pending = await prisma.task.findMany({ where: { planId: plan.id, status: 'PENDING' } });
    expect(pending.map((task) => fromDbDate(task.dueDate))).toEqual(
      expectedDays(['SUN']).filter((day) => day !== today()),
    );
    expect(pending.every((task) => task.title === 'Solo domingos')).toBe(true);
  });

  it('desactivar quita pendientes futuras; reactivar las vuelve a generar', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });

    const off = await request(app)
      .patch(`/api/v1/plans/${plan.id}/status`)
      .set(iveth.auth)
      .send({ isActive: false });
    expect(off.body).toMatchObject({ isActive: false, nextDueDate: null });
    expect(await planTaskDays(plan.id)).toEqual([]);

    await request(app)
      .patch(`/api/v1/plans/${plan.id}/status`)
      .set(iveth.auth)
      .send({ isActive: true })
      .expect(200);
    expect(await planTaskDays(plan.id)).toEqual(expectedDays(ALL_DAYS));
  });

  it('eliminar el plan conserva el historial y quita lo pendiente', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });
    const [todayTask] = await prisma.task.findMany({
      where: { planId: plan.id, dueDate: new Date(`${today()}T00:00:00Z`) },
    });
    await request(app).post(`/api/v1/tasks/${todayTask?.id}/complete`).set(iveth.auth);

    await request(app).delete(`/api/v1/plans/${plan.id}`).set(iveth.auth).expect(204);

    const remaining = await prisma.task.findMany({ where: { title: 'Diario' } });
    expect(remaining).toHaveLength(1);
    expect(remaining[0]).toMatchObject({ status: 'DONE', planId: null, origin: 'PLAN' });
  });

  it('el detalle muestra las próximas tareas del plan', async () => {
    const { iveth } = await setup();
    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });

    const res = await request(app).get(`/api/v1/plans/${plan.id}`).set(iveth.auth);
    const detail = planDetailSchema.parse(res.body);
    expect(detail.upcoming[0]?.dueDate).toBe(today());
  });
});

describe('vigencia y calendario del hogar', () => {
  it('respeta la fecha de inicio y fin del plan', async () => {
    const { iveth } = await setup();
    const tomorrow = addDays(today(), 1);
    const plan = await createPlan(iveth, {
      title: 'Solo mañana',
      weekdays: ALL_DAYS,
      assigneeId: null,
      startsOn: tomorrow,
      endsOn: tomorrow,
    });

    const weekEnd = addDays(startOfWeek(today(), 'MON'), 6);
    expect(await planTaskDays(plan.id)).toEqual(tomorrow <= weekEnd ? [tomorrow] : []);
    expect(plan.nextDueDate).toBe(tomorrow);
  });

  it('con semana de domingo a sábado, genera los días de esa semana', async () => {
    const { iveth } = await setup();
    await request(app)
      .patch('/api/v1/households/current')
      .set(iveth.auth)
      .send({ weekStartsOn: 'SUN' })
      .expect(200);

    const plan = await createPlan(iveth, { title: 'Diario', weekdays: ALL_DAYS, assigneeId: null });

    const sunday = startOfWeek(today(), 'SUN');
    const expected = Array.from({ length: 7 }, (_, i) => addDays(sunday, i)).filter(
      (day) => day >= today(),
    );
    expect(await planTaskDays(plan.id)).toEqual(expected);
  });

  it('desactivar al responsable deja el plan sin asignar (PL-08)', async () => {
    const { iveth, luis } = await setup();
    const plan = await createPlan(iveth, {
      title: 'Basura',
      weekdays: ['WED'],
      assigneeId: membershipIdOf(luis),
    });

    await request(app)
      .patch(`/api/v1/members/${membershipIdOf(luis)}/status`)
      .set(iveth.auth)
      .send({ isActive: false })
      .expect(200);

    const list = await request(app).get('/api/v1/plans').set(iveth.auth);
    expect(list.body.items.find((p: { id: string }) => p.id === plan.id).assignee).toBeNull();
  });
});

describe('job semanal (PL-02)', () => {
  it('genera la semana actual de todos los hogares', async () => {
    const { iveth } = await setup();
    const otro = await createAdminWithHousehold('Otro', 'Otra casa');
    const a = await createPlan(iveth, { title: 'A', weekdays: ALL_DAYS, assigneeId: null });
    const b = await createPlan(otro, { title: 'B', weekdays: ALL_DAYS, assigneeId: null });
    // Simula una semana nueva sin generar: se olvidan las tareas y las semanas registradas.
    await prisma.task.deleteMany({});
    await prisma.planMaterialization.deleteMany({});

    const created = await generateCurrentWeekForAllHouseholds();

    expect(created).toBe(expectedDays(ALL_DAYS).length * 2);
    expect(await planTaskDays(a.id)).toEqual(expectedDays(ALL_DAYS));
    expect(await planTaskDays(b.id)).toEqual(expectedDays(ALL_DAYS));
  });
});
