# Homely

Web para gestionar un hogar: tareas con planes semanales recurrentes, miembros, reportes de cumplimiento y gastos con metas. Multi-hogar, cada miembro con su cuenta.

## Documentación (leer antes de implementar)

| Doc | Contenido |
|---|---|
| [docs/00-vision.md](docs/00-vision.md) | Problema, objetivos, principios, no-objetivos |
| [docs/01-usuarios-y-roles.md](docs/01-usuarios-y-roles.md) | Roles, matriz de permisos, flujo de alta |
| [docs/02-modulos-funcionales.md](docs/02-modulos-funcionales.md) | **Requisitos por módulo (documento central)** |
| [docs/03-modelo-de-datos.md](docs/03-modelo-de-datos.md) | Entidades, schema Prisma, índices, borrado por rango |
| [docs/04-api.md](docs/04-api.md) | Convenciones REST, auth, errores, endpoints |
| [docs/05-frontend.md](docs/05-frontend.md) | Arquitectura React, rutas, estado, responsive |
| [docs/06-diseno-ui.md](docs/06-diseno-ui.md) | Sistema de diseño: tokens, tipografía, componentes |
| [docs/07-arquitectura-backend.md](docs/07-arquitectura-backend.md) | Capas, carpetas, validación, jobs, seguridad |
| [docs/08-stack-y-convenciones.md](docs/08-stack-y-convenciones.md) | Librerías y por qué, lint, tests, git, env |
| [docs/09-roadmap.md](docs/09-roadmap.md) | Fases de implementación y criterios de "hecho" |

## Stack

- **Client:** React 19 + Vite + TypeScript, Tailwind CSS v4, React Router, TanStack Query, react-hook-form + Zod, Recharts, date-fns, lucide-react. PWA instalable.
- **Server:** Node + Express 5 + TypeScript 7, Prisma 6 + PostgreSQL 17, Zod 4, JWT (access) + refresh en cookie httpOnly, `@node-rs/argon2`, pino, node-cron.
- **Tooling:** npm workspaces (`client`, `server`, `shared`), Oxlint + Prettier, Vitest (+ Supertest en server), Docker Compose para Postgres local (puerto 5433).
- Decisiones técnicas y su motivo: [docs/08-stack-y-convenciones.md](docs/08-stack-y-convenciones.md#decisiones-tomadas-en-la-fase-0-2026-10-19).

## Principios innegociables

1. **Minimalismo sofisticado.** Poco ruido visual, tipografía cuidada, una paleta neutra con un acento. Ver `06-diseno-ui.md`.
2. **Mobile-first y 100 % responsive.** Toda pantalla funciona completa en móvil; crear una tarea o un gasto desde el celular toma segundos.
3. **Rendimiento.** Code-splitting por ruta, caché con TanStack Query, consultas con índices, paginación por cursor, nada de N+1.
4. **Código nivel senior.** Lo que sigue no es opcional.

## Reglas de código

- TypeScript `strict`. Prohibido `any`; usa `unknown` y estrecha.
- Validar en los bordes con Zod: en el server cada ruta usa `endpoint({ body, query, params }, handler)` (`server/src/lib/endpoint.ts`); en el client, `api(path, { schema })` y formularios. Los schemas compartidos viven en `shared/`.
- Fechas de día con las utilidades de `@homely/shared` (`shared/src/dates.ts`: ISO `YYYY-MM-DD`, `startOfWeek`, `todayIn(tz)`); en el server, `toDbDate`/`fromDbDate` de `server/src/lib/dates.ts`. Nunca `new Date()` para decidir "hoy". En la UI, `client/src/shared/lib/format-date.ts` (`dueLabel`, `dayHeading`, `weekRangeLabel`).
- `npm run db:seed` **borra** la BD de desarrollo: pedir confirmación antes de ejecutarlo.
- Imports relativos con extensión `.ts`/`.tsx`. Alias `@/` en el client.
- Capas en el server: `routes (handler de endpoint() = controller) → services → repositories`. La lógica de negocio solo en `services`. Las consultas reutilizables van en `repositories`; una transacción propia de un caso de uso puede escribirse en el service con `prisma.$transaction`.
- Contexto de petición: `authOf(req)` / `householdOf(req)` (`server/src/lib/context.ts`). Los services reciben el contexto, nunca `req`.
- Errores tipados (`AppError` con `code` y `status`); un único manejador global. Nunca `res.status(500)` a mano en un controller.
- Todo dato se filtra por `householdId` obtenido de la membresía autenticada, **nunca** del body ni de la query.
- Varios `ADMIN` por hogar con permisos idénticos. Un hogar nunca puede quedar sin admin.
- Fechas: en BD en UTC; el "día" de una tarea o gasto se calcula con el `timezone` del hogar. Semana según `weekStartsOn` del hogar.
- Dinero: `Decimal(12,2)` en BD, nunca `float`. En el client se formatea con `Intl.NumberFormat` y la `currency` del hogar.
- Nombres en inglés en código, BD y API. Textos de UI en español.
- Componentes pequeños y puros; estado de servidor en TanStack Query, estado de UI local en el componente. Sin Redux.
- Cada feature nueva trae tests: unitarios de `services`, de integración de endpoints, y de componentes críticos.
- Commits convencionales (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).

## Comandos (desde la raíz)

```bash
npm install              # instala todos los workspaces
npm run db:up            # Postgres en Docker (localhost:5433)
npm run db:migrate       # prisma migrate dev
npm run db:seed          # datos de desarrollo (BORRA la BD de desarrollo)
npm run dev              # server :4000 + client :5173 en paralelo
npm test                 # tests de los tres workspaces (server usa homely_test)
npm run typecheck        # tsc en los tres workspaces
npm run lint             # oxlint + prettier --check   (lint:fix para corregir)
npm run build            # shared → server → client
```

Usuarios del seed: `iveth@homely.dev` y `luis@homely.dev`, contraseña `homely1234` (ambos ADMIN).

Estado actual: **Fases 0 a 5 completadas.** Siguiente: Fase 6 (pulido, rendimiento, PWA y despliegue) en `docs/09-roadmap.md`.

Reportes: los cálculos (cumplimiento, delta, racha) son funciones puras en `server/src/modules/reports/report-stats.ts`; el cumplimiento siempre excluye las omitidas. La purga (`maintenance`) nunca toca la semana actual ni el futuro.

Gastos en el client: `ExpenseUIProvider` (en `AppLayout`) expone `useExpenseUI()` con `canEdit`, `openCreate`, `openEdit`. Montos con `useMoney()` (`features/expenses/lib/use-money.ts`, moneda del hogar); nunca sumar dinero en el client salvo para mostrar.

Planes: toda generación de tareas pasa por `server/src/modules/plans/plan-generation.ts` (`materializeWeek`, `materializeForView`, `resetFuture`). No crear tareas de plan por otra vía.

Tareas en el client: `TaskUIProvider` (montado en `AppLayout`) expone `useTaskUI()` con `today`, `canResolve`, `toggle` (optimista con "Deshacer"), `openDetail`, `openCreate`, `openEdit`. Toda vista de tareas usa `TaskItem`; las cachés de tareas cuelgan de `taskKeys.all`.

En el client, la sesión vive en TanStack Query (`features/auth/api/session.ts`): `useSession()` en guards, `useHouseholdSession()` dentro de la app (garantiza hogar y expone `isAdmin`).
