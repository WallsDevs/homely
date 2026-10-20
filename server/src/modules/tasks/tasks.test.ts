import { addDays, boardSchema, myTasksSchema, taskSchema, todayIn } from '@homely/shared';
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

// Los hogares de test usan America/Bogota (ver tests/helpers.ts).
const today = () => todayIn('America/Bogota');

async function createTask(
  admin: TestUser,
  body: { title: string; assigneeId: string | null; dueDate: string; priority?: string },
) {
  const res = await request(app).post('/api/v1/tasks').set(admin.auth).send(body);
  expect(res.status).toBe(201);
  return taskSchema.parse(res.body);
}

async function setup() {
  const iveth = await createAdminWithHousehold('Iveth');
  const luis = await addMember(iveth, 'Luis', 'MEMBER');
  return { iveth, luis };
}

describe('crear tareas (TK-01)', () => {
  it('un admin crea y asigna, incluso a sí mismo', async () => {
    const { iveth, luis } = await setup();

    const forLuis = await createTask(iveth, {
      title: 'Comprar pan',
      assigneeId: membershipIdOf(luis),
      dueDate: today(),
      priority: 'HIGH',
    });
    const forMe = await createTask(iveth, {
      title: 'Pagar internet',
      assigneeId: membershipIdOf(iveth),
      dueDate: today(),
    });

    expect(forLuis).toMatchObject({
      title: 'Comprar pan',
      status: 'PENDING',
      origin: 'MANUAL',
      priority: 'HIGH',
      assignee: { displayName: 'Luis' },
      isOverdue: false,
    });
    expect(forMe.assignee?.displayName).toBe('Iveth');
    expect(forMe.priority).toBe('MEDIUM');
  });

  it('un miembro no puede crear tareas', async () => {
    const { luis } = await setup();
    const res = await request(app)
      .post('/api/v1/tasks')
      .set(luis.auth)
      .send({ title: 'X', assigneeId: null, dueDate: today() });
    expect(res.status).toBe(403);
  });

  it('no asigna a miembros de otro hogar ni a inactivos', async () => {
    const { iveth } = await setup();
    const otro = await createAdminWithHousehold('Otro', 'Otra casa');

    const res = await request(app)
      .post('/api/v1/tasks')
      .set(iveth.auth)
      .send({ title: 'X', assigneeId: membershipIdOf(otro), dueDate: today() });

    expect(res.status).toBe(400);
    expect(res.body.error.details.assigneeId).toBeDefined();
  });

  it('valida título y fecha', async () => {
    const { iveth } = await setup();
    const res = await request(app)
      .post('/api/v1/tasks')
      .set(iveth.auth)
      .send({ title: '  ', assigneeId: null, dueDate: '19/10/2026' });
    expect(res.status).toBe(400);
    expect(Object.keys(res.body.error.details)).toEqual(
      expect.arrayContaining(['title', 'dueDate']),
    );
  });
});

