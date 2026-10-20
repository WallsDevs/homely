# 04 · API

REST + JSON bajo `/api/v1`. Toda ruta salvo `auth/*` y `health` requiere access token. Todas las rutas de hogar operan sobre el hogar de la membresía activa del usuario; **el `householdId` nunca viaja en el body ni en la query**, se resuelve en el middleware.

## Convenciones

| Tema | Regla |
|---|---|
| Autenticación | `Authorization: Bearer <accessToken>` (JWT, 15 min). Refresh con cookie `homely_rt` (`httpOnly; Secure; SameSite=Lax; Path=/api/v1/auth`). |
| Contexto de hogar | Middleware `requireHousehold` carga la `Membership` activa del usuario y la deja en `req.ctx = { user, membership, household }`. Si no tiene hogar → `403 NO_HOUSEHOLD`. |
| Autorización | Middleware `requireRole('ADMIN')` sobre la membresía. Reglas finas ("solo el asignado o un admin") en el service. |
| Validación | Zod en `body`, `query` y `params` de cada endpoint. Schemas en `shared/` para reutilizar en el client. |
| Fechas | Días como `YYYY-MM-DD`. Instantes como ISO 8601 UTC. |
| Dinero | `string` decimal (`"123.45"`). |
| Paginación | Por cursor: `?limit=50&cursor=<id>` → `{ items, nextCursor }`. Límite máximo 100. |
| Respuesta OK | `200`/`201` con el recurso o `{ items, nextCursor }`. `204` sin cuerpo en delete. |
| Errores | Siempre `{ error: { code, message, details? } }`. `code` en `SCREAMING_SNAKE`. `details` solo para `VALIDATION_ERROR` (issues de Zod aplanados). |
| Idempotencia | `PUT`/`PATCH`/`DELETE` idempotentes. La generación de tareas es idempotente por diseño. |
| Rate limit | 100 req/min por IP en general; 10 req/min en `auth/login` y `auth/register`. |
| Versionado | Prefijo `/v1`. Cambios incompatibles → `/v2`. |

## Códigos de error

| HTTP | `code` | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Zod falla |
| 400 | `INVALID_RANGE` | rango de fechas inválido (limpieza, filtros) |
| 401 | `UNAUTHENTICATED` | sin token o token inválido/expirado |
| 401 | `INVALID_CREDENTIALS` | login incorrecto |
| 403 | `FORBIDDEN` | rol insuficiente o no es el dueño del recurso |
| 403 | `NO_HOUSEHOLD` | usuario sin hogar intenta una ruta de hogar |
| 404 | `NOT_FOUND` | recurso inexistente **o de otro hogar** (nunca se revela que existe) |
| 409 | `EMAIL_TAKEN` | registro con correo existente |
| 409 | `LAST_ADMIN` | se intenta dejar el hogar sin admin |
| 409 | `ALREADY_IN_HOUSEHOLD` | usuario ya tiene hogar (v1) |
| 409 | `DUPLICATE_GOAL` | ya hay meta activa para esa categoría y periodo |
| 409 | `CATEGORY_IN_USE` | intento de eliminar categoría con gastos (se debe archivar) |
| 410 | `INVITATION_INVALID` | código expirado, revocado o agotado |
| 429 | `RATE_LIMITED` | demasiadas peticiones |
| 500 | `INTERNAL_ERROR` | no controlado; nunca filtra detalles |

## Endpoints

### Health
| Método | Ruta | Descripción |
|---|---|---|
| GET | `/health` | `{ ok: true, version }` |

### Auth
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/register` | — | `{ email, name, password }` → `{ accessToken, session }` + cookie refresh |
| POST | `/auth/login` | — | `{ email, password }` → `{ accessToken, session }` + cookie |
| POST | `/auth/refresh` | cookie | rota refresh → `{ accessToken }` |
| POST | `/auth/logout` | cookie | revoca el refresh actual |
| POST | `/auth/logout-all` | auth | revoca todos los refresh del usuario |
| GET | `/auth/me` | auth | `{ user, membership?, household? }` — primera llamada de la app |

### Households
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/households` | auth, sin hogar | `{ name, currency, timezone, weekStartsOn }` → crea, deja como ADMIN y devuelve la `session` actualizada (igual que `/join`) |
| GET | `/households/current` | miembro | datos del hogar + contadores básicos |
| PATCH | `/households/current` | ADMIN | editar nombre, moneda, zona horaria, inicio de semana |
| POST | `/households/join` | auth, sin hogar | `{ code }` → crea membresía con el rol del código |

