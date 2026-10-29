# Homely: un solo servicio que entrega la API y la web (mismo origen, sin CORS).
# Build:  docker build -t homely .
# Run:    docker run -p 4000:4000 --env-file server/.env.production homely

# ───────── 1. Build: compila shared, server y client ─────────
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
# --ignore-scripts: el hook de git (prepare) no aplica dentro de la imagen.
RUN npm ci --legacy-peer-deps --ignore-scripts
COPY . .
RUN cd server && npx prisma generate
RUN npm run build

# ───────── 2. Runtime: solo dependencias de producción del server ─────────
FROM node:22-alpine AS runtime
ENV NODE_ENV=production \
    PORT=4000 \
    CLIENT_DIST_DIR=/app/client/dist
WORKDIR /app
COPY package.json package-lock.json ./
COPY shared/package.json shared/
COPY server/package.json server/
COPY client/package.json client/
RUN npm ci --omit=dev --legacy-peer-deps --ignore-scripts \
      --workspace=@homely/server --workspace=@homely/shared \
    # Solo Prisma necesita su script de instalación (descarga los motores). Se hace aquí, como
    # root: en ejecución el usuario node no puede (ni debe) escribir en node_modules.
    && npm rebuild prisma @prisma/engines \
    && npm cache clean --force
COPY --from=build /app/shared/dist shared/dist
COPY --from=build /app/server/dist server/dist
COPY --from=build /app/server/prisma server/prisma
COPY --from=build /app/server/prisma.config.ts server/
COPY --from=build /app/client/dist client/dist
# Cliente de Prisma ya generado en el build (mismo Alpine, mismo motor). Sin chown: el
# usuario node solo necesita leer, y un chown -R duplicaría todos los archivos en otra capa.
COPY --from=build /app/node_modules/.prisma node_modules/.prisma

USER node
WORKDIR /app/server
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s \
  CMD wget -qO- http://localhost:${PORT}/api/v1/health || exit 1
# Aplica migraciones pendientes y arranca. Idempotente: seguro en cada despliegue.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
