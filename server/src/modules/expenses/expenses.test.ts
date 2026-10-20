import {
  addDays,
  expenseSchema,
  expenseSummarySchema,
  goalSchema,
  startOfMonth,
  todayIn,
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

beforeEach(resetDb);

const today = () => todayIn('America/Bogota');

async function categoryId(user: TestUser, name: string) {
  const res = await request(app).get('/api/v1/categories?includeArchived=true').set(user.auth);
  const category = (res.body.items as Category[]).find((c) => c.name === name);
  if (!category) throw new Error(`Sin categoría ${name}`);
  return category.id;
}

async function spend(user: TestUser, body: Record<string, unknown>) {
  const res = await request(app).post('/api/v1/expenses').set(user.auth).send(body);
  expect(res.status).toBe(201);
  return expenseSchema.parse(res.body);
}

async function setup() {
  const iveth = await createAdminWithHousehold('Iveth');
  const luis = await addMember(iveth, 'Luis', 'MEMBER');
  const food = await categoryId(iveth, 'Comida');
  const fuel = await categoryId(iveth, 'Transporte');
  return { iveth, luis, food, fuel };
}

describe('categorías (EX-04)', () => {
  it('el hogar nace con las categorías por defecto, en orden', async () => {
    const iveth = await createAdminWithHousehold();
    const res = await request(app).get('/api/v1/categories').set(iveth.auth);
    expect(res.body.items.map((c: Category) => c.name)).toEqual([
      'Comida',
      'Comida fuera',
      'Transporte',
      'Limpieza',
      'Mascotas',
      'Servicios',
      'Salud',
      'Ocio',
      'Otros',
    ]);
  });

  it('un admin crea, renombra y archiva; los nombres no se repiten', async () => {
    const { iveth } = await setup();
    const created = await request(app)
      .post('/api/v1/categories')
      .set(iveth.auth)
      .send({ name: 'Bebé', color: '#C86B9B', icon: 'baby' });
    expect(created.status).toBe(201);
    expect(created.body.sortOrder).toBe(9);

    const duplicate = await request(app)
      .post('/api/v1/categories')
      .set(iveth.auth)
      .send({ name: 'Comida', color: '#C86B9B', icon: 'baby' });
    expect(duplicate.status).toBe(409);

    await request(app)
      .patch(`/api/v1/categories/${created.body.id}`)
      .set(iveth.auth)
      .send({ isArchived: true })
      .expect(200);
    const visible = await request(app).get('/api/v1/categories').set(iveth.auth);
    expect(visible.body.items.map((c: Category) => c.name)).not.toContain('Bebé');
  });

  it('valida el icono y solo los admins cambian categorías', async () => {
    const { iveth, luis } = await setup();
    const badIcon = await request(app)
      .post('/api/v1/categories')
      .set(iveth.auth)
      .send({ name: 'X', color: '#C86B9B', icon: 'unicornio' });
    expect(badIcon.status).toBe(400);
    expect(badIcon.body.error.details.icon).toBeDefined();

    const asMember = await request(app)
      .post('/api/v1/categories')
      .set(luis.auth)
      .send({ name: 'X', color: '#C86B9B', icon: 'baby' });
    expect(asMember.status).toBe(403);
  });

  it('reordena', async () => {
    const { iveth, food, fuel } = await setup();
    const res = await request(app)
      .put('/api/v1/categories/order')
      .set(iveth.auth)
      .send({ ids: [fuel, food] });
    expect(res.body.items.slice(0, 2).map((c: Category) => c.name)).toEqual([
      'Transporte',
      'Comida',
    ]);
  });
});

describe('gastos (EX-01, EX-02, EX-03)', () => {
  it('cualquier miembro registra; por defecto pagó quien registra', async () => {
    const { luis, food } = await setup();
    const expense = await spend(luis, {
      amount: '60',
      categoryId: food,
      date: today(),
      description: 'Mercado semanal',
    });

    expect(expense).toMatchObject({
      amount: '60.00',
      description: 'Mercado semanal',
      category: { name: 'Comida', icon: 'shopping-cart' },
      paidBy: { displayName: 'Luis' },
      registeredBy: { displayName: 'Luis' },
      paymentMethod: null,
    });
  });

  it('no acepta categorías de otro hogar ni archivadas', async () => {
    const { iveth, food } = await setup();
    const otro = await createAdminWithHousehold('Otro', 'Otra casa');

    const foreign = await request(app)
      .post('/api/v1/expenses')
      .set(otro.auth)
      .send({ amount: '10', categoryId: food, date: today() });
    expect(foreign.status).toBe(400);
    expect(foreign.body.error.details.categoryId).toBeDefined();

    await request(app)
      .patch(`/api/v1/categories/${food}`)
      .set(iveth.auth)
      .send({ isArchived: true });
    await request(app)
      .post('/api/v1/expenses')
      .set(iveth.auth)
      .send({ amount: '10', categoryId: food, date: today() })
      .expect(400);
  });

  it('cada quien edita lo suyo; un admin edita cualquier gasto', async () => {
    const { iveth, luis, food } = await setup();
    const ivethExpense = await spend(iveth, { amount: '20', categoryId: food, date: today() });
    const luisExpense = await spend(luis, { amount: '30', categoryId: food, date: today() });

    await request(app)
      .patch(`/api/v1/expenses/${ivethExpense.id}`)
      .set(luis.auth)
      .send({ amount: '1' })
      .expect(403);
    await request(app).delete(`/api/v1/expenses/${ivethExpense.id}`).set(luis.auth).expect(403);

    const own = await request(app)
      .patch(`/api/v1/expenses/${luisExpense.id}`)
      .set(luis.auth)
      .send({ amount: '35.5', paymentMethod: 'CARD' });
    expect(own.body).toMatchObject({ amount: '35.50', paymentMethod: 'CARD' });

    await request(app).delete(`/api/v1/expenses/${luisExpense.id}`).set(iveth.auth).expect(204);
  });

  it('filtra y totaliza todo el filtro aunque la página sea corta', async () => {
    const { iveth, luis, food, fuel } = await setup();
    await spend(iveth, { amount: '10.10', categoryId: food, date: today() });
    await spend(luis, { amount: '20.20', categoryId: food, date: today() });
    await spend(iveth, { amount: '100', categoryId: fuel, date: today(), description: 'Gasolina' });
    await spend(iveth, { amount: '5', categoryId: food, date: addDays(today(), -40) });

    const page = await request(app)
      .get(`/api/v1/expenses?categoryId=${food}&from=${addDays(today(), -7)}&limit=1`)
      .set(iveth.auth);
    expect(page.body.items).toHaveLength(1);
    expect(page.body.nextCursor).toBeTruthy();
    expect(page.body.totals).toEqual({ count: 2, amount: '30.30' });

    const byPayer = await request(app)
      .get(`/api/v1/expenses?paidById=${membershipIdOf(luis)}`)
      .set(iveth.auth);
    expect(byPayer.body.totals.amount).toBe('20.20');

    const search = await request(app).get('/api/v1/expenses?q=gasol').set(iveth.auth);
    expect(search.body.items.map((e: { amount: string }) => e.amount)).toEqual(['100.00']);
  });

  it('suma con precisión decimal (0.10 + 0.20 = 0.30)', async () => {
    const { iveth, food } = await setup();
    await spend(iveth, { amount: '0.10', categoryId: food, date: today() });
    await spend(iveth, { amount: '0.20', categoryId: food, date: today() });

    const res = await request(app).get('/api/v1/expenses').set(iveth.auth);
    expect(res.body.totals.amount).toBe('0.30');
  });

  it('valida el monto', async () => {
    const { iveth, food } = await setup();
    for (const amount of ['0', '-5', '1.234', 'diez']) {
      const res = await request(app)
        .post('/api/v1/expenses')
        .set(iveth.auth)
        .send({ amount, categoryId: food, date: today() });
      expect(res.status).toBe(400);
      expect(res.body.error.details.amount).toBeDefined();
    }
  });
});

describe('metas (EX-05, EX-06)', () => {
  async function createGoal(user: TestUser, body: Record<string, unknown>) {
    const res = await request(app).post('/api/v1/goals').set(user.auth).send(body);
    expect(res.status).toBe(201);
    return goalSchema.parse(res.body);
  }

  async function goalStatus(user: TestUser) {
    const res = await request(app).get('/api/v1/goals').set(user.auth);
    return goalSchema.parse(res.body.items[0]);
  }

  it('meta mensual de comida: umbrales 80 % y 100 %', async () => {
    const { iveth, food } = await setup();
    await createGoal(iveth, { categoryId: food, period: 'MONTHLY', amount: '300' });

    await spend(iveth, { amount: '239.70', categoryId: food, date: today() });
    expect((await goalStatus(iveth)).progress).toMatchObject({ ratio: 0.799, status: 'OK' });

    await spend(iveth, { amount: '0.30', categoryId: food, date: today() });
    expect((await goalStatus(iveth)).progress).toMatchObject({ ratio: 0.8, status: 'WARNING' });

    await spend(iveth, { amount: '60', categoryId: food, date: today() });
    expect((await goalStatus(iveth)).progress).toMatchObject({ ratio: 1, status: 'WARNING' });

    await spend(iveth, { amount: '0.30', categoryId: food, date: today() });
    expect((await goalStatus(iveth)).progress).toMatchObject({
      spent: '300.30',
      status: 'EXCEEDED',
    });
  });

  it('solo cuenta el periodo actual y la categoría de la meta', async () => {
    const { iveth, food, fuel } = await setup();
    await createGoal(iveth, { categoryId: food, period: 'MONTHLY', amount: '100' });
    await spend(iveth, { amount: '50', categoryId: food, date: today() });
    await spend(iveth, { amount: '999', categoryId: fuel, date: today() });
    await spend(iveth, {
      amount: '999',
      categoryId: food,
      date: addDays(startOfMonth(today()), -1),
    });

    const goal = await goalStatus(iveth);
    expect(goal.progress).toMatchObject({
      spent: '50.00',
      ratio: 0.5,
      periodStart: startOfMonth(today()),
    });
  });

  it('la meta total suma todas las categorías; la semanal solo esta semana', async () => {
    const { iveth, food, fuel } = await setup();
    await createGoal(iveth, { categoryId: null, period: 'WEEKLY', amount: '200' });
    await spend(iveth, { amount: '60', categoryId: food, date: today() });
    await spend(iveth, { amount: '100', categoryId: fuel, date: today() });
    await spend(iveth, { amount: '500', categoryId: food, date: addDays(today(), -7) });

    const goal = await goalStatus(iveth);
    expect(goal.category).toBeNull();
    expect(goal.progress).toMatchObject({ spent: '160.00', status: 'WARNING' });
  });

  it('una meta activa por categoría y periodo; solo admins', async () => {
    const { iveth, luis, food } = await setup();
    await createGoal(iveth, { categoryId: food, period: 'MONTHLY', amount: '300' });

    const duplicate = await request(app)
      .post('/api/v1/goals')
      .set(iveth.auth)
      .send({ categoryId: food, period: 'MONTHLY', amount: '400' });
    expect(duplicate.body.error.code).toBe('DUPLICATE_GOAL');

    await createGoal(iveth, { categoryId: food, period: 'WEEKLY', amount: '80' });
    await request(app)
      .post('/api/v1/goals')
      .set(luis.auth)
      .send({ categoryId: null, period: 'MONTHLY', amount: '1' })
      .expect(403);
  });

  it('editar el monto recalcula el estado', async () => {
    const { iveth, food } = await setup();
    const goal = await createGoal(iveth, { categoryId: food, period: 'MONTHLY', amount: '100' });
    await spend(iveth, { amount: '90', categoryId: food, date: today() });

    const res = await request(app)
      .patch(`/api/v1/goals/${goal.id}`)
      .set(iveth.auth)
      .send({ amount: '200' });
    expect(res.body.progress).toMatchObject({ ratio: 0.45, status: 'OK' });

    await request(app).delete(`/api/v1/goals/${goal.id}`).set(iveth.auth).expect(204);
    const list = await request(app).get('/api/v1/goals').set(iveth.auth);
    expect(list.body.items).toHaveLength(0);
  });
});

describe('resumen (EX-07, EX-08)', () => {
  it('total, por categoría y por quien pagó, comparado con el mes anterior', async () => {
    const { iveth, luis, food, fuel } = await setup();
    await spend(iveth, { amount: '60', categoryId: food, date: today() });
    await spend(luis, { amount: '100', categoryId: fuel, date: today() });
    await spend(luis, { amount: '40', categoryId: food, date: today() });
    await spend(iveth, {
      amount: '150',
      categoryId: food,
      date: addDays(startOfMonth(today()), -1),
    });
    await request(app)
      .post('/api/v1/goals')
      .set(iveth.auth)
      .send({ categoryId: food, period: 'MONTHLY', amount: '100' });

    const res = await request(app).get('/api/v1/expenses/summary').set(luis.auth);
    const summary = expenseSummarySchema.parse(res.body);

    expect(summary).toMatchObject({
      period: 'MONTHLY',
      periodStart: startOfMonth(today()),
      total: '200.00',
      previousTotal: '150.00',
    });
    expect(summary.byCategory.map((c) => [c.category.name, c.amount])).toEqual([
      ['Comida', '100.00'],
      ['Transporte', '100.00'],
    ]);
    expect(summary.byPayer.map((p) => [p.member?.displayName, p.amount])).toEqual([
      ['Luis', '140.00'],
      ['Iveth', '60.00'],
    ]);
    expect(summary.goals[0]?.progress.status).toBe('WARNING');
  });
});