### Invitations
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/invitations` | ADMIN | vigentes y revocadas recientes |
| POST | `/invitations` | ADMIN | `{ role, expiresInDays?, maxUses? }` → `{ code, ... }` |
| DELETE | `/invitations/:id` | ADMIN | revocar |

### Members
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/members` | miembro | `?includeInactive=true` opcional |
| PATCH | `/members/me` | miembro | `{ displayName?, color?, avatarUrl? }` |
| PATCH | `/members/:id/role` | ADMIN | `{ role }` — valida `LAST_ADMIN` |
| PATCH | `/members/:id/status` | ADMIN | `{ isActive }` — valida `LAST_ADMIN` |
| POST | `/members/me/leave` | miembro | salir del hogar (desactiva la propia membresía; al volver con un código se reactiva la misma) — valida `LAST_ADMIN` |

### Tasks
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/tasks` | miembro | filtros: `from`, `to`, `assigneeId`, `status[]`, `origin`, `priority`, `q`, `cursor`, `limit`. Dispara generación perezosa (PL-04) si el rango toca semanas sin materializar |
| GET | `/tasks/mine` | miembro | atajo: `{ overdue, today, week }` del miembro autenticado |
| GET | `/tasks/board?week=YYYY-MM-DD` | miembro | semana agrupada por miembro |
| POST | `/tasks` | ADMIN | crear manual |
| GET | `/tasks/:id` | miembro | detalle |
| PATCH | `/tasks/:id` | ADMIN | editar campos |
| DELETE | `/tasks/:id` | ADMIN | eliminar |
| POST | `/tasks/:id/complete` | asignado o ADMIN | → `DONE`, guarda `completedBy/At` |
| POST | `/tasks/:id/uncomplete` | asignado o ADMIN | → `PENDING` |
| POST | `/tasks/:id/skip` | ADMIN | → `SKIPPED` |

### Plans
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/plans` | miembro | `?active=true` opcional |
| POST | `/plans` | ADMIN | crear; genera tareas de la semana actual (PL-05) |
| GET | `/plans/:id` | miembro | detalle + próximas tareas |
| PATCH | `/plans/:id` | ADMIN | editar; rehace las tareas futuras pendientes del plan con la configuración nueva |
| PATCH | `/plans/:id/status` | ADMIN | `{ isActive }` — PL-05 (pausar quita pendientes futuras; activar genera lo que queda de la semana) |
| DELETE | `/plans/:id` | ADMIN | elimina plan, conserva tareas históricas |

### Plan pauses (v1.1, PL-09 … PL-12)
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/plan-pauses` | miembro | pausas activas y programadas (`endsOn >= hoy`), con `scope`, `member`, `plan`, `status` |
| POST | `/plan-pauses` | ADMIN | `{ startsOn, endsOn, memberId? \| planId?, reason? }` — `endsOn` no puede ser pasado; miembro activo del hogar; quita las pendientes del rango |
| PATCH | `/plan-pauses/:id` | ADMIN | `{ startsOn?, endsOn?, reason? }` — rehace la unión de rangos; `endsOn` = ayer para "terminar hoy" |
| DELETE | `/plan-pauses/:id` | ADMIN | elimina y regenera los días liberados |

### Expense categories
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/categories` | miembro | `?includeArchived=true` |
| POST | `/categories` | ADMIN | `{ name, color, icon }` |
| PATCH | `/categories/:id` | ADMIN | editar / `isArchived` / `sortOrder` |
| PUT | `/categories/order` | ADMIN | `{ ids: [] }` reordenar |

