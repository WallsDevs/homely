# 07 · Arquitectura backend

Node 22 + Express 5 + TypeScript (ESM) + Prisma + PostgreSQL. Arquitectura por capas con módulos por dominio. Objetivo: que cada regla de negocio viva en un único lugar, testeable sin HTTP ni base de datos reales.

## Capas

```
HTTP ─► routes ─► controllers ─► services ─► repositories ─► Prisma ─► PostgreSQL
            │           │             │
       middlewares   validación    reglas de negocio,
       (auth, role,  (Zod) y       transacciones,
        household)   mapeo HTTP    cálculos
```

| Capa | Responsabilidad | Prohibido |
|---|---|---|
| **routes** | declarar rutas, encadenar middlewares y validadores, delegar al controller | lógica |
| **controllers** | leer `req` ya validado, llamar a un service, mapear resultado a respuesta HTTP | tocar Prisma, reglas de negocio, `try/catch` genéricos |
| **services** | reglas de negocio, permisos finos, transacciones, cálculos (semanas, cumplimiento, metas), lanzar `AppError` | `req`/`res`, SQL |
| **repositories** | consultas Prisma tipadas y reutilizables; una función por consulta | lógica de negocio |
| **jobs** | tareas programadas que llaman a services | lógica propia |

## Estructura de carpetas

```
server/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── src/
│   ├── app.ts                 # crea la app Express (sin listen) → testeable
│   ├── server.ts              # listen + arranque de jobs + graceful shutdown
│   ├── config/
│   │   ├── env.ts             # Zod valida process.env; exporta `env` tipado
│   │   └── constants.ts       # umbrales de metas, límites de paginación, TTLs
│   ├── lib/
│   │   ├── prisma.ts          # singleton PrismaClient
│   │   ├── logger.ts          # pino
│   │   ├── errors.ts          # AppError + catálogo de códigos
│   │   ├── dates.ts           # weekStart/weekEnd en tz del hogar, parse YYYY-MM-DD
│   │   ├── money.ts           # helpers Decimal
│   │   └── crypto.ts          # argon2, tokens aleatorios, hash de refresh
│   ├── middlewares/
│   │   ├── auth.ts            # requireAuth (JWT) → req.ctx.user
│   │   ├── household.ts       # requireHousehold → req.ctx.membership/household
│   │   ├── role.ts            # requireRole('ADMIN')
│   │   ├── validate.ts        # validate({ body, query, params }) con Zod
│   │   ├── rateLimit.ts
│   │   └── errorHandler.ts    # único punto que convierte errores en respuestas
│   ├── modules/
│   │   ├── auth/        { auth.routes.ts, auth.controller.ts, auth.service.ts, auth.repository.ts, auth.schemas.ts, auth.test.ts }
│   │   ├── households/
│   │   ├── invitations/
│   │   ├── members/
│   │   ├── tasks/
│   │   ├── plans/
│   │   ├── categories/
│   │   ├── expenses/
│   │   ├── goals/
│   │   ├── reports/
│   │   └── maintenance/
│   ├── jobs/
│   │   └── generateWeeklyTasks.job.ts
│   └── types/
│       └── express.d.ts       # augment: req.ctx
└── tests/
    ├── setup.ts               # BD de test, truncado entre tests
    └── factories/             # crear usuario/hogar/tarea de prueba
```

Los schemas Zod de request/response se definen en el workspace **`shared/`** (`shared/src/schemas/*.ts`) y cada módulo los importa; `*.schemas.ts` solo compone o extiende.

## Contexto de petición

```ts
// types/express.d.ts
declare global {
  namespace Express {
    interface Request {
      ctx: {
        user: { id: string; email: string };
        membership?: { id: string; role: Role; householdId: string };
        household?: { id: string; timezone: string; weekStartsOn: Weekday; currency: string };
      };
    }
  }
}
```

`requireAuth` rellena `user`; `requireHousehold` rellena `membership` y `household` (una consulta con `include`) y responde `403 NO_HOUSEHOLD` si no existe membresía activa. Los services reciben el contexto explícitamente (`ctx: HouseholdCtx`), nunca leen `req`.

## Validación

```ts
router.post(
  '/',
  requireRole('ADMIN'),
  endpoint({ body: createPlanSchema }, async ({ body }, req, res) => {
    const plan = await plansService.create(req.ctx, body); // body ya tipado
    res.status(201).json(plan);
  }),
);
```

`endpoint` (`src/lib/endpoint.ts`) valida `body`, `query` y `params` con `safeParse`, junta los errores por campo y lanza `AppError.validation(details)` si algo falla. El handler recibe los datos **tipados por inferencia** desde los schemas, sin casts. No se reescribe `req.query` (en Express 5 es de solo lectura).

## Errores

```ts
export class AppError extends Error {
  constructor(public readonly code: ErrorCode, public readonly status: number, message: string, public readonly details?: unknown) { super(message); }
  static notFound(entity: string) { return new AppError('NOT_FOUND', 404, `${entity} no encontrado`); }
  static forbidden() { ... }
  static validation(details: unknown) { ... }
  static conflict(code: ErrorCode, message: string) { ... }
}
```

