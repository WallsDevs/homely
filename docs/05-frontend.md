# 05 · Frontend

React 19 + Vite + TypeScript. SPA con rutas cargadas bajo demanda, instalable como PWA. Mobile-first: el diseño base es el de un teléfono y se expande hacia tablet y escritorio.

## Librerías y responsabilidades

| Librería | Para qué | Por qué |
|---|---|---|
| **React Router v7** | rutas, layouts anidados, lazy loading | estándar, soporta `lazy()` por ruta |
| **TanStack Query v5** | datos de servidor: caché, invalidación, optimistic updates | elimina estado global para datos remotos; reintentos y prefetch gratis |
| **Zod** (desde `shared/`) | validar formularios y respuestas de API | mismos schemas que el server |
| **react-hook-form** + `@hookform/resolvers` | formularios | rendimiento sin re-renders, integración Zod |
| **Tailwind CSS v4** | estilos con tokens propios | utilidades, purgado automático, tema claro/oscuro con variables CSS |
| **lucide-react** | iconos | ligeros, consistentes, tree-shakeable |
| **Recharts** | gráficos de reportes | SVG, responsive, suficiente para barras/líneas/anillos |
| **date-fns** + `date-fns-tz` | fechas y zona horaria del hogar | funcional, tree-shakeable |
| **vite-plugin-pwa** | manifest + service worker | instalable, caché de assets |

No se usa Redux, MobX ni Zustand en v1. El estado de UI es local; el poco estado global (sesión, tema) va en contextos pequeños.

## Estructura de carpetas

```
client/src/
├── app/
│   ├── router.tsx            # rutas + lazy + guards
│   ├── providers.tsx         # QueryClient, Theme, Auth, Toaster
│   └── layouts/
│       ├── AppLayout.tsx     # shell: nav inferior (móvil) / sidebar (escritorio)
│       └── AuthLayout.tsx
├── features/
│   ├── auth/        # login, registro, onboarding (crear/unirse)
│   ├── dashboard/
│   ├── tasks/       # mis tareas, tablero, formulario
│   ├── plans/
│   ├── members/
│   ├── expenses/    # gastos, categorías, metas
│   ├── reports/
│   └── settings/    # hogar, perfil, limpieza de datos, auditoría
│       └── cada feature:
│           ├── api/          # funciones fetch tipadas + query keys + hooks useX()
│           ├── components/   # componentes de la feature
│           ├── pages/        # una por ruta
│           └── index.ts      # exports públicos
├── shared/
│   ├── ui/          # sistema de diseño: Button, Input, Card, Dialog, BottomSheet, …
│   ├── lib/         # apiClient, formatters (money, date), cn(), hooks genéricos
│   ├── hooks/       # useMediaQuery, useDebounce, …
│   └── types/
└── styles/
    └── globals.css  # tokens (@theme), reset, tipografía
```

Reglas:
- Una feature **no importa** de otra feature; comparte vía `shared/`.
- `pages/` solo compone; la lógica está en hooks (`useTasks`, `useCompleteTask`).
- Todo acceso a red pasa por `shared/lib/apiClient.ts` (inyecta token, refresca en 401, parsea errores a `ApiError`).

## Rutas y páginas

| Ruta | Página | Acceso | Notas |
|---|---|---|---|
| `/login` · `/register` | Login, Registro | público | redirige a `/` si ya hay sesión |
| `/onboarding` | Crear o unirse a hogar | auth sin hogar | dos tarjetas: "Crear hogar" / "Tengo un código" |
| `/` | Dashboard | miembro | hoy, avisos, semana, gastos del mes, acciones rápidas |
| `/tasks` | Mis tareas | miembro | inicio en móvil junto al dashboard; tabs Hoy · Semana · Vencidas |
| `/tasks/board` | Tablero del hogar | miembro | semana por miembro; en móvil, carrusel de miembros |
| `/tasks/:id` | Detalle de tarea | miembro | hoja en móvil, panel lateral en escritorio |
| `/plans` · `/plans/new` · `/plans/:id` | Planes | miembro (editar: admin) | |
| `/members` | Miembros e invitaciones | miembro (gestionar: admin) | |
| `/expenses` | Gastos | miembro | lista agrupada por día + total del filtro |
| `/expenses/categories` | Categorías | admin | |
| `/expenses/goals` | Metas | miembro (editar: admin) | tarjetas con barra de progreso y estado |
| `/reports` | Reporte semanal | miembro | selector de semana; secciones: hogar, miembros, más incumplidas, gastos, metas |
| `/reports/history` | Historial anual | miembro | selector de miembro y año |
| `/settings` | Ajustes del hogar y perfil | miembro (hogar: admin) | |
| `/settings/data` | Limpieza de datos | admin | rango → preview → confirmación escribiendo el nombre |

Guards: `RequireAuth` (sin sesión → `/login`), `RequireHousehold` (sin hogar → `/onboarding`), `RequireRole('ADMIN')` (oculta rutas admin y muestra 403 amable si se entra por URL).

## Responsive: comportamiento por tamaño

