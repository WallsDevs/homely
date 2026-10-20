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

## Fase 1 · Auth, hogar y miembros — ✅ completada 2026-10-19

**Requisitos:** HM-01 … HM-08, doc 01 completo.

- [x] `shared`: schemas de auth, household, invitation, member (+ tests de normalización de código, correo y zona horaria).
- [x] Server: módulos `auth` (register, login, refresh con rotación y detección de reuso por familia, logout, logout-all, me), `households` (create, current, patch, join), `invitations`, `members` (regla `LAST_ADMIN` en transacciones `Serializable`). Middlewares `requireAuth`, `requireHousehold` (consulta la membresía en cada petición: desactivar surte efecto inmediato), `requireRole`. Auditoría de roles, estados, invitaciones y cambios del hogar. Categorías semilla al crear hogar.
- [x] 44 tests de integración del server: registro/login (incl. respuesta idéntica para correo inexistente), refresh y reuso de token, logout-all, crear hogar, unirse con código ADMIN y MEMBER, código usado/revocado/expirado, último admin, aislamiento entre hogares (404), permisos de MEMBER, desactivación y reingreso.
- [x] Client: Login, Registro, Onboarding (crear / unirse), Miembros (lista, invitaciones con copiar/compartir, cambio de rol y estado), Ajustes (perfil con color, hogar, apariencia, sesión, salir del hogar). Guards de rutas. Sesión en memoria con refresh automático y single-flight. Saludo con nombre en el inicio.
- [x] Corregido: el selector de tema del sidebar se desbordaba (ahora iconos en escritorio, botón cíclico en tablet).
- ⏳ Avatar con foto (`avatarUrl`): fuera de v1; se usan iniciales sobre el color del miembro.

**Hecho cuando:** dos personas pueden registrarse, una crea el hogar y la otra entra como ADMIN con un código, y ambas ven lo mismo ✅ (cubierto por tests y prueba manual por API). Revisión visual en celular pendiente de la dueña.

## Fase 2 · Tareas — ✅ completada 2026-10-19

**Requisitos:** TK-01 … TK-10.

- [x] `shared`: schemas de task, filtros (CSV de estados), mis tareas y tablero. Las utilidades de calendario (`startOfWeek`, `todayIn`, …) pasaron a `shared/src/dates.ts` para usarlas también en el client.
- [x] Server: módulo `tasks` (list con filtros, búsqueda y cursor; mine; board con columna por miembro activo y "sin asignar"; CRUD; complete/uncomplete/skip). Estado "vencida" calculado con la zona del hogar. 15 tests de integración.
- [x] Client: Tareas (Hoy · Semana · Vencidas · Todas con búsqueda y filtros), Tablero semanal (carrusel en móvil, rejilla en escritorio, "+" por miembro), ficha de detalle, formulario de tarea (asignar con avatares, Hoy/Mañana, prioridad, notas, "Guardar y crear otra"), completar optimista con "Deshacer", WeekPicker, tareas de hoy en el Inicio y aviso de vencidas. El botón "+" ya crea tareas (admins).
- [x] Tests del client: permisos del check, optimistic update y reversión con error, formato de fechas.

**Hecho cuando:** un admin crea y asigna tareas desde el celular y el asignado las completa en un toque; el tablero muestra la semana por miembro ✅ (tests + prueba real contra la BD con el seed). Revisión visual pendiente de la dueña.

## Fase 3 · Planes y generación semanal — ✅ completada 2026-10-19

**Requisitos:** PL-01 … PL-05, PL-07, PL-08. ◇ PL-06 (rotación) no implementada: queda como sugerencia sin confirmar.

- [x] Modelo `PlanMaterialization (planId, weekStart)`: registra qué semanas generó cada plan. La generación ocurre una sola vez por plan y semana, así que una tarea borrada a mano no reaparece. Migración aditiva (sin pérdida de datos).
- [x] Server: módulo `plans` (CRUD, `PATCH /plans/:id/status`, detalle con próximas tareas). `plan-generation.ts`: `materializeWeek` idempotente (nunca días pasados, respeta `startsOn/endsOn`), generación inmediata al crear/activar, `resetFuture` al editar/pausar/eliminar (rehace pendientes futuras y conserva completadas). Generación perezosa en `tasks/mine` y `tasks/board` (semana actual y hasta 4 adelante). Job horario con node-cron que asegura la semana actual de cada hogar según su zona horaria.
- [x] Client: pantalla de Planes (activos y en pausa, chips L M X J V S D, próxima fecha, aviso "sin responsable", interruptor para pausar), formulario (días, responsable, prioridad, notas, fechas de vigencia, eliminar). `MemberPicker` compartido con el formulario de tareas. Aviso en el Inicio de planes sin responsable (admins).
- [x] 16 tests de integración: generación inicial, idempotencia triple (vistas + job), tarea borrada no reaparece, perezosa hasta 4 semanas, nunca semanas pasadas, editar días, pausar/activar, eliminar conservando historial, vigencia, semana domingo-sábado, responsable desactivado, job multi-hogar.

**Hecho cuando:** "Sacar la basura · miércoles y sábado · Luis" genera sus dos tareas cada semana sin que nadie haga nada, y lo hace una sola vez ✅ (tests + prueba real: la semana siguiente apareció con basura el miércoles 28 y el sábado 31 para Luis).

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
