# 03 · Modelo de datos

PostgreSQL + Prisma. Identificadores `cuid()`. Timestamps en UTC. El "día" de una tarea o gasto se guarda como `@db.Date` y se interpreta en la zona horaria del hogar.

## Diagrama de entidades

```
User ──< Membership >── Household
              │              ├──< Invitation
              │              ├──< TaskPlan ──< Task
              │              ├──< Task
              │              ├──< ExpenseCategory ──< Expense
              │              ├──< Expense
              │              ├──< BudgetGoal ──> ExpenseCategory?
              │              └──< AuditLog
              │
              ├── Task.assignee / Task.completedBy / Task.createdBy
              ├── Expense.paidBy / Expense.registeredBy
              └── TaskPlan.assignee  (+ rotación N:M, sugerencia)

User ──< RefreshToken
```

Regla clave: **las tareas y los gastos apuntan a `Membership`, no a `User`.** Así el historial pertenece al hogar y no se rompe si un usuario sale o entra a otro hogar.

## Schema Prisma

> Fuente de verdad: [`server/prisma/schema.prisma`](../server/prisma/schema.prisma). Lo de abajo es la referencia de diseño; si difieren, manda el archivo.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ───────────── Enums ─────────────

enum Role {
  ADMIN
  MEMBER
}

enum Weekday {
  MON
  TUE
  WED
  THU
  FRI
  SAT
  SUN
}

enum TaskStatus {
  PENDING
  DONE
  SKIPPED
}

enum TaskOrigin {
  MANUAL
  PLAN
}

enum TaskPriority {
  LOW
  MEDIUM
  HIGH
}

enum GoalPeriod {
  WEEKLY
  MONTHLY
}

enum PaymentMethod {
  CASH
  CARD
  TRANSFER
  OTHER
}

// ───────────── Identidad ─────────────

model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  name         String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships   Membership[]
  refreshTokens RefreshToken[]
}

model RefreshToken {
  id        String    @id @default(cuid())
  userId    String
  tokenHash String    @unique
  familyId  String    // cadena de rotación: si se reusa un token revocado, se revoca toda la familia
  expiresAt DateTime
  revokedAt DateTime?
  userAgent String?
  createdAt DateTime  @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
}

// ───────────── Hogar ─────────────

model Household {
  id           String   @id @default(cuid())
  name         String
  currency     String   @default("USD") // ISO 4217
  timezone     String   @default("UTC") // IANA
  weekStartsOn Weekday  @default(MON)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships Membership[]
  invitations Invitation[]
  plans       TaskPlan[]
  tasks       Task[]
  categories  ExpenseCategory[]
  expenses    Expense[]
  goals       BudgetGoal[]
  auditLogs   AuditLog[]
}

model Membership {
  id          String   @id @default(cuid())
  userId      String
  householdId String
  role        Role     @default(MEMBER)
  displayName String
  color       String // hex, p. ej. "#5B8DEF"
  avatarUrl   String?
  isActive    Boolean  @default(true)
  joinedAt    DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user      User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  household Household @relation(fields: [householdId], references: [id], onDelete: Cascade)

  assignedTasks     Task[]       @relation("TaskAssignee")
  completedTasks    Task[]       @relation("TaskCompletedBy")
  createdTasks      Task[]       @relation("TaskCreatedBy")
  assignedPlans     TaskPlan[]   @relation("PlanAssignee")
  rotationPlans     TaskPlan[]   @relation("PlanRotation") // [Sugerencia] PL-06
  paidExpenses      Expense[]    @relation("ExpensePaidBy")
  registeredExpenses Expense[]   @relation("ExpenseRegisteredBy")
  createdInvitations Invitation[]
  auditLogs         AuditLog[]

  @@unique([userId, householdId])
  @@index([householdId, isActive])
}

model Invitation {
  id          String    @id @default(cuid())
  householdId String
  code        String    @unique
  role        Role      @default(MEMBER)
  expiresAt   DateTime
  maxUses     Int       @default(1)
  usedCount   Int       @default(0)
  revokedAt   DateTime?
  createdById String
  createdAt   DateTime  @default(now())

  household Household  @relation(fields: [householdId], references: [id], onDelete: Cascade)
  createdBy Membership @relation(fields: [createdById], references: [id], onDelete: Cascade)

  @@index([householdId])
}