Breakpoints (Tailwind): `sm 640` · `md 768` · `lg 1024` · `xl 1280`. "Móvil" = `< md`, "tablet" = `md–lg`, "escritorio" = `≥ lg`.

| Elemento | Móvil | Tablet | Escritorio |
|---|---|---|---|
| Navegación | barra inferior fija con 5 destinos (Inicio, Tareas, Gastos, Reportes, Más) | sidebar colapsada (iconos) | sidebar expandida (icono + texto) |
| Acciones rápidas | FAB "+" que abre menú: Nueva tarea / Nuevo gasto | igual que móvil | botones en el header |
| Formularios | **BottomSheet** a pantalla casi completa, campos apilados, teclado numérico para montos | Dialog centrado | Dialog centrado o panel lateral |
| Listas de datos (tareas, gastos) | tarjetas apiladas con la info esencial; swipe para completar/eliminar | tarjetas en 2 columnas | tabla densa con columnas |
| Tablero semanal | carrusel horizontal: un miembro por pantalla, con puntos de paginación | 2 miembros por fila | todos los miembros en columnas |
| Reportes | tiles 2×2, gráficos a ancho completo, barras horizontales | tiles 4×1 | tiles + gráficos en grid 2 columnas |
| Selector de semana | chips ‹ Semana › pegado arriba | igual | igual, junto al título |
| Detalle de tarea | BottomSheet | Dialog | panel lateral derecho sin salir de la lista |

Reglas:
- **Nunca** scroll horizontal de página. Las tablas que no quepan se convierten en tarjetas, no se encogen.
- Áreas táctiles ≥ 44 × 44 px. Checkbox de completar tarea grande y a la izquierda (zona del pulgar).
- `100dvh` para alturas de pantalla completa (evita el salto de la barra del navegador móvil).
- Safe areas de iOS (`env(safe-area-inset-bottom)`) en la barra inferior y el FAB.
- Inputs con `inputmode="decimal"` para montos y `type="date"` nativo en móvil.
- Probar en 360 px de ancho como mínimo soportado.

## Estado y datos

- **Query keys** por feature: `['tasks', 'mine']`, `['tasks', 'board', weekStart]`, `['expenses', filters]`, `['reports', 'weekly', weekStart]`, `['goals']`, `['dashboard']`.
- **Invalidación**: completar tarea → invalida `tasks.*`, `reports.weekly`, `dashboard`. Crear gasto → `expenses.*`, `goals`, `reports.expenses`, `dashboard`.
- **Optimistic updates** en: completar/deshacer tarea, crear gasto. Rollback con toast en error.
- **Prefetch**: al abrir el dashboard se prefetchan `tasks.mine` y `goals`; al pasar el cursor/foco sobre la semana siguiente en reportes se prefetcha esa semana.
- **Sesión**: access token en memoria (no `localStorage`); al cargar la app se llama `POST /auth/refresh` y luego `GET /auth/me`. En `401` el `apiClient` reintenta una vez tras refrescar.
- **Tema**: `light | dark | system`, persistido en `localStorage`, aplicado como `data-theme` en `<html>` antes del primer render (script inline para evitar flash).

## Rendimiento

- Code-splitting por ruta con `React.lazy` + `Suspense` con skeletons (no spinners).
- Recharts se carga solo en `/reports` y en el widget del dashboard (chunk separado).
- Imágenes: avatares en WebP, `loading="lazy"`.
- Listas largas (gastos del año): paginación por cursor con "cargar más"; virtualización solo si se supera ~500 elementos visibles.
- Presupuesto: JS inicial < 180 kB gzip; Lighthouse móvil ≥ 90 en rendimiento y accesibilidad.
- `React.memo` solo donde el profiler lo justifique.

## Accesibilidad

- Todo interactivo accesible por teclado; foco visible (anillo del acento).
- Dialog/BottomSheet con foco atrapado y cierre con Esc; `aria-labelledby`.
- Contraste AA mínimo en ambos temas. Colores de miembro y categoría nunca son el único indicador (se acompañan de texto o icono).
- `aria-live="polite"` para toasts y para el resultado de completar una tarea.

## Formularios clave (mobile-first)

**Nuevo gasto** (EX-01): monto (grande, foco automático, `inputmode="decimal"`) → chips de categoría (scroll horizontal, la última usada primero) → fecha (hoy por defecto, cambio en un toque) → descripción (opcional) → "Guardar". Dos toques y teclado para el caso común.

**Nueva tarea** (TK-01): título → asignado (avatares seleccionables) → fecha (Hoy · Mañana · Elegir) → prioridad (segmented) → descripción (plegada). "Guardar" y "Guardar y crear otra".

**Nuevo plan** (PL-01): título → días de la semana (7 chips `L M X J V S D`) → responsable fijo o rotación **[Sugerencia]** → prioridad → fechas opcionales (plegadas).

## Testing

- **Vitest + Testing Library**: hooks de datos (con `msw` para simular la API), componentes de `shared/ui`, formularios críticos (gasto, tarea, plan).
- **Playwright** (Fase 6): flujos de humo en viewport móvil y escritorio: login → crear hogar → crear plan → completar tarea → ver reporte; registrar gasto → ver meta en WARNING.