- Los services lanzan `AppError`; los controllers no capturan nada (Express 5 propaga promesas rechazadas al `errorHandler`).
- `errorHandler`: `AppError` → su status y `{ error }`; `ZodError` inesperado → 400; `Prisma.PrismaClientKnownRequestError` `P2002` → 409 `CONFLICT`, `P2025` → 404; cualquier otro → 500 `INTERNAL_ERROR` + log con stack. En producción nunca se devuelve el mensaje interno.
- Un recurso de **otro hogar** responde `404`, no `403`, para no revelar existencia. Todas las consultas por `id` incluyen `householdId` en el `where`.

## Seguridad

| Medida | Detalle |
|---|---|
| Contraseñas | `argon2id` vía `@node-rs/argon2` (binarios precompilados) |
| JWT access | HS256 con secreto ≥ 32 bytes, 15 min, claims `sub`, `iat`, `exp`; sin datos sensibles |
| Refresh | token aleatorio de 32 bytes; en BD solo su hash SHA-256; rotación en cada uso; detección de reuso → revoca todos los del usuario |
| Cookies | `httpOnly; Secure; SameSite=Lax; Path=/api/v1/auth` |
| CORS | origen exacto desde `env.CLIENT_ORIGIN`, `credentials: true` |
| Headers | `helmet()` |
| Rate limit | `express-rate-limit`: global 100/min por IP; `auth/login`, `auth/register`, `households/join` 10/min |
| Tamaño body | `express.json({ limit: '100kb' })` |
| Aislamiento | `householdId` siempre desde `req.ctx`; tests de integración verifican que un hogar no ve datos de otro |
| Secretos | solo por `env`; `env.ts` falla al arrancar si falta alguno |
| Logs | pino con `redact` de `authorization`, `cookie`, `password` |

## Jobs

### `generateWeeklyTasks`
- `node-cron` cada hora (`0 * * * *`). En cada ejecución busca hogares cuya semana **acaba de comenzar** en su zona horaria (la hora local actual está dentro de la primera hora del `weekStartsOn`) y para cada uno llama a `plansService.materializeWeek(householdId, weekStart)`.
- Es idempotente (índice único `(planId, dueDate)` + `skipDuplicates`), así que ejecutarlo de más es inofensivo.
- Además, `tasksService.list` y `reportsService.weekly` llaman a `materializeWeek` de forma perezosa cuando el rango consultado incluye semanas aún no materializadas (PL-04), con un pequeño caché en memoria (`Set<householdId:weekStart>`) para no repetir la comprobación en cada petición.
- En producción con varias instancias: el job usa `pg_advisory_xact_lock(hash(householdId))` dentro de la transacción para evitar carreras. En v1 con una instancia basta la unicidad.

### Limpieza de refresh tokens
`0 3 * * *`: borra tokens expirados o revocados hace más de 30 días.

## Transacciones

`prisma.$transaction(async (tx) => { ... })` en: crear hogar (hogar + membresía + categorías semilla), unirse por invitación (membresía + `usedCount`), purga de datos (borrados + audit log), cambio de rol / desactivación (validación de último admin + update, con `SELECT … FOR UPDATE` vía `tx.$queryRaw` o re-chequeo dentro de la transacción).

## Rendimiento

- Reportes semanales con `groupBy` + `_count`/`_sum`; una consulta por métrica, nunca por miembro.
- Dashboard: un endpoint que ejecuta sus consultas con `Promise.all`.
- Índices definidos en el schema; `EXPLAIN ANALYZE` en los reportes al llegar a Fase 5.
- Paginación por cursor con `take: limit + 1` para calcular `nextCursor`.
- `prisma` con `log: ['warn', 'error']` en prod, `['query']` opcional en dev para detectar N+1.
- Compresión `compression()` para JSON grande.

## Observabilidad

- `pino-http` con `req.id`, método, ruta, status y duración.
- `GET /api/v1/health` responde también `db: ok` tras un `SELECT 1`.
- Errores 500 se loguean con stack y `req.id`; el client muestra el `req.id` en el toast de error para poder correlacionar.

## Testing

| Nivel | Herramienta | Qué cubre |
|---|---|---|
| Unitario | Vitest | `lib/dates` (semanas por tz e inicio de semana), cálculos de cumplimiento y metas, `AppError`, services con repositorios simulados |
| Integración | Vitest + Supertest + Postgres de test (Docker) | cada endpoint: happy path, validación, permisos por rol, aislamiento entre hogares, `LAST_ADMIN`, idempotencia de generación de tareas, purga |
| Contrato | Zod | las respuestas se validan contra los schemas de `shared/` en los tests de integración |

Base de datos de test: `DATABASE_URL_TEST`, `prisma migrate deploy` en `setup.ts`, `TRUNCATE … CASCADE` entre tests. Factories en `tests/factories/` para crear usuario/hogar/membresía/tarea con valores por defecto.

## Arranque y apagado

```
server.ts
  env.ts valida variables
  prisma.$connect()
  app.listen(env.PORT)
  jobs.start()
  on SIGTERM/SIGINT: jobs.stop() → server.close() → prisma.$disconnect()
```
