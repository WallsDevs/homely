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

## Fase 4 · Gastos, categorías y metas — ✅ completada 2026-10-19

**Requisitos:** EX-01 … EX-08. ◇ EX-09 (gastos recurrentes), EX-11 (CSV) no implementados: sugerencias sin confirmar. EX-10 (balance) cubierto en parte: el resumen trae "quién pagó cuánto" (`byPayer`); sin liquidaciones.

- [x] `shared`: schemas de categorías (iconos permitidos), gastos, metas y resumen; `goalStatusOf` con los umbrales de EX-06; `periodRange`/`startOfMonth`/`endOfMonth`. El dinero viaja como string decimal.
- [x] Server: módulos `categories` (crear, editar, archivar, reordenar; nombres únicos), `expenses` (filtros por mes, categoría, quién pagó y texto; totales del filtro completo; cursor; permiso dueño/admin; `GET /expenses/summary` con total, vs. periodo anterior, por categoría, por pagador y metas), `goals` (CRUD, `DUPLICATE_GOAL`, progreso con consultas agregadas por periodo). Helper `withoutUndefined` para PATCH parciales con Prisma.
- [x] Client: Gastos (selector de mes, total del filtro, filtros, búsqueda, lista por día con subtotal), formulario de gasto (monto grande con teclado numérico que acepta coma, chips de categoría, Hoy/Ayer, descripción, quién pagó y forma de pago plegados) desde el "+" en cualquier pantalla, Metas (tarjetas con barra y estado), Categorías (admin: color, icono, orden, archivar). En el Inicio: gasto del mes, comparación con el mes anterior, top 3 categorías y avisos de metas en aviso o excedidas.
- [x] Tests: 16 de integración (precisión decimal 0.10 + 0.20, totales del filtro con paginación, umbrales 79,9 / 80 / 100 / 100,1 %, meta total vs. por categoría, semanal vs. mensual, permisos, categorías archivadas y de otro hogar, resumen) + tests de client (monto con coma, permisos por fila, tarjeta de meta).

**Hecho cuando:** registrar un gasto desde el celular toma menos de 10 segundos y al llegar al 80 % de la meta de Comida aparece el aviso ✅ (umbral cubierto por tests; formulario de un paso). Revisión visual pendiente de la dueña.

## Fase 5 · Reportes, historial y limpieza — ✅ completada 2026-10-19

**Requisitos:** RP-01 … RP-06, RP-10 … RP-15; dashboard completo. ◇ RP-07 (puntualidad), RP-08 (tendencia 12 semanas), RP-09 (resumen mensual) no implementados: sugerencias sin confirmar.

- [x] Server: módulo `reports` — `weekly` (hogar y miembros, delta vs. semana anterior, racha de semanas cerradas al 100 % hasta 52 semanas atrás, gastos y metas de la semana), `tasks/top-missed` (pendientes vencidas agrupadas por título, filtro por miembro), `tasks/history` (año de un miembro semana a semana, años disponibles). Cálculos puros en `report-stats.ts` con tests unitarios; una sola consulta liviana por reporte. Módulo `maintenance` — `purge/preview`, `purge` (solo semanas cerradas, confirmación con el nombre del hogar tolerante a mayúsculas/acentos, transacción, auditoría), `audit-log` paginado.
- [x] Client: Reportes (WeekPicker, semana abierta/cerrada, tiles con variación, barras por persona con racha, "lo que más se queda sin hacer" por semana / 4 semanas / año, gastos de la semana por categoría y por quién pagó, metas). Historial (persona y año en la URL, resumen anual, semanas con lo que quedó sin hacer). Ajustes → Datos del hogar (rango → vista previa → confirmación escribiendo el nombre; actividad del hogar). Inicio: tarjeta "Esta semana" con acceso al reporte. Sin librería de gráficos: barras con CSS (bundle inicial 124 kB gzip).
- [x] Tests: 15 de integración (omitidas no penalizan, delta, racha con semanas vacías, semana en curso abierta, gastos de la semana, top-missed sin futuro, historial con semanas fijas, aislamiento, purga: vista previa, nombre, solo el rango, no toca planes/categorías, auditoría, no semana actual ni futuro, solo admins) + unitarios de cálculo y formato.

**Hecho cuando:** al cerrar la semana se ve quién cumplió qué, qué tareas se quedaron sin hacer y cuánto se gastó frente a las metas; y se pueden borrar los datos de 2025 con un rango y una confirmación ✅ (prueba real: semana 12–18 oct, hogar 86 %, Luis 67 % con "Sacar la basura" sin hacer).

## Fase 6 · Pulido, rendimiento y PWA — ✅ completada 2026-10-20

