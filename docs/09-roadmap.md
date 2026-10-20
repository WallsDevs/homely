# 09 · Roadmap

Fases secuenciales. Cada una termina con criterios de "hecho" verificables y con `npm run lint && npm run typecheck && npm run test` en verde. Las **[Sugerencia]** de `02-modulos-funcionales.md` se incluyen solo si se aceptan; están marcadas con ◇.

## Fase 0 · Cimientos y tooling — ✅ completada 2026-10-19

**Objetivo:** monorepo listo, BD corriendo, sistema de diseño base, primer endpoint y primera pantalla con la arquitectura definitiva.

- [x] Inicializar git; `.gitignore` raíz; eliminar carpetas basura.
- [x] npm workspaces: `client`, `server`, `shared`. Scripts raíz (`dev`, `build`, `test`, `lint`, `typecheck`, `db:*`).
- [x] Oxlint + Prettier compartidos (ESLint descartado, ver doc 08). ⏳ `lint-staged` + hook pre-commit: con el primer commit.
- [x] `docker-compose.yml` con Postgres 17 en el puerto 5433 (`homely`, `homely_test`); `.env.example` en client y server.
- [x] Server: `app.ts`/`server.ts`, `config/env.ts`, `lib/{prisma,logger,errors,dates,money,endpoint}`, `middlewares/{error-handler,rate-limit}`, `helmet`, `cors`, `compression`, `pino-http`. `GET /api/v1/health` con check de BD.
- [x] Prisma: `schema.prisma` completo (doc 03), migración `init`, `seed.ts` con dos admins, 4 planes, 15 tareas, 9 gastos y 2 metas.
- [x] Tests: Vitest en los tres workspaces (21 tests); BD de test con migraciones automáticas; integración de `/health` y errores.
- [x] Client: Tailwind v4 con tokens (claro/oscuro), `globals.css`, `api-client`, `providers`, `router` con layout y rutas perezosas, proxy a `/api`, alias `@/`, PWA. ⏳ Guards de auth: pasan a la Fase 1, donde tienen sentido.
- [x] `shared/ui`: Button, IconButton, Input, Card, Badge, Avatar, Skeleton, Toast, Sheet (Dialog/BottomSheet), StatTile, ProgressBar, EmptyState, PageHeader. Navegación: barra inferior + sidebar, FAB con acciones rápidas, selector de tema.
- [x] Galería de componentes en `/dev/ui` (solo desarrollo, excluida del build).

**Hecho cuando:** `npm run dev` levanta todo ✅; `/api/v1/health` responde `{ ok, db: ok }` ✅; la shell se ve correcta a 360 px y a 1280 px en claro y oscuro (revisión visual pendiente de la dueña).

**Métricas al cierre:** JS inicial 114 kB gzip (presupuesto 180 kB) · CSS 6,6 kB gzip · build 0,7 s.

## Fase 1 · Auth, hogar y miembros

**Requisitos:** HM-01 … HM-08, doc 01 completo.

- [ ] `shared`: schemas de auth, household, invitation, member.
- [ ] Server: módulos `auth` (register, login, refresh con rotación, logout, logout-all, me), `households` (create, current, patch, join), `invitations`, `members` (incluida regla `LAST_ADMIN`). Middlewares `requireAuth`, `requireHousehold`, `requireRole`. Audit log de cambios de rol/estado. Categorías semilla al crear hogar.
- [ ] Tests de integración: registro/login, refresh y reuso de token, crear hogar, unirse con código (rol ADMIN y MEMBER), expiración/agotamiento de código, último admin, aislamiento entre hogares.
- [ ] Client: Login, Registro, Onboarding (crear / unirse), Miembros (lista, invitaciones, cambio de rol y estado), Perfil (nombre, color, avatar), Ajustes del hogar. Sesión en memoria con refresh automático.

**Hecho cuando:** dos personas pueden registrarse, una crea el hogar y la otra entra como ADMIN con un código, y ambas ven lo mismo. Todo usable desde el celular.

## Fase 2 · Tareas

**Requisitos:** TK-01 … TK-10.

- [ ] `shared`: schemas de task y filtros.
- [ ] Server: módulo `tasks` (list con filtros y cursor, mine, board, CRUD, complete/uncomplete/skip con reglas de permiso). `lib/dates` con semanas por tz e inicio de semana, probado a fondo.
- [ ] Client: Mis tareas (Hoy · Semana · Vencidas), Tablero semanal (carrusel en móvil, columnas en escritorio), Detalle (BottomSheet/panel), Formulario Nueva tarea en el FAB/header, completar optimista con "Deshacer", WeekPicker.
- [ ] Tests: permisos (asignado vs admin vs otro), estado vencida derivado, filtros, optimistic update con rollback (client).

**Hecho cuando:** un admin crea y asigna tareas desde el celular y el asignado las completa en un toque; el tablero muestra la semana por miembro.