### Expenses
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/expenses` | miembro | filtros: `from`, `to`, `categoryId[]`, `paidById`, `paymentMethod`, `q`, `cursor`, `limit`. Respuesta incluye `totals` del filtro |
| POST | `/expenses` | miembro | crear (`registeredBy` = yo) |
| PATCH | `/expenses/:id` | dueño o ADMIN | editar |
| DELETE | `/expenses/:id` | dueño o ADMIN | eliminar |
| GET | `/expenses/summary?period=MONTHLY\|WEEKLY&date=` | miembro | total, `previousTotal`, `byCategory`, `byPayer` y metas con progreso (dashboard y reportes) |
| GET | `/expenses/export.csv` | miembro | **[Sugerencia EX-11, no implementada]** mismos filtros |

### Budget goals
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/goals` | miembro | metas activas con `spent`, `ratio`, `status` del periodo en curso |
| POST | `/goals` | ADMIN | `{ categoryId?, period, amount }` — valida `DUPLICATE_GOAL` |
| PATCH | `/goals/:id` | ADMIN | editar monto / `isActive` |
| DELETE | `/goals/:id` | ADMIN | eliminar |

### Reports
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/reports/weekly?week=YYYY-MM-DD` | miembro | RP-01, RP-02, RP-03, RP-05, gastos de la semana y estado de metas |
| GET | `/reports/tasks/top-missed?from&to` | miembro | RP-04 |
| GET | `/reports/tasks/history?memberId&year` | miembro | RP-11 (semanas del año, años disponibles, resumen) |
| GET | `/reports/tasks/trend?weeks=12` | miembro | **[Sugerencia RP-08, no implementada]** |

> Implementado distinto a lo planeado: los gastos por periodo viven en `GET /expenses/summary` (también incluidos en `/reports/weekly`), y el dashboard compone sus tarjetas con las consultas existentes (cacheadas por TanStack Query) en lugar de un endpoint `/reports/dashboard`.

### Maintenance
| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/maintenance/purge/preview` | ADMIN | `{ from, to }` → `{ tasks, expenses, amount }` (RP-13) |
| POST | `/maintenance/purge` | ADMIN | `{ from, to, confirmation }` — `confirmation` debe ser el nombre del hogar (RP-12…15) |
| GET | `/maintenance/audit-log` | ADMIN | paginado |

## Ejemplos

### Crear plan
```http
POST /api/v1/plans
Authorization: Bearer …

{
  "title": "Sacar la basura",
  "weekdays": ["WED", "SAT"],
  "assigneeId": "mbr_luis",
  "priority": "HIGH"
}
```
```json
201
{
  "id": "pln_01",
  "title": "Sacar la basura",
  "weekdays": ["WED", "SAT"],
  "assignee": { "id": "mbr_luis", "displayName": "Luis", "color": "#5B8DEF" },
  "priority": "HIGH",
  "isActive": true,
  "generatedThisWeek": 1
}
```

### Error de validación
```json
400
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Datos inválidos",
    "details": { "weekdays": ["Selecciona al menos un día"] }
  }
}
```

### Reporte semanal (forma)
```json
{
  "week": { "start": "2026-10-19", "end": "2026-10-25" },
  "household": { "assigned": 14, "done": 11, "pending": 2, "skipped": 1, "rate": 0.846, "deltaRate": 0.05 },
  "members": [
    { "id": "mbr_iveth", "displayName": "Iveth", "color": "#E07A5F", "assigned": 7, "done": 7, "pending": 0, "skipped": 0, "rate": 1, "deltaRate": 0.14, "streak": 3 },
    { "id": "mbr_luis",  "displayName": "Luis",  "color": "#5B8DEF", "assigned": 7, "done": 4, "pending": 2, "skipped": 1, "rate": 0.667, "deltaRate": -0.05, "streak": 0 }
  ],
  "topMissed": [ { "title": "Sacar la basura", "missed": 2 } ],
  "expenses": { "total": "312.50", "byCategory": [ { "categoryId": "cat_food", "name": "Comida", "color": "#…", "amount": "180.00" } ], "deltaTotal": "-24.10" },
  "goals": [ { "id": "gl_1", "name": "Comida", "period": "MONTHLY", "amount": "300.00", "spent": "265.00", "ratio": 0.883, "status": "WARNING" } ]
}
```
