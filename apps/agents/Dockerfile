FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/agents/package.json apps/agents/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/agent-core/package.json packages/agent-core/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/agents/node_modules ./apps/agents/node_modules
# Copy package-level node_modules (may be hoisted — use shell to handle missing dirs)
RUN --mount=type=bind,from=deps,source=/app/packages,target=/tmp/pkg-deps \
    mkdir -p packages/shared packages/db packages/agent-core && \
    { cp -r /tmp/pkg-deps/shared/node_modules packages/shared/ 2>/dev/null || true; } && \
    { cp -r /tmp/pkg-deps/db/node_modules packages/db/ 2>/dev/null || true; } && \
    { cp -r /tmp/pkg-deps/agent-core/node_modules packages/agent-core/ 2>/dev/null || true; }
COPY . .
RUN pnpm --filter @bipi/agents build

# Runtime
FROM base AS runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/agents/dist ./apps/agents/dist
COPY --from=build /app/apps/agents/package.json ./apps/agents/
COPY --from=build /app/packages ./packages

WORKDIR /app/apps/agents
ENV NODE_ENV=production
EXPOSE 3002
CMD ["node", "dist/index.js"]