## Fase 3 · Planes y generación semanal

**Requisitos:** PL-01 … PL-08 (◇ PL-06 rotación).

- [ ] Server: módulo `plans` (CRUD, activate/deactivate, `materializeWeek` idempotente, generación inmediata al crear/activar, limpieza de pendientes al desactivar, plan sin responsable al desactivar miembro). Job `generateWeeklyTasks` con node-cron. Generación perezosa en `tasks.list`/`board`.
- [ ] Client: lista de planes con WeekdayChips, formulario (días, responsable ◇ rotación, prioridad, fechas), aviso de plan sin responsable en el dashboard.
- [ ] Tests: idempotencia (ejecutar dos veces no duplica), semanas con distinto `weekStartsOn` y tz, `startsOn/endsOn`, desactivar a mitad de semana, ◇ rotación.

**Hecho cuando:** "Sacar la basura · miércoles y sábado · Luis" genera sus dos tareas cada semana sin que nadie haga nada, y lo hace una sola vez.

## Fase 4 · Gastos, categorías y metas

**Requisitos:** EX-01 … EX-08 (◇ EX-09, EX-10, EX-11).

- [ ] `shared`: schemas de expense, category, goal; constantes de umbrales.
- [ ] Server: módulos `categories` (CRUD, archivar, orden), `expenses` (list con filtros, totals y cursor; CRUD con permiso dueño/admin), `goals` (CRUD, `DUPLICATE_GOAL`, cálculo de `spent/ratio/status` por periodo en curso). ◇ `RecurringExpense` + job mensual. ◇ export CSV.
- [ ] Client: Gastos (lista por día, total del filtro, filtros, búsqueda), Nuevo gasto (AmountInput, chips de categoría, fecha, descripción) en el FAB, Categorías (admin), Metas (tarjetas con ProgressBar y Badge), banner de aviso en el dashboard. ◇ Balance entre miembros.
- [ ] Tests: precisión decimal, totales por filtro, estado de metas en los umbrales (79.9 / 80 / 100 / 100.1 %), periodo mensual vs semanal según tz, permisos de edición.

**Hecho cuando:** registrar un gasto desde el celular toma menos de 10 segundos y al llegar al 80 % de la meta de Comida aparece el aviso.

## Fase 5 · Reportes, historial y limpieza

**Requisitos:** RP-01 … RP-15 (◇ RP-07, RP-08, RP-09); dashboard completo.

- [ ] Server: módulo `reports` (weekly con hogar, miembros, delta, racha, top-missed, gastos y metas; history por año; expenses por periodo; dashboard en una llamada). Módulo `maintenance` (purge/preview, purge con confirmación y audit log, audit-log paginado). `EXPLAIN ANALYZE` de las consultas de reportes.
- [ ] Client: Reporte semanal (StatTiles, barras por miembro, ranking de incumplidas, sección de gastos y metas), Historial anual (selector de miembro y año), Dashboard final, Limpieza de datos (rango → preview → confirmación escribiendo el nombre del hogar), Auditoría. Recharts en chunk separado.
- [ ] Tests: cálculos de cumplimiento con omitidas, delta y racha; año en curso por defecto; purga respeta el límite de la semana actual y no toca planes/categorías/metas; audit log.

**Hecho cuando:** al cerrar la semana se ve quién cumplió qué, qué tareas se quedaron sin hacer y cuánto se gastó frente a las metas; y se pueden borrar los datos de 2025 con un rango y una confirmación.

## Fase 6 · Pulido, rendimiento y PWA

- [ ] Auditoría visual contra `06-diseno-ui.md` en 360 / 768 / 1280 px, claro y oscuro. Estados vacíos, skeletons y errores en todas las páginas.
- [ ] Lighthouse móvil ≥ 90 en rendimiento y accesibilidad; JS inicial < 180 kB gzip; análisis de bundle.
- [ ] PWA: iconos, splash, `display: standalone`, estrategia de caché de assets; probar instalación en Android e iOS.
- [ ] Playwright: flujos de humo móvil y escritorio (doc 05).
- [ ] Revisión de seguridad: headers, rate limits, rotación de refresh, aislamiento entre hogares, dependencias (`npm audit`).
- [ ] Despliegue: client en Vercel/Netlify o servido por el server; server + Postgres en Railway/Render/Fly o VPS con Docker. Variables de producción, `prisma migrate deploy` en el arranque, backups diarios de la BD.
- [ ] README final con guía de despliegue.

**Hecho cuando:** la pareja usa Homely desde sus celulares como app instalada, en casa y fuera, sin fricción.

## Después de la v1 (ideas aparcadas)

Notificaciones push (recordatorio de tareas de hoy, meta excedida) · recurrencias no semanales · varios hogares por usuario con selector · recuperación de contraseña por correo · adjuntar recibo a un gasto · widgets de pantalla de inicio (PWA) · modo "invitado" de solo lectura.
