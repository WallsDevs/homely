# 08 · Stack y convenciones

## Stack definitivo

### Monorepo
npm workspaces en la raíz: `client`, `server`, `shared`. Un solo `npm install`, scripts raíz que orquestan los tres.

```json
// package.json (raíz)
{
  "name": "homely",
  "private": true,
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev": "concurrently -n client,server -c cyan,green \"npm:dev -w client\" \"npm:dev -w server\"",
    "build": "npm run build -w shared && npm run build -w server && npm run build -w client",
    "test": "npm run test --workspaces --if-present",
    "lint": "eslint . && prettier --check .",
    "format": "prettier --write .",
    "typecheck": "tsc -b",
    "db:migrate": "npm run db:migrate -w server",
    "db:seed": "npm run db:seed -w server",
    "db:studio": "npm run db:studio -w server"
  }
}
```

### `shared/`
Paquete TypeScript puro (`@homely/shared`) con schemas Zod, tipos derivados (`z.infer`), enums y constantes (umbrales de metas, límites). Lo importan client y server. Sin dependencias de runtime salvo `zod`.

### Client
| Librería | Versión mín. | Motivo |
|---|---|---|
| react, react-dom | 19 | ya instalado |
| vite, @vitejs/plugin-react | 8 | ya instalado |
| react-router | 7 | rutas y lazy loading |
| @tanstack/react-query | 5 | datos de servidor |
| react-hook-form, @hookform/resolvers | 7 | formularios + Zod |
| tailwindcss, @tailwindcss/vite | 4 | estilos con tokens |
| lucide-react | — | iconos |
| recharts | 2 | gráficos |
| date-fns, date-fns-tz | 4 / 3 | fechas |
| vite-plugin-pwa | — | PWA |
| vitest, @testing-library/react, @testing-library/user-event, msw, jsdom | — | tests |

### Server
| Librería | Motivo |
|---|---|
| express 5 | ya instalado; manejo nativo de promesas |
| prisma, @prisma/client | ORM + migraciones |
| zod (vía shared) | validación |
| jsonwebtoken | JWT access |
| argon2 | hash de contraseñas |
| cookie-parser | refresh cookie |
| helmet, cors, express-rate-limit, compression | seguridad y rendimiento |
| pino, pino-http, pino-pretty (dev) | logs |
| node-cron | jobs |
| dotenv | ya instalado; solo en `env.ts` |
| tsx | dev con recarga (ya instalado) |
| vitest, supertest | tests |

### Infraestructura local
`docker-compose.yml` en la raíz con Postgres 16 (`homely` y `homely_test`). Alternativa sin Docker: Neon o Supabase gratuitos (solo cambia `DATABASE_URL`).

## Decisiones tomadas en la Fase 0 (2026-10-19)

Ajustes respecto a lo planeado arriba, con su motivo. Prevalecen sobre las tablas anteriores.

