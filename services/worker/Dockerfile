# syntax=docker/dockerfile:1.7
#
# ShopOS worker — BullMQ background worker.
#
# Build from repo root:
#   docker build -t shopos/worker -f services/worker/Dockerfile .
#

ARG NODE_VERSION=22
ARG PNPM_VERSION=10.33.0

# -------- base: node + pnpm --------
FROM node:${NODE_VERSION}-bookworm-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
WORKDIR /app

# -------- deps: install workspace deps --------
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

# -------- builder: compile worker TS --------
FROM deps AS builder
COPY services/worker ./services/worker
RUN pnpm --filter @shopos/worker build

# -------- runner: slim Node runtime --------
FROM node:${NODE_VERSION}-bookworm-slim AS runner
ENV NODE_ENV=production \
    PNPM_HOME="/pnpm" \
    PATH="/pnpm:$PATH"
RUN apt-get update \
  && apt-get install -y --no-install-recommends tini ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs worker
WORKDIR /app
# Copy the full installed tree + compiled dist. pnpm prune would save some
# disk but complicates workspace symlinks; worker image is small enough to
# justify the simpler approach.
COPY --from=builder --chown=worker:nodejs /app/pnpm-workspace.yaml /app/pnpm-lock.yaml /app/package.json ./
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/services/worker/package.json ./services/worker/
COPY --from=builder --chown=worker:nodejs /app/services/worker/dist ./services/worker/dist
COPY --from=builder --chown=worker:nodejs /app/services/worker/node_modules ./services/worker/node_modules
USER worker
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["node", "services/worker/dist/index.js"]
