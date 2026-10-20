/*
 * Seed de desarrollo: un hogar con dos admins, planes, dos semanas de tareas, gastos y metas.
 * Es destructivo: vacía la BD de desarrollo antes de sembrar. Nunca se ejecuta en producción.
 */
import { hash } from '@node-rs/argon2';
import { MEMBER_COLORS, type Weekday } from '@homely/shared';
import { PrismaClient, type TaskStatus } from '@prisma/client';
import { DEFAULT_CATEGORIES } from '../src/modules/categories/default-categories.ts';
import { addDays, dateInWeek, startOfWeek, toDbDate, todayIn } from '../src/lib/dates.ts';

if (process.env['NODE_ENV'] === 'production') {
  throw new Error('El seed de desarrollo no se ejecuta en producción');
}

const prisma = new PrismaClient();
const TIMEZONE = 'America/Bogota';
const WEEK_STARTS_ON: Weekday = 'MON';
const DEV_PASSWORD = 'homely1234';

async function main() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany(),
    prisma.expense.deleteMany(),
    prisma.budgetGoal.deleteMany(),
    prisma.expenseCategory.deleteMany(),
    prisma.task.deleteMany(),
    prisma.taskPlan.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.household.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await hash(DEV_PASSWORD);
  const [iveth, luis] = await Promise.all([
    prisma.user.create({ data: { email: 'iveth@homely.dev', name: 'Iveth', passwordHash } }),
    prisma.user.create({ data: { email: 'luis@homely.dev', name: 'Luis', passwordHash } }),
  ]);

  const household = await prisma.household.create({
    data: { name: 'Casa', currency: 'USD', timezone: TIMEZONE, weekStartsOn: WEEK_STARTS_ON },
  });

  const [ivethMember, luisMember] = await Promise.all([
    prisma.membership.create({
      data: {
        userId: iveth.id,
        householdId: household.id,
        role: 'ADMIN',
        displayName: 'Iveth',
        color: MEMBER_COLORS[0],
      },
    }),
    prisma.membership.create({
      data: {
        userId: luis.id,
        householdId: household.id,
        role: 'ADMIN',
        displayName: 'Luis',
        color: MEMBER_COLORS[1],
      },
    }),
  ]);

  await prisma.expenseCategory.createMany({
    data: DEFAULT_CATEGORIES.map((category, index) => ({
      ...category,
      householdId: household.id,
      sortOrder: index,
    })),
  });
  const categories = await prisma.expenseCategory.findMany({
    where: { householdId: household.id },
  });
  const categoryId = (name: string) => {
    const category = categories.find((c) => c.name === name);
    if (!category) throw new Error(`Categoría ${name} no sembrada`);
    return category.id;
  };

  const plans = await Promise.all(
    [
      {
        title: 'Sacar la basura',
        weekdays: ['WED', 'SAT'],
        assigneeId: luisMember.id,
        priority: 'HIGH',
      },
      {
        title: 'Lavar los platos',
        weekdays: ['MON', 'WED', 'FRI'],
        assigneeId: ivethMember.id,
        priority: 'MEDIUM',
      },
      {
        title: 'Aspirar la sala',
        weekdays: ['SAT'],
        assigneeId: luisMember.id,
        priority: 'MEDIUM',
      },
      { title: 'Cambiar sábanas', weekdays: ['SUN'], assigneeId: ivethMember.id, priority: 'LOW' },
    ].map((plan) =>
      prisma.taskPlan.create({
        data: {
          householdId: household.id,
          title: plan.title,
          weekdays: plan.weekdays as Weekday[],
          assigneeId: plan.assigneeId,
          priority: plan.priority as 'HIGH' | 'MEDIUM' | 'LOW',
        },
      }),
    ),
  );

  // Semana pasada (cerrada, con algunos incumplimientos) y semana actual (hasta hoy).
  const today = todayIn(TIMEZONE);
  const thisWeek = startOfWeek(today, WEEK_STARTS_ON);
  const lastWeek = addDays(thisWeek, -7);

  const tasks = plans.flatMap((plan) =>
    [lastWeek, thisWeek].flatMap((weekStart) =>
      plan.weekdays.map((weekday) => {
        const dueDate = dateInWeek(weekStart, weekday, WEEK_STARTS_ON);
        const isPast = dueDate < today;
        // Luis deja de vez en cuando la basura sin sacar: alimenta el reporte de incumplidas.
        const missed = isPast && plan.title === 'Sacar la basura' && weekday === 'SAT';
        const status: TaskStatus = isPast && !missed ? 'DONE' : 'PENDING';
        return {
          householdId: household.id,
          planId: plan.id,
          title: plan.title,
          priority: plan.priority,
          origin: 'PLAN' as const,
          dueDate: toDbDate(dueDate),
          assigneeId: plan.assigneeId,
          status,
          ...(status === 'DONE'
            ? { completedById: plan.assigneeId, completedAt: toDbDate(dueDate) }
            : {}),
        };
      }),
    ),
  );
  await prisma.task.createMany({ data: tasks });

  await prisma.task.create({
    data: {
      householdId: household.id,
      title: 'Llamar al técnico de la lavadora',
      origin: 'MANUAL',
      priority: 'HIGH',
      dueDate: toDbDate(addDays(today, 2)),
      assigneeId: ivethMember.id,
      createdById: ivethMember.id,
    },
  });

  const expenses: {
    category: string;
    amount: string;
    daysAgo: number;
    description?: string;
    paidBy: string;
  }[] = [
    {
      category: 'Comida',
      amount: '60.00',
      daysAgo: 1,
      description: 'Mercado semanal',
      paidBy: ivethMember.id,
    },
    {
      category: 'Transporte',
      amount: '100.00',
      daysAgo: 2,
      description: 'Gasolina',
      paidBy: luisMember.id,
    },
    { category: 'Comida fuera', amount: '40.00', daysAgo: 3, paidBy: luisMember.id },
    {
      category: 'Limpieza',
      amount: '50.00',
      daysAgo: 4,
      description: 'Artículos de limpieza',
      paidBy: ivethMember.id,
    },
    {
      category: 'Mascotas',
      amount: '30.00',
      daysAgo: 5,
      description: 'Comida del perro',
      paidBy: ivethMember.id,
    },
    {
      category: 'Comida',
      amount: '85.50',
      daysAgo: 9,
      description: 'Mercado',
      paidBy: luisMember.id,
    },
    {
      category: 'Servicios',
      amount: '40.00',
      daysAgo: 12,
      description: 'Internet',
      paidBy: ivethMember.id,
    },
    {
      category: 'Comida',
      amount: '72.30',
      daysAgo: 16,
      description: 'Mercado',
      paidBy: ivethMember.id,
    },
    { category: 'Ocio', amount: '25.00', daysAgo: 18, description: 'Cine', paidBy: luisMember.id },
  ];
  await prisma.expense.createMany({
    data: expenses.map((expense) => ({
      householdId: household.id,
      categoryId: categoryId(expense.category),
      amount: expense.amount,
      date: toDbDate(addDays(today, -expense.daysAgo)),
      description: expense.description ?? null,
      paidById: expense.paidBy,
      registeredById: expense.paidBy,
    })),
  });

  await prisma.budgetGoal.createMany({
    data: [
      {
        householdId: household.id,
        categoryId: categoryId('Comida'),
        period: 'MONTHLY',
        amount: '300.00',
      },
      { householdId: household.id, categoryId: null, period: 'MONTHLY', amount: '1200.00' },
    ],
  });

  console.warn(
    `Seed listo: hogar "${household.name}", ${tasks.length + 1} tareas, ${expenses.length} gastos.\n` +
      `Usuarios: iveth@homely.dev / luis@homely.dev — contraseña: ${DEV_PASSWORD}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
