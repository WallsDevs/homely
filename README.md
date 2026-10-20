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

En desarrollo, `http://localhost:5173/dev/ui` muestra la galería del sistema de diseño.