describe('completar (TK-03, TK-04)', () => {
  it('el asignado completa y deshace; queda registro de quién y cuándo', async () => {
    const { iveth, luis } = await setup();
    const task = await createTask(iveth, {
      title: 'Sacar la basura',
      assigneeId: membershipIdOf(luis),
      dueDate: today(),
    });

    const done = await request(app).post(`/api/v1/tasks/${task.id}/complete`).set(luis.auth);
    expect(done.status).toBe(200);
    expect(done.body).toMatchObject({ status: 'DONE', completedBy: { displayName: 'Luis' } });
    expect(done.body.completedAt).toBeTruthy();

    const undone = await request(app).post(`/api/v1/tasks/${task.id}/uncomplete`).set(luis.auth);
    expect(undone.body).toMatchObject({ status: 'PENDING', completedBy: null, completedAt: null });
  });

  it('otro miembro no puede completar una tarea ajena', async () => {
    const { iveth, luis } = await setup();
    const task = await createTask(iveth, {
      title: 'Mía',
      assigneeId: membershipIdOf(iveth),
      dueDate: today(),
    });

    const res = await request(app).post(`/api/v1/tasks/${task.id}/complete`).set(luis.auth);
    expect(res.status).toBe(403);
  });

  it('un admin completa una tarea ajena y queda registrado que fue el admin', async () => {
    const { iveth, luis } = await setup();
    const task = await createTask(iveth, {
      title: 'De Luis',
      assigneeId: membershipIdOf(luis),
      dueDate: today(),
    });

    const res = await request(app).post(`/api/v1/tasks/${task.id}/complete`).set(iveth.auth);
    expect(res.body.completedBy.displayName).toBe('Iveth');
    expect(res.body.assignee.displayName).toBe('Luis');
  });

  it('solo un admin puede omitir; omitir limpia el completado', async () => {
    const { iveth, luis } = await setup();
    const task = await createTask(iveth, {
      title: 'Regar plantas',
      assigneeId: membershipIdOf(luis),
      dueDate: today(),
    });

    await request(app).post(`/api/v1/tasks/${task.id}/skip`).set(luis.auth).expect(403);
    const res = await request(app).post(`/api/v1/tasks/${task.id}/skip`).set(iveth.auth);
    expect(res.body.status).toBe('SKIPPED');
  });
});

describe('mis tareas (TK-05, TK-06)', () => {
  it('separa vencidas, hoy y resto de la semana; las vencidas se marcan', async () => {
    const { iveth, luis } = await setup();
    const luisId = membershipIdOf(luis);
    await createTask(iveth, {
      title: 'Vencida',
      assigneeId: luisId,
      dueDate: addDays(today(), -3),
    });
    await createTask(iveth, { title: 'De hoy', assigneeId: luisId, dueDate: today() });
    await createTask(iveth, {
      title: 'De Iveth',
      assigneeId: membershipIdOf(iveth),
      dueDate: today(),
    });
    const doneLate = await createTask(iveth, {
      title: 'Hecha tarde',
      assigneeId: luisId,
      dueDate: addDays(today(), -2),
    });
    await request(app).post(`/api/v1/tasks/${doneLate.id}/complete`).set(luis.auth);

    const res = await request(app).get('/api/v1/tasks/mine').set(luis.auth);
    const mine = myTasksSchema.parse(res.body);

    expect(mine.date).toBe(today());
    expect(mine.overdue.map((t) => t.title)).toEqual(['Vencida']);
    expect(mine.overdue[0]?.isOverdue).toBe(true);
    expect(mine.today.map((t) => t.title)).toEqual(['De hoy']);
    expect(mine.upcoming.every((t) => t.dueDate > today() && t.dueDate <= mine.weekEnd)).toBe(true);
  });
});

describe('tablero semanal (TK-07)', () => {
  it('una columna por miembro activo (aunque no tenga tareas) y otra para sin asignar', async () => {
    const { iveth, luis } = await setup();
    await addMember(iveth, 'Ana', 'MEMBER');
    const done = await createTask(iveth, {
      title: 'A',
      assigneeId: membershipIdOf(luis),
      dueDate: today(),
    });
    await createTask(iveth, { title: 'B', assigneeId: membershipIdOf(luis), dueDate: today() });
    await createTask(iveth, { title: 'Sin dueño', assigneeId: null, dueDate: today() });
    await request(app).post(`/api/v1/tasks/${done.id}/complete`).set(luis.auth);

    const res = await request(app).get('/api/v1/tasks/board').set(iveth.auth);
    const board = boardSchema.parse(res.body);

    expect(board.columns.map((c) => c.member?.displayName ?? 'Sin asignar')).toEqual([
      'Iveth',
      'Luis',
      'Ana',
      'Sin asignar',
    ]);
    const luisColumn = board.columns[1];
    expect(luisColumn).toMatchObject({ total: 2, done: 1 });
    expect(luisColumn?.tasks[0]?.status).toBe('PENDING');
  });

  it('navega a otras semanas', async () => {
    const { iveth } = await setup();
    await createTask(iveth, {
      title: 'Próxima semana',
      assigneeId: null,
      dueDate: addDays(today(), 7),
    });

    const now = boardSchema.parse(
      (await request(app).get('/api/v1/tasks/board').set(iveth.auth)).body,
    );
    const next = boardSchema.parse(
      (
        await request(app)
          .get(`/api/v1/tasks/board?week=${addDays(today(), 7)}`)
          .set(iveth.auth)
      ).body,
    );

    expect(next.weekStart).toBe(addDays(now.weekStart, 7));
    expect(next.columns.flatMap((c) => c.tasks).map((t) => t.title)).toEqual(['Próxima semana']);
  });
});