// ───────────── Tareas y planes ─────────────

model TaskPlan {
  id          String       @id @default(cuid())
  householdId String
  title       String
  description String?
  priority    TaskPriority @default(MEDIUM)
  weekdays    Weekday[]
  assigneeId  String?
  isActive    Boolean      @default(true)
  startsOn    DateTime?    @db.Date
  endsOn      DateTime?    @db.Date
  rotationIndex Int        @default(0) // [Sugerencia] PL-06
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  household Household    @relation(fields: [householdId], references: [id], onDelete: Cascade)
  assignee  Membership?  @relation("PlanAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  rotation  Membership[] @relation("PlanRotation") // [Sugerencia] PL-06
  tasks     Task[]

  @@index([householdId, isActive])
}

model Task {
  id            String       @id @default(cuid())
  householdId   String
  planId        String?
  title         String
  description   String?
  priority      TaskPriority @default(MEDIUM)
  status        TaskStatus   @default(PENDING)
  origin        TaskOrigin   @default(MANUAL)
  dueDate       DateTime     @db.Date
  assigneeId    String?
  createdById   String?
  completedById String?
  completedAt   DateTime?
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt

  household   Household   @relation(fields: [householdId], references: [id], onDelete: Cascade)
  plan        TaskPlan?   @relation(fields: [planId], references: [id], onDelete: SetNull)
  assignee    Membership? @relation("TaskAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  createdBy   Membership? @relation("TaskCreatedBy", fields: [createdById], references: [id], onDelete: SetNull)
  completedBy Membership? @relation("TaskCompletedBy", fields: [completedById], references: [id], onDelete: SetNull)

  @@unique([planId, dueDate]) // PL-03 idempotencia
  @@index([householdId, dueDate])
  @@index([assigneeId, dueDate, status])
}

// ───────────── Gastos y metas ─────────────

model ExpenseCategory {
  id          String   @id @default(cuid())
  householdId String
  name        String
  color       String
  icon        String // nombre de icono lucide, p. ej. "shopping-cart"
  sortOrder   Int      @default(0)
  isArchived  Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  household Household    @relation(fields: [householdId], references: [id], onDelete: Cascade)
  expenses  Expense[]
  goals     BudgetGoal[]

  @@unique([householdId, name])
  @@index([householdId, isArchived, sortOrder])
}

model Expense {
  id             String         @id @default(cuid())
  householdId    String
  categoryId     String
  amount         Decimal        @db.Decimal(12, 2)
  date           DateTime       @db.Date
  description    String?
  paymentMethod  PaymentMethod?
  paidById       String?
  registeredById String?
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt

  household    Household       @relation(fields: [householdId], references: [id], onDelete: Cascade)
  category     ExpenseCategory @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  paidBy       Membership?     @relation("ExpensePaidBy", fields: [paidById], references: [id], onDelete: SetNull)
  registeredBy Membership?     @relation("ExpenseRegisteredBy", fields: [registeredById], references: [id], onDelete: SetNull)

  @@index([householdId, date])
  @@index([householdId, categoryId, date])
}

model BudgetGoal {
  id          String     @id @default(cuid())
  householdId String
  categoryId  String? // null = meta del total del hogar
  period      GoalPeriod
  amount      Decimal    @db.Decimal(12, 2)
  isActive    Boolean    @default(true)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  household Household        @relation(fields: [householdId], references: [id], onDelete: Cascade)
  category  ExpenseCategory? @relation(fields: [categoryId], references: [id], onDelete: Cascade)

  @@index([householdId, isActive])
}

// ───────────── Auditoría ─────────────

model AuditLog {
  id          String   @id @default(cuid())
  householdId String
  actorId     String?
  action      String // "DATA_PURGE", "MEMBER_ROLE_CHANGED", "MEMBER_DEACTIVATED", ...
  metadata    Json
  createdAt   DateTime @default(now())

  household Household   @relation(fields: [householdId], references: [id], onDelete: Cascade)
  actor     Membership? @relation(fields: [actorId], references: [id], onDelete: SetNull)

  @@index([householdId, createdAt])
}
```

### Notas sobre el schema

- **`BudgetGoal` unicidad:** Postgres permite varios `NULL` en un índice único, así que "una sola meta activa por (categoría, periodo)" se valida en el `service` (y opcionalmente con un índice parcial en una migración SQL manual: `CREATE UNIQUE INDEX ... WHERE "isActive" AND "categoryId" IS NULL`).
- **`Task.planId` con `SetNull`:** al eliminar un plan, las tareas históricas quedan huérfanas pero conservan `origin = PLAN` y su título (PL-01).
- **`Expense.categoryId` con `Restrict`:** las categorías no se eliminan, se archivan (EX-04). El `Restrict` es una red de seguridad.
- **Dinero:** siempre `Decimal(12,2)`. En el server se manipula con `Prisma.Decimal`; en la API viaja como `string` (`"123.45"`) para no perder precisión; el client lo convierte para mostrar.
- **Fechas de día (`@db.Date`):** `dueDate` y `date` se envían y reciben como `YYYY-MM-DD`. Nunca se combinan con hora.
- **Rotación (PL-06, sugerencia):** la relación N:M implícita `rotation` + `rotationIndex` bastan; el orden de rotación se guarda en el service como el orden de `connect`. Si se necesita orden estricto, se cambia por una tabla explícita `PlanRotationMember (planId, membershipId, position)`.

## Cálculos clave (viven en `services`, no en SQL ad hoc)

### Semana del hogar
```
weekStart(dateInHouseholdTz, weekStartsOn) → fecha del día de inicio
weekEnd = weekStart + 6 días
```
Toda consulta semanal usa `dueDate BETWEEN weekStart AND weekEnd`. `date-fns` con `startOfWeek(date, { weekStartsOn })` tras convertir a la zona horaria del hogar con `date-fns-tz`.

### Generación de tareas desde planes (PL-02 … PL-05)
```
for plan in activePlans(household):
  for weekday in plan.weekdays:
    dueDate = dateOf(weekday, weekStart)
    if dueDate < plan.startsOn or dueDate > plan.endsOn: continue
    assignee = plan.rotation.length ? rotation[(rotationIndex + weekOffset) % len] : plan.assigneeId
    createMany({ ..., skipDuplicates: true })   // respeta @@unique(planId, dueDate)
```

### Cumplimiento (RP-01)
```
assigned  = count(tasks where assignee = m and dueDate in week)
skipped   = count(status = SKIPPED)
done      = count(status = DONE)
pending   = assigned - done - skipped
rate      = assigned - skipped == 0 ? null : done / (assigned - skipped)
```
Una sola consulta `groupBy({ by: ['assigneeId', 'status'] })` por semana; nunca un query por miembro.

### Estado de meta (EX-06)
```
spent  = sum(expense.amount where category match and date in period)
ratio  = spent / goal.amount
status = ratio < 0.8 ? OK : ratio <= 1 ? WARNING : EXCEEDED
```

## Limpieza por rango (RP-12 … RP-15)

```
transaction:
  tasksDeleted    = deleteMany(Task    where householdId and dueDate between from and to)
  expensesDeleted = deleteMany(Expense where householdId and date    between from and to)
  auditLog.create({ action: "DATA_PURGE", metadata: { from, to, tasksDeleted, expensesDeleted, amountDeleted } })
```
Validaciones previas en el service: `from <= to`, `to < weekStart(today)`. Los índices `(householdId, dueDate)` y `(householdId, date)` hacen que el borrado sea un range scan.

## Semillas (seed)

- Categorías por defecto al crear un hogar (EX-04): Comida, Comida fuera, Transporte, Limpieza, Mascotas, Servicios, Salud, Ocio, Otros, con color e icono predefinidos.
- Colores de miembro: paleta de 8 tonos armónicos; al unirse se asigna el primero libre.
- Seed de desarrollo (`prisma/seed.ts`): un hogar con dos admins, tres planes, dos semanas de tareas con estados variados, ~30 gastos y dos metas. Permite ver reportes reales desde el primer día.
