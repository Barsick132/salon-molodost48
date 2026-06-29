# =============================================================================
# molodost48 api — multi-stage Dockerfile.
#
# Build:   docker build -t molodost48-api -f apps/api/Dockerfile .
# Run:     docker run --rm -p 3000:3000 --env-file apps/api/.env molodost48-api
# Compose: see docker-compose.yml (dev only)
#
# Production note: 1 GB RAM VPS with native Postgres + systemd — we deploy
# natively (see deploy/systemd/). Use this image for dev / CI build only.
# =============================================================================

# ---- Stage 1: deps --------------------------------------------------------
FROM node:20-alpine AS deps
RUN corepack enable
WORKDIR /repo
COPY pnpm-workspace.yaml package.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# ---- Stage 2: build -------------------------------------------------------
FROM node:20-alpine AS build
RUN corepack enable
WORKDIR /repo

# Copy built deps + source
COPY --from=deps /repo /repo
COPY packages/shared/ ./packages/shared/
COPY apps/api/ ./apps/api/
COPY tsconfig.base.json* ./

# Generate Prisma client (uses placeholder URL — only needs the schema to exist)
ENV DATABASE_URL=postgresql://placeholder:placeholder@127.0.0.1:5432/placeholder?schema=public
WORKDIR /repo/apps/api
RUN pnpm exec prisma generate

# Build
WORKDIR /repo
RUN pnpm --filter @molodost/api run build

# Prune dev deps for runtime
RUN pnpm --filter @molodost/api --prod deploy /prod/api
# Move shared package too (workspace symlink → real copy)
WORKDIR /prod/api
RUN rm -rf node_modules/@molodost/shared
COPY --from=build /repo/packages/shared /prod/shared
WORKDIR /prod/api
RUN npm install --omit=dev /prod/shared
# Clean up: keep only the linked package, not the standalone /prod/shared
RUN rm -rf /prod/shared

# ---- Stage 3: runtime -----------------------------------------------------
FROM node:20-alpine AS runtime

# OCI labels
LABEL org.opencontainers.image.title="molodost48-api" \
      org.opencontainers.image.description="Backend for molodost48.ru — Fastify + Prisma" \
      org.opencontainers.image.source="https://github.com/Barsick132/salon-molodost48" \
      org.opencontainers.image.licenses="Proprietary"

# tini: proper signal handling, PID 1 reaper
RUN apk add --no-cache tini curl
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=127.0.0.1

# Run as non-root
RUN addgroup -S molodost && adduser -S molodost -G molodost
WORKDIR /app

# Copy runtime artifacts
COPY --from=build --chown=molodost:molodost /prod/api ./
COPY --from=build --chown=molodost:molodost /repo/apps/api/prisma ./prisma/

USER molodost
EXPOSE 3000

# Healthcheck uses our /healthz endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD curl -fsS --max-time 3 http://127.0.0.1:${PORT}/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/index.js"]