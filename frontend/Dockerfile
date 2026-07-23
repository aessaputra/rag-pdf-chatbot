# ==============================================================================
# Multi-Stage Build Dockerfile for Next.js 15 Frontend
# Follows .agents/skills/docker-patterns/SKILL.md best practices:
# - Stage 1 (deps): Install npm dependencies
# - Stage 2 (build): Build Next.js application
# - Stage 3 (production): Non-root user execution, minimal node-alpine runtime
# ==============================================================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json ./
RUN npm install

# Stage 2: Build Application
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 3: Minimal Production Image
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1

# Create non-root user and group
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=build --chown=appuser:appgroup /app/node_modules ./node_modules
COPY --from=build --chown=appuser:appgroup /app/package.json ./package.json
COPY --from=build --chown=appuser:appgroup /app/.next ./.next
COPY --from=build --chown=appuser:appgroup /app/public ./public

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["npm", "run", "start"]