describe('listado con filtros (TK-08)', () => {
  it('filtra por estado, asignado y texto, y pagina por cursor', async () => {
    const { iveth, luis } = await setup();
    const luisId = membershipIdOf(luis);
    for (let i = 0; i < 5; i++) {
      await createTask(iveth, {
        title: `Limpiar ${i}`,
        assigneeId: luisId,
        dueDate: addDays(today(), i),
      });
    }
    await createTask(iveth, { title: 'Sin dueño', assigneeId: null, dueDate: today() });

    const unassigned = await request(app).get('/api/v1/tasks?assigneeId=none').set(iveth.auth);
    expect(unassigned.body.items.map((t: { title: string }) => t.title)).toEqual(['Sin dueño']);

    const search = await request(app).get('/api/v1/tasks?q=LIMPIAR&status=PENDING').set(iveth.auth);
    expect(search.body.items).toHaveLength(5);

    const page1 = await request(app)
      .get(`/api/v1/tasks?assigneeId=${luisId}&limit=2`)
      .set(iveth.auth);
    const page2 = await request(app)
      .get(`/api/v1/tasks?assigneeId=${luisId}&limit=2&cursor=${page1.body.nextCursor}`)
      .set(iveth.auth);
    expect(page1.body.items.map((t: { title: string }) => t.title)).toEqual([
      'Limpiar 0',
      'Limpiar 1',
    ]);
    expect(page2.body.items.map((t: { title: string }) => t.title)).toEqual([
      'Limpiar 2',
      'Limpiar 3',
    ]);
  });

  it('rechaza estados inexistentes', async () => {
    const { iveth } = await setup();
    const res = await request(app).get('/api/v1/tasks?status=PENDING,NOPE').set(iveth.auth);
    expect(res.status).toBe(400);
  });
});

describe('editar y eliminar (TK-02)', () => {
  it('un admin edita y elimina; un miembro no', async () => {
    const { iveth, luis } = await setup();
    const task = await createTask(iveth, {
      title: 'Original',
      assigneeId: membershipIdOf(luis),
      dueDate: today(),
    });

    await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .set(luis.auth)
      .send({ title: 'No' })
      .expect(403);

    const edited = await request(app)
      .patch(`/api/v1/tasks/${task.id}`)
      .set(iveth.auth)
      .send({ title: 'Editada', description: '', assigneeId: null });
    expect(edited.body).toMatchObject({ title: 'Editada', description: null, assignee: null });

    await request(app).delete(`/api/v1/tasks/${task.id}`).set(iveth.auth).expect(204);
    await request(app).get(`/api/v1/tasks/${task.id}`).set(iveth.auth).expect(404);
  });

  it('no se ven ni tocan tareas de otro hogar', async () => {
    const { iveth } = await setup();
    const otro = await createAdminWithHousehold('Otro', 'Otra casa');
    const task = await createTask(iveth, { title: 'Privada', assigneeId: null, dueDate: today() });

    await request(app).get(`/api/v1/tasks/${task.id}`).set(otro.auth).expect(404);
    await request(app).post(`/api/v1/tasks/${task.id}/complete`).set(otro.auth).expect(404);
    const list = await request(app).get('/api/v1/tasks').set(otro.auth);
    expect(list.body.items).toHaveLength(0);
  });
});
