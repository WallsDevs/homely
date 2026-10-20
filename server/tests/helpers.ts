import type { AuthResponse, Session } from '@homely/shared';
import request from 'supertest';
import { expect } from 'vitest';
import { createApp } from '../src/app.ts';
import { prisma } from '../src/lib/prisma.ts';

export const app = createApp();

const TABLES = [
  'AuditLog',
  'Expense',
  'BudgetGoal',
  'ExpenseCategory',
  'Task',
  'TaskPlan',
  'Invitation',
  'Membership',
  'Household',
  'RefreshToken',
  'User',
];

/** Vacía la BD de test. Se llama en `beforeEach` de cada suite de integración. */
export async function resetDb(): Promise<void> {
  const list = TABLES.map((table) => `"${table}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${list} RESTART IDENTITY CASCADE`);
}

export type TestUser = {
  token: string;
  cookie: string;
  session: Session;
  auth: { Authorization: string };
};

export function refreshCookieFrom(res: request.Response): string {
  const header = res.headers['set-cookie'] as unknown;
  const cookies = Array.isArray(header) ? (header as string[]) : [];
  const cookie = cookies.find((value) => value.startsWith('homely_rt='));
  if (!cookie) throw new Error('La respuesta no trae cookie de refresh');
  return cookie.split(';')[0] ?? '';
}

export async function registerUser(name: string, email = `${name.toLowerCase()}@test.dev`) {
  const res = await request(app)
    .post('/api/v1/auth/register')
    .send({ name, email, password: 'contraseña-segura' });
  expect(res.status).toBe(201);
  const body = res.body as AuthResponse;
  return toTestUser(body, refreshCookieFrom(res));
}

function toTestUser(body: AuthResponse, cookie: string): TestUser {
  return {
    token: body.accessToken,
    cookie,
    session: body.session,
    auth: { Authorization: `Bearer ${body.accessToken}` },
  };
}

/** Registra un usuario y le crea un hogar. Queda como ADMIN. */
export async function createAdminWithHousehold(name = 'Iveth', householdName = 'Casa') {
  const user = await registerUser(name);
  const res = await request(app)
    .post('/api/v1/households')
    .set(user.auth)
    .send({ name: householdName, timezone: 'America/Bogota' });
  expect(res.status).toBe(201);
  return { ...user, session: res.body as Session };
}

export async function createInvitation(admin: TestUser, role: 'ADMIN' | 'MEMBER', maxUses = 1) {
  const res = await request(app)
    .post('/api/v1/invitations')
    .set(admin.auth)
    .send({ role, maxUses });
  expect(res.status).toBe(201);
  return res.body as { id: string; code: string };
}

/** Registra un usuario y lo une al hogar del admin con el rol indicado. */
export async function addMember(admin: TestUser, name: string, role: 'ADMIN' | 'MEMBER') {
  const invitation = await createInvitation(admin, role);
  const user = await registerUser(name);
  const res = await request(app)
    .post('/api/v1/households/join')
    .set(user.auth)
    .send({ code: invitation.code });
  expect(res.status).toBe(200);
  return { ...user, session: res.body as Session };
}

export function membershipIdOf(user: TestUser): string {
  const id = user.session.membership?.id;
  if (!id) throw new Error('El usuario no tiene membresía');
  return id;
}
