# LiveKit Cloud Debate Worker
# Used by: lk agent deploy .  (run from repo root)
# Builds the debate-worker entry point that registers with LiveKit and
# handles job dispatch when debate rooms are created.
#
# For local development use docker-compose.yml instead.

# syntax=docker/dockerfile:1
FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# ── Install dependencies ───────────────────────────────────────────────────────
FROM base AS deps
# Copy manifests only (cache-friendly layer)
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/agents/package.json apps/agents/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/agent-core/package.json packages/agent-core/
RUN pnpm install --frozen-lockfile

# ── Build TypeScript ───────────────────────────────────────────────────────────
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/agents/node_modules ./apps/agents/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/agent-core/node_modules ./packages/agent-core/node_modules 2>/dev/null || true
COPY . .
RUN pnpm --filter @bipi/agents build

# ── Runtime image ──────────────────────────────────────────────────────────────
FROM base AS runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/agents/dist ./apps/agents/dist
COPY --from=build /app/apps/agents/package.json ./apps/agents/
COPY --from=build /app/packages ./packages

ENV NODE_ENV=production
# Start the live reactive debate worker (LiveConversation + ElevenLabs TTS)
CMD ["node", "apps/agents/dist/workers/live-debate-worker.js", "start"]
