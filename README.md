# Homely

Aplicación web para gestionar un hogar entre varias personas:

- **Tareas** puntuales y **planes semanales** que se reasignan solos cada semana ("sacar la basura: miércoles y sábado").
- **Miembros** con cuenta propia; varios administradores con permisos idénticos.
- **Reportes** semanales de cumplimiento por miembro, historial del año en curso y limpieza de datos por rango de fechas.
- **Gastos** por categoría con **metas** semanales o mensuales y avisos al acercarse al límite.

Diseño minimalista y sofisticado, mobile-first, instalable como PWA.

## Documentación

Toda la especificación está en [docs/](docs/). Empieza por [docs/00-vision.md](docs/00-vision.md). El archivo [CLAUDE.md](CLAUDE.md) resume stack, principios y reglas de código.

## Estructura

```
Homely/
├── client/   # React 19 + Vite + TypeScript
├── server/   # Express 5 + TypeScript + Prisma
├── shared/   # schemas Zod, enums y constantes compartidos
└── docs/     # especificación del producto y la arquitectura
```

## Requisitos

Node 22+ y Docker.

## Primer arranque

```bash
npm install
cp server/.env.example server/.env   # y cambia JWT_ACCESS_SECRET por uno aleatorio
npm run db:up                        # Postgres en Docker, puerto 5433
npm run db:migrate
npm run db:seed                      # datos de ejemplo
npm run dev                          # http://localhost:5173  ·  API en :4000/api/v1
```

Generar un secreto: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`.

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | server + client con recarga en caliente |
| `npm test` | tests de todos los workspaces |
| `npm run typecheck` | TypeScript estricto en todo el monorepo |
| `npm run lint` / `lint:fix` | Oxlint + Prettier |
| `npm run build` | build de producción |
| `npm run db:studio` | explorar la BD con Prisma Studio |

| `npm run e2e` | pruebas de punta a punta con Playwright (móvil y escritorio) + capturas en `e2e/screenshots/` |

En desarrollo, `http://localhost:5173/dev/ui` muestra la galería del sistema de diseño.

## Probar desde el celular en casa

Vite solo escucha en `localhost`. Para abrirlo desde el teléfono en la misma red Wi-Fi:

```bash
npm run dev -w @homely/client -- --host
```

y entra desde el celular a `http://<IP-de-tu-PC>:5173` (la IP aparece en la terminal como «Network»).

## Despliegue

Homely se publica como **un solo servicio**: el server entrega la API y la web compilada desde el mismo dominio. Necesitas un PostgreSQL (Neon, Supabase o Railway tienen planes gratuitos con backups) y un sitio donde correr un contenedor Docker (Railway, Render, Fly.io o un VPS).

### Variables de entorno de producción

```
NODE_ENV=production
PORT=4000
CLIENT_ORIGIN=https://tu-dominio.com
TRUST_PROXY=true                 # detrás de Railway/Render/Fly/nginx
DATABASE_URL=postgresql://...    # la de tu proveedor
JWT_ACCESS_SECRET=...            # node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
LOG_LEVEL=info
REGISTRATION_ENABLED=false       # true solo mientras se crean las cuentas
```

`CLIENT_DIST_DIR` ya viene fijado en la imagen. Las migraciones se aplican solas al arrancar (`prisma migrate deploy`).

### Con Docker

```bash
docker build -t homely .
docker run -d -p 4000:4000 --env-file .env.production homely
```

La imagen corre como usuario sin privilegios, expone un healthcheck en `/api/v1/health` y pesa ~635 MB.

### En Railway

`railway.json` ya fija el build con el `Dockerfile` y el healthcheck.

1. **New Project → Deploy from GitHub repo** → este repositorio.
2. **+ New → Database → PostgreSQL**.
3. Servicio de Homely → **Settings → Networking → Generate Domain**.
4. Servicio de Homely → **Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=${{Postgres.DATABASE_URL}}
   CLIENT_ORIGIN=https://<tu-dominio>.up.railway.app
   TRUST_PROXY=true
   JWT_ACCESS_SECRET=<secreto de 48 bytes>
   REGISTRATION_ENABLED=true
   ```
5. Cuando termine el deploy, `https://<tu-dominio>/api/v1/health` debe responder `ok: true`.
6. Crea las cuentas (ver «Después de publicar») y cambia `REGISTRATION_ENABLED=false`.
7. Postgres → **Backups**: actívalos.

### Después de publicar

1. Abre la URL en el celular y usa «Añadir a la pantalla de inicio»: Homely se instala como app, con su icono, sin barra del navegador.
2. Regístrate, crea tu hogar e invita a tu pareja con un código de **administrador** desde *Miembros → Invitar*.
3. Activa los backups diarios de la base de datos en tu proveedor.
