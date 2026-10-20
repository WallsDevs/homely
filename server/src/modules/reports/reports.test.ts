import {
  addDays,
  historySchema,
  startOfWeek,
  todayIn,
  weeklyReportSchema,
  type Category,
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
import { prisma } from '../../lib/prisma.ts';

beforeEach(resetDb);

const today = () => todayIn('America/Bogota');
const thisWeek = () => startOfWeek(today(), 'MON');
const lastWeek = () => addDays(thisWeek(), -7);
const twoWeeksAgo = () => addDays(thisWeek(), -14);

async function task(
  admin: TestUser,
  title: string,
  assignee: TestUser | null,
  dueDate: string,
  outcome: 'DONE' | 'SKIPPED' | 'PENDING' = 'PENDING',
) {
  const res = await request(app)
    .post('/api/v1/tasks')
    .set(admin.auth)
    .send({ title, assigneeId: assignee ? membershipIdOf(assignee) : null, dueDate });
  expect(res.status).toBe(201);
  if (outcome === 'DONE') {
    await request(app).post(`/api/v1/tasks/${res.body.id}/complete`).set(admin.auth).expect(200);
  }
  if (outcome === 'SKIPPED') {
    await request(app).post(`/api/v1/tasks/${res.body.id}/skip`).set(admin.auth).expect(200);
  }
  return res.body.id as string;
}

async function foodCategory(user: TestUser) {
  const res = await request(app).get('/api/v1/categories').set(user.auth);
  return (res.body.items as Category[]).find((c) => c.name === 'Comida')?.id ?? '';
}

async function setup() {
  const iveth = await createAdminWithHousehold('Iveth', 'Casa');
  const luis = await addMember(iveth, 'Luis', 'MEMBER');
  return { iveth, luis };
}

describe('reporte semanal (RP-01, RP-02, RP-03, RP-05)', () => {
  it('cuenta por hogar y por miembro; las omitidas no penalizan', async () => {
    const { iveth, luis } = await setup();
    const day = addDays(lastWeek(), 2);
    await task(iveth, 'Basura', luis, day, 'DONE');
    await task(iveth, 'Basura', luis, addDays(day, 3), 'PENDING');
    await task(iveth, 'Platos', iveth, day, 'DONE');
    await task(iveth, 'Platos', iveth, addDays(day, 1), 'DONE');
    await task(iveth, 'Regar', iveth, addDays(day, 2), 'SKIPPED');

    const res = await request(app).get(`/api/v1/reports/weekly?week=${day}`).set(luis.auth);
    const report = weeklyReportSchema.parse(res.body);

    expect(report).toMatchObject({ weekStart: lastWeek(), isClosed: true });
    expect(report.household).toMatchObject({ assigned: 5, done: 3, pending: 1, skipped: 1 });
    expect(report.household.rate).toBeCloseTo(3 / 4);

    const byName = Object.fromEntries(report.members.map((m) => [m.member.displayName, m]));
    expect(byName['Iveth']).toMatchObject({ assigned: 3, done: 2, skipped: 1, rate: 1 });
    expect(byName['Luis']).toMatchObject({ assigned: 2, done: 1, pending: 1, rate: 0.5 });
  });

  it('compara con la semana anterior y cuenta rachas de semanas al 100 %', async () => {
    const { iveth, luis } = await setup();
    // Hace dos semanas: Iveth 100 %, Luis 0 %. La semana pasada: ambos 100 %.
    await task(iveth, 'A', iveth, addDays(twoWeeksAgo(), 1), 'DONE');
    await task(iveth, 'B', luis, addDays(twoWeeksAgo(), 1), 'PENDING');
    await task(iveth, 'C', iveth, addDays(lastWeek(), 1), 'DONE');
    await task(iveth, 'D', luis, addDays(lastWeek(), 1), 'DONE');

    const res = await request(app).get(`/api/v1/reports/weekly?week=${lastWeek()}`).set(iveth.auth);
    const report = weeklyReportSchema.parse(res.body);
    const byName = Object.fromEntries(report.members.map((m) => [m.member.displayName, m]));

    expect(byName['Luis']).toMatchObject({ rate: 1, deltaRate: 1, streak: 1 });
    expect(byName['Iveth']).toMatchObject({ rate: 1, deltaRate: 0, streak: 2 });
    expect(report.household.deltaRate).toBeCloseTo(0.5);
  });

  it('la semana en curso no cuenta para la racha y se marca abierta', async () => {
    const { iveth } = await setup();
    await task(iveth, 'A', iveth, addDays(lastWeek(), 1), 'DONE');
    await task(iveth, 'Hoy', iveth, today(), 'PENDING');

    const report = weeklyReportSchema.parse(
      (await request(app).get('/api/v1/reports/weekly').set(iveth.auth)).body,
    );
    expect(report.isClosed).toBe(false);
    expect(report.members[0]).toMatchObject({ streak: 1, pending: 1 });
  });

  it('incluye los gastos de esa semana', async () => {
    const { iveth } = await setup();
    const food = await foodCategory(iveth);
    await request(app)
      .post('/api/v1/expenses')
      .set(iveth.auth)
      .send({ amount: '45', categoryId: food, date: addDays(lastWeek(), 1) });

    const report = weeklyReportSchema.parse(
      (await request(app).get(`/api/v1/reports/weekly?week=${lastWeek()}`).set(iveth.auth)).body,
    );
    expect(report.expenses).toMatchObject({ period: 'WEEKLY', total: '45.00' });
  });
});

describe('tareas más incumplidas (RP-04)', () => {
  it('agrupa por título las pendientes ya vencidas; ignora el futuro', async () => {
    const { iveth, luis } = await setup();
    await task(iveth, 'Sacar la basura', luis, addDays(lastWeek(), 2));
    await task(iveth, 'Sacar la basura', luis, addDays(lastWeek(), 5));
    await task(iveth, 'Aspirar', luis, addDays(lastWeek(), 5));
    await task(iveth, 'Aspirar', iveth, addDays(lastWeek(), 4));
    await task(iveth, 'Hecha', luis, addDays(lastWeek(), 1), 'DONE');
    await task(iveth, 'Futura', luis, addDays(today(), 3));

    const from = twoWeeksAgo();
    const to = addDays(today(), 7);
    const all = await request(app)
      .get(`/api/v1/reports/tasks/top-missed?from=${from}&to=${to}`)
      .set(iveth.auth);
    expect(all.body.items).toEqual([
      { title: 'Aspirar', missed: 2 },
      { title: 'Sacar la basura', missed: 2 },
    ]);

    const luisOnly = await request(app)
      .get(
        `/api/v1/reports/tasks/top-missed?from=${from}&to=${to}&memberId=${membershipIdOf(luis)}`,
      )
      .set(iveth.auth);
    expect(luisOnly.body.items[0]).toEqual({ title: 'Sacar la basura', missed: 2 });
  });
});

describe('historial anual (RP-10, RP-11)', () => {
  // Semanas fijas ya pasadas (lunes 2 y 9 de marzo de 2026): el test no depende de la fecha actual.
  it('semana a semana del miembro, con lo que dejó sin hacer', async () => {
    const { iveth, luis } = await setup();
    await task(iveth, 'Platos', luis, '2026-03-03', 'DONE');
    await task(iveth, 'Basura', luis, '2026-03-11', 'PENDING');
    await task(iveth, 'Basura', luis, '2026-03-14', 'DONE');
    await task(iveth, 'De Iveth', iveth, '2026-03-11', 'PENDING');

    const res = await request(app)
      .get(`/api/v1/reports/tasks/history?memberId=${membershipIdOf(luis)}&year=2026`)
      .set(iveth.auth);
    const history = historySchema.parse(res.body);

    expect(history).toMatchObject({ year: 2026, member: { displayName: 'Luis' } });
    expect(history.availableYears).toContain(2026);
    expect(history.weeks.map((w) => w.weekStart)).toEqual(['2026-03-09', '2026-03-02']);
    expect(history.weeks[0]).toMatchObject({ assigned: 2, done: 1, rate: 0.5, missed: ['Basura'] });
    expect(history.weeks[1]).toMatchObject({ assigned: 1, done: 1, rate: 1, missed: [] });
    expect(history.totals).toMatchObject({
      assigned: 3,
      done: 2,
      pending: 1,
      perfectWeeks: 1,
      weeksWithTasks: 2,
    });
  });

  it('no muestra miembros de otro hogar', async () => {
    const { luis } = await setup();
    const otro = await createAdminWithHousehold('Otro', 'Otra casa');
    const res = await request(app)
      .get(`/api/v1/reports/tasks/history?memberId=${membershipIdOf(luis)}`)
      .set(otro.auth);
    expect(res.status).toBe(404);
  });
});

describe('limpieza de datos (RP-12 … RP-15)', () => {
  async function seedOldData(iveth: TestUser) {
    const food = await foodCategory(iveth);
    const old = addDays(thisWeek(), -60);
    await task(iveth, 'Vieja', iveth, old, 'DONE');
    await task(iveth, 'Vieja pendiente', iveth, addDays(old, 1));
    await task(iveth, 'Reciente', iveth, addDays(lastWeek(), 1), 'DONE');
    for (const [amount, date] of [
      ['100', old],
      ['20.50', addDays(old, 2)],
      ['33', addDays(lastWeek(), 1)],
    ] as const) {
      await request(app)
        .post('/api/v1/expenses')
        .set(iveth.auth)
        .send({ amount, categoryId: food, date })
        .expect(201);
    }
    return { from: addDays(old, -1), to: addDays(old, 5) };
  }

  it('previsualiza, exige el nombre del hogar y borra solo el rango', async () => {
    const { iveth } = await setup();
    const range = await seedOldData(iveth);
    await prisma.taskPlan.create({
      data: { householdId: iveth.session.household?.id ?? '', title: 'Plan', weekdays: ['MON'] },
    });

    const preview = await request(app)
      .post('/api/v1/maintenance/purge/preview')
      .set(iveth.auth)
      .send(range);
    expect(preview.body).toEqual({ tasks: 2, expenses: 2, amount: '120.50' });

    const wrongName = await request(app)
      .post('/api/v1/maintenance/purge')
      .set(iveth.auth)
      .send({ ...range, confirmation: 'Otra' });
    expect(wrongName.status).toBe(400);
    expect(wrongName.body.error.details.confirmation).toBeDefined();

    // Mayúsculas y espacios no importan.
    const done = await request(app)
      .post('/api/v1/maintenance/purge')
      .set(iveth.auth)
      .send({ ...range, confirmation: '  casa ' });
    expect(done.body).toEqual({ tasks: 2, expenses: 2, amount: '120.50' });

    expect(await prisma.task.findMany({ select: { title: true } })).toEqual([
      { title: 'Reciente' },
    ]);
    expect(await prisma.expense.count()).toBe(1);
    expect(await prisma.taskPlan.count()).toBe(1);
    expect(await prisma.expenseCategory.count()).toBe(9);

    const log = await request(app).get('/api/v1/maintenance/audit-log').set(iveth.auth);
    expect(log.body.items[0]).toMatchObject({
      action: 'DATA_PURGE',
      actor: { displayName: 'Iveth' },
      metadata: { from: range.from, to: range.to, tasks: 2, expenses: 2 },
    });
  });

  it('no permite borrar la semana actual ni el futuro', async () => {
    const { iveth } = await setup();
    for (const range of [
      { from: lastWeek(), to: thisWeek() },
      { from: addDays(today(), 1), to: addDays(today(), 10) },
    ]) {
      const res = await request(app)
        .post('/api/v1/maintenance/purge/preview')
        .set(iveth.auth)
        .send(range);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_RANGE');
    }
  });

  it('solo los admins', async () => {
    const { luis } = await setup();
    const res = await request(app)
      .post('/api/v1/maintenance/purge/preview')
      .set(luis.auth)
      .send({ from: '2025-01-01', to: '2025-12-31' });
    expect(res.status).toBe(403);
  });
});