| Tema | Decisión | Motivo |
|---|---|---|
| Linter | **Oxlint** (no ESLint) + Prettier, config en `.oxlintrc.json` raíz | `typescript-eslint` no soporta TypeScript 7 (compilador nativo). Oxlint no depende del API de TS y es ~50× más rápido. Incluye reglas `jsx-a11y`, `react`, `import`, `vitest`. |
| Hash de contraseñas | **`@node-rs/argon2`** (argon2id) | `argon2` necesita compilar C++ con node-gyp y falla en Windows; `@node-rs/argon2` trae binarios precompilados, mismo algoritmo. |
| Prisma | **6.19** con `prisma-client-js`, config en `server/prisma.config.ts` | Prisma 7 obliga a driver adapters y cambia el generador; no aporta nada ahora. Migrar cuando haya motivo. |
| Fechas en server | **`Intl` nativo** (`server/src/lib/dates.ts`), sin `date-fns` | Aritmética de días ISO pura en UTC + `Intl.DateTimeFormat` para "hoy" en la zona del hogar. Cero dependencias, 100 % testeado. |
| Validación HTTP | **`endpoint(schemas, handler)`** en `server/src/lib/endpoint.ts` en vez de middleware `validate` | En Express 5 `req.query` es de solo lectura; además así el handler recibe `body/query/params` tipados sin casts. |
| Paquete `shared` | `exports` con condición **`source`** → `src/*.ts` en desarrollo y tests; `default` → `dist/*.js` en producción | Sin paso de build en desarrollo; build real para `node` en producción. `tsx`, Vite y Vitest usan `--conditions=source`. |
| Postgres local | Docker en el puerto **5433** (`homely` y `homely_test`) | Evita choques con un Postgres instalado en 5432. |
| Fuente | `@fontsource-variable/inter` servida por el propio sitio | Sin peticiones a terceros; la PWA solo precachea los subconjuntos latinos. |
| Modales | `<dialog>` nativo (`shared/ui/sheet.tsx`) | Foco atrapado, Esc, `inert` del fondo y backdrop sin librerías. |
| Hooks de git | `simple-git-hooks` + `lint-staged` (oxlint --fix + prettier en pre-commit) | Instalados en Fase 6. Se activan con `npm install` (script `prepare`). |

## Decisiones de la Fase 6 (2026-10-20)

| Tema | Decisión | Motivo |
|---|---|---|
| Tests | **Vitest 4** | Cerraba vulnerabilidades críticas de `npm audit` (tinypool, @vitest/mocker). Requiere `@testing-library/dom` explícito. |
| Clases CSS | `cn()` = `clsx` + **`tailwind-merge`** con los tamaños de texto propios registrados | Sin merge, `cn('p-4', 'p-0')` dejaba ambas clases y ganaba la que Tailwind generara después. |
| E2E | **Playwright** (Chromium) contra el build de producción y la BD de test; proyectos `movil` (360 px) y `escritorio` (1280 px); capturas en `e2e/screenshots/` | Es la única forma de revisar el diseño real sin navegador a mano. Nunca toca la BD de desarrollo. |
| Despliegue | **Un solo servicio**: el server entrega el client (`CLIENT_DIST_DIR`). `Dockerfile` multi-etapa con usuario `node` y `prisma migrate deploy` al arrancar | Mismo origen → sin CORS ni configuración de cookies cruzadas. |
| CSP | Estricta, sin `unsafe-inline`; el script de tema se sirve como archivo (`theme-init.js`) | Un XSS no puede ejecutar scripts en línea ni cargar de terceros. |
| Rate limit | Configurable por entorno; global 300/min (un hogar comparte IP), auth 10/min | 100/min se quedaba corto para dos personas navegando desde el mismo router. |
| Refresh token | Margen de gracia de 30 s tras rotar (`rotatedAt`) | Una recarga a mitad de la rotación dejaba al navegador con la cookie vieja y cerraba la sesión. |
| npm | `.npmrc` con `legacy-peer-deps=true` | npm 10 falla con `edgesOut` al resolver peers opcionales de `@hookform/resolvers`. |
| Iconos PWA | PNG generados con `sharp` (`npm run icons -w @homely/client`) | iOS no acepta SVG como icono de pantalla de inicio. |

## Ajustes al scaffold actual (Fase 0) — ✅ hechos

- `server/package.json`: añadir `"type": "module"`, scripts `build` (`tsc -p tsconfig.build.json`), `start` (`node dist/server.js`), `test`, `db:*`.
- `server/tsconfig.json`: reemplazar el generado por `tsc --init` por uno limpio con `types: ["node"]`, `rootDir: src`, `outDir: dist`, `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `module: NodeNext`.
- `server/src/index.ts` → se divide en `app.ts` y `server.ts`; el puerto sale de `env`.
- `client/vite.config.ts`: proxy `/api → http://localhost:4000`, plugin Tailwind, plugin PWA, alias `@/` → `src/`.
- `client/index.html`: título "Homely", `lang="es"`, meta `theme-color`, script inline anti-flash de tema.
- Eliminar las carpetas vacías `cd/`, `init/`, `npm/`, `-y/` y `inicio del proyecto.txt` (residuos de un comando mal escrito).
- Reemplazar Oxlint por ESLint 9 (flat config) + Prettier compartidos en la raíz, para tener las mismas reglas en client, server y shared. (Oxlint es válido, pero no cubre todavía las reglas de tipado que queremos en el server.)

