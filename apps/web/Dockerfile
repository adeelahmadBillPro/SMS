# syntax=docker/dockerfile:1.7
#
# ShopOS web — multi-stage build for Next.js 15 (App Router, standalone).
#
# Targets (build context MUST be the repo root):
#   runner    — slim Node runtime serving `node apps/web/server.js`
#   migrator  — full toolbox (pnpm + prisma + tsx) for `db:migrate:prod`,
#               `db:rls:apply:prod`, `db:seed:prod`, `admin:create:prod`.
#               Compose runs it behind --profile tools.
#
# Build from repo root:
#   docker build -t shopos/web -f apps/web/Dockerfile --target runner .
#   docker build -t shopos/migrator -f apps/web/Dockerfile --target migrator .
#

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.33.0

# -------- base: node + pnpm via corepack --------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH" \
    NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# -------- deps: install all workspace deps (with dev deps for build/tools) --------
FROM base AS deps
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json turbo.json tsconfig.base.json ./
COPY apps/web/package.json       ./apps/web/
COPY packages/db/package.json    ./packages/db/
COPY packages/core/package.json  ./packages/core/
COPY packages/ui/package.json    ./packages/ui/
COPY packages/config/package.json ./packages/config/
COPY services/worker/package.json ./services/worker/
RUN --mount=type=cache,id=pnpm,target=/pnpm/store \
    pnpm install --frozen-lockfile

# -------- prisma: generate the Prisma Client (no DB needed) --------
FROM deps AS prisma
COPY packages/db ./packages/db
RUN pnpm --filter @shopos/db build

# -------- builder: build the Next.js app (emits .next/standalone) --------
FROM prisma AS builder
COPY apps/web ./apps/web
COPY packages/core ./packages/core
COPY packages/ui ./packages/ui
COPY packages/config ./packages/config
# Build-time placeholders so @shopos/db's env.ts validation + Next's
# static route collection succeed. Runtime reads the real values from
# the container environment (env_file in docker-compose.yml).
ENV DATABASE_URL="postgresql://ph:ph@localhost:5432/ph?schema=public" \
    DATABASE_APP_URL="postgresql://ph:ph@localhost:5432/ph?schema=public" \
    DATABASE_ADMIN_URL="postgresql://ph:ph@localhost:5432/ph?schema=public" \
    BETTER_AUTH_SECRET="build-time-placeholder" \
    APP_URL="http://localhost:3000" \
    NEXT_PUBLIC_APP_URL="http://localhost:3000" \
    NODE_ENV="production"
RUN pnpm --filter @shopos/web build

# -------- runner: slim Next.js standalone server --------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# Keep tini for proper PID 1 signal handling
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini wget ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs
WORKDIR /app
# Standalone bundle already contains a pruned node_modules + server.js.
# Layout emitted by Next in a monorepo:
#   .next/standalone/apps/web/server.js
#   .next/standalone/node_modules/...
# Copying `.next/standalone/.` preserves both of those under /app.
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone/. ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static         ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public               ./apps/web/public
USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=20s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:3000/health || exit 1
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "apps/web/server.js"]

# -------- migrator: toolbox for prisma migrate / rls:apply / seed / admin:create --------
FROM prisma AS migrator
WORKDIR /app
ENV NODE_ENV=production
# Copy RLS SQL + runtime sources the migrator scripts import.
COPY infra/rls ./infra/rls
# The prisma stage already has packages/db. No sources from apps/web needed.
# Default is a no-op; compose invokes specific subcommands, e.g.:
#   docker compose --profile tools run --rm migrator pnpm --filter @shopos/db migrate:prod
CMD ["pnpm", "--filter", "@shopos/db", "migrate:prod"]
