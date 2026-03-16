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
# Copy package dirs from deps (includes any package-level node_modules)
COPY --from=deps /app/packages ./packages
# Overlay source files
COPY . .
# Bundle agents + workspace packages into a single dist/index.js via esbuild.
# Workspace packages (@bipi/*) are inlined from TypeScript source.
# All npm packages remain external (resolved from node_modules at runtime).
RUN pnpm --filter @bipi/agents build

# Runtime
FROM base AS runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/agents/node_modules ./apps/agents/node_modules
COPY --from=build /app/apps/agents/dist ./apps/agents/dist
COPY --from=build /app/apps/agents/package.json ./apps/agents/

WORKDIR /app/apps/agents
ENV NODE_ENV=production
EXPOSE 3002 8080
CMD ["node", "dist/index.cjs"]