## Variables de entorno

`server/.env.example` (copiar a `server/.env` y generar un secreto propio):
```
NODE_ENV=development
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
TRUST_PROXY=false
DATABASE_URL=postgresql://homely:homely@localhost:5433/homely
DATABASE_URL_TEST=postgresql://homely:homely@localhost:5433/homely_test
JWT_ACCESS_SECRET=change-me-to-a-random-string-of-at-least-32-chars
JWT_ACCESS_TTL=15m
REFRESH_TTL_DAYS=30
LOG_LEVEL=debug
```

`client/.env.example`:
```
VITE_API_URL=/api/v1
```

`env.ts` valida todo con Zod al arrancar; el proceso falla con un mensaje claro si falta algo.

## Convenciones de código

### Nombres
- Código, BD, API, archivos: **inglés**. Textos de UI y documentación: **español**.
- Archivos: `kebab-case.ts`; componentes React `PascalCase.tsx`; hooks `useX.ts`; tests `*.test.ts(x)` junto al archivo.
- Tipos e interfaces `PascalCase` sin prefijo `I`. Enums de Prisma en `SCREAMING_SNAKE`.
- Funciones de repositorio: `findX`, `findManyX`, `createX`, `updateX`, `deleteX`. De service: verbos de negocio (`completeTask`, `materializeWeek`, `purgeRange`).

### TypeScript
- `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noUnusedLocals`.
- Prohibido `any`, `as unknown as`, `!` (non-null) salvo comentario justificando.
- Preferir `type` a `interface` salvo para extensión declarativa.
- Tipos derivados de Zod (`z.infer`) y de Prisma; no duplicar a mano.
- Funciones pequeñas, retorno temprano, sin `else` tras `return`.

### React
- Componentes función, props tipadas con `type Props = {...}`.
- Sin `useEffect` para derivar estado; derivar en render o con `useMemo` si es caro.
- Datos remotos solo vía hooks de TanStack Query en `features/*/api`.
- Clases Tailwind ordenadas por el plugin de Prettier; `cn()` para condicionales.
- Sin estilos inline salvo valores dinámicos (color de miembro).

### Express
- Un router por módulo montado en `app.ts`.
- Controllers `async` sin `try/catch`; Express 5 propaga.
- Nunca `res.json` fuera de controllers.

### Formato y lint
- Prettier: `semi: true`, `singleQuote: true`, `printWidth: 100`, `trailingComma: 'all'`.
- ESLint 9 flat config con `typescript-eslint` (`strict-type-checked`), `react-hooks`, `jsx-a11y`, `import/order`.
- Hook pre-commit con `lint-staged` (eslint --fix + prettier) vía `simple-git-hooks`.

### Git
- Inicializar repo en Fase 0. Rama principal `main`; ramas `feat/…`, `fix/…`, `docs/…`.
- Commits convencionales: `feat(tasks): completar tarea con registro de quién y cuándo`. Cuerpo opcional con el ID de requisito (`TK-03`).
- Cada fase del roadmap termina con un commit o PR que deja `npm run lint && npm run typecheck && npm run test` en verde.

### Tests
- Nombre descriptivo en español del comportamiento: `it('no permite degradar al último admin')`.
- Un `describe` por service/endpoint. Factories en vez de fixtures JSON.
- Cobertura objetivo: services ≥ 90 %, endpoints críticos (auth, permisos, purga, generación) 100 % de ramas.

### Documentación
- Cambios de producto → actualizar primero `docs/02-modulos-funcionales.md` (y el ID de requisito), luego código.
- Decisiones técnicas relevantes → nota breve en el doc correspondiente con fecha.