- [x] **Robustez:** pantalla de error amable con «Recargar» (`RouteError`), página 404, enlace «Saltar al contenido». Las consultas sin datos previos que fallan muestran la pantalla de error en lugar de un esqueleto eterno (`throwOnError`); con datos previos siguen mostrándolos.
- [x] **Auditoría visual** con capturas reales de Playwright a 360 px y 1280 px, claro y oscuro (`e2e/screenshots/`). Corregido: las pestañas de Tareas se recortaban en móvil (`SegmentedControl scrollable`), `cn()` no resolvía conflictos de clases Tailwind (ahora usa `tailwind-merge` con los tamaños de texto propios), y las comparaciones «vs. semana/mes anterior» a mitad de periodo engañaban (solo se muestran en semanas cerradas; el Inicio muestra el mes anterior como referencia).
- [x] **Sesión:** margen de gracia de 30 s al rotar el refresh token (recargar a mitad de la rotación ya no cierra la sesión); el reuso fuera del margen sigue revocando toda la familia. Columna `rotatedAt` (migración aditiva).
- [x] **Rendimiento:** mutaciones no bloquean en la invalidación (el formulario se cierra al confirmar el server). JS inicial 125 kB gzip (presupuesto 180). Lighthouse no se midió (sin herramienta en el entorno); queda como comprobación manual.
- [x] **PWA:** iconos PNG 64/192/512 + maskable 512 + apple-touch-icon 180 generados con `npm run icons -w @homely/client` (sharp) desde los SVG; metas de iOS; `theme-init.js` externo para cumplir la CSP.
- [x] **Playwright:** 10 pruebas de humo (login, recorrido por las 14 pantallas, completar y deshacer tarea, registrar gasto desde el «+», modo oscuro) × móvil y escritorio, contra el build de producción y la BD de test. `npm run e2e`.
- [x] **Seguridad:** CSP estricta sin `unsafe-inline` (`helmet`), HSTS, rate limits configurables por entorno (`RATE_LIMIT_PER_MINUTE`, `AUTH_RATE_LIMIT_PER_MINUTE`) con log al alcanzarlos, Vitest actualizado a 4 (cerraba 2 críticas y 1 moderada de `npm audit`). Quedan 3 avisos «high» en la CLI de Prisma 6 (`deepmerge-ts` vía `@prisma/config`): afectan solo a la herramienta de migraciones, no al server en ejecución; se cierran al migrar a Prisma 7.
- [x] **Producción en un solo servicio:** el server entrega el client compilado (`CLIENT_DIST_DIR`), mismo origen → sin CORS; assets con hash cacheados 1 año, `index.html` con `no-cache`; la API sigue respondiendo JSON en sus 404. `Dockerfile` multi-etapa (635 MB, usuario `node`, healthcheck, `prisma migrate deploy` al arrancar) probado localmente contra la BD de test. Guía en el README.
- [x] Hook pre-commit (`simple-git-hooks` + `lint-staged`: oxlint --fix + prettier). `.npmrc` con `legacy-peer-deps` por un fallo de npm 10 en este monorepo.

**Hecho cuando:** la pareja usa Homely desde sus celulares como app instalada, en casa y fuera, sin fricción → listo para desplegar; la instalación real en Android/iOS la valida la dueña tras publicarla.

## Pendientes para después de desplegar

- Medir Lighthouse móvil en la URL pública (objetivo ≥ 90 en rendimiento y accesibilidad).
- Backups diarios de la BD (los ofrece el proveedor: Neon, Supabase, Railway).
- Migrar a Prisma 7 cuando se disponga de tiempo (cierra los avisos de `npm audit`).
- Reducir la imagen Docker (635 MB): la mayor parte es Prisma CLI + motores; con Prisma 7 y driver adapters debería bajar.

## v1.1 · Pausas de planes («modo vacaciones») — ✅ completada 2026-10-20

**Requisitos:** PL-09 … PL-12 (petición de la dueña tras la v1).

- [x] Modelo `PlanPause` (migración aditiva) con tres alcances: hogar, persona o plan.
- [x] Server: `plan-pauses.ts` (`isPaused`, `pausesOverlapping`), `materializeWeek` salta días pausados, `resetRange` (generaliza `resetFuture`) rehace la unión de rangos al crear/editar/borrar; `nextOccurrence` salta pausas con horizonte de 90 días. Módulo `/plan-pauses` (list, create, update, delete) con auditoría. 10 tests de integración + 4 unitarios + 5 de contratos.
- [x] Client: tarjeta "Pausas" en Planes (alta con alcance, fechas y motivo; editar; terminar hoy / eliminar), insignia "En pausa hasta…" por plan, aviso en el Inicio. 6 tests.
- [x] E2E: crear pausa de hogar, verla en el Inicio y terminarla (móvil y escritorio).

## Después de la v1 (ideas aparcadas)

Notificaciones push (recordatorio de tareas de hoy, meta excedida) · recurrencias no semanales · varios hogares por usuario con selector · recuperación de contraseña por correo · adjuntar recibo a un gasto · widgets de pantalla de inicio (PWA) · modo "invitado" de solo lectura.
