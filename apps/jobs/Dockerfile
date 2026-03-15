FROM node:20-slim AS base
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /app

# Install dependencies
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/jobs/package.json apps/jobs/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
RUN pnpm install --frozen-lockfile

# Build
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/jobs/node_modules ./apps/jobs/node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules 2>/dev/null || true
COPY --from=deps /app/packages/db/node_modules ./packages/db/node_modules 2>/dev/null || true
COPY . .
RUN pnpm --filter @bipi/jobs build

# Runtime
FROM base AS runtime
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/jobs/dist ./apps/jobs/dist
COPY --from=build /app/apps/jobs/package.json ./apps/jobs/
COPY --from=build /app/packages ./packages

WORKDIR /app/apps/jobs
ENV NODE_ENV=production
EXPOSE 3001
CMD ["node", "dist/index.js"]
