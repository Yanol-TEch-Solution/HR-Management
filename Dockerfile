# ── Stage 1: build the Vite client ──────────────────────────────
FROM node:22-alpine AS client-build
WORKDIR /build

COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci

COPY client client
RUN npm run build --workspace=client

# ── Stage 2: runtime (server + built SPA, same origin) ─────────
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/
RUN npm ci --workspace=server

COPY server server
COPY --from=client-build /build/client/dist client/dist

RUN cd server && npx prisma generate --schema=prisma/schema.prisma

COPY docker-entrypoint.sh /app/docker-entrypoint.sh
RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["/app/docker-entrypoint.sh"]
