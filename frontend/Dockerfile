# ==============================================================================
# Multi-Stage Build Dockerfile for Next.js 15 Frontend
# Follows .agents/skills/docker-patterns/SKILL.md best practices:
# - Stage 1 (deps): Install npm dependencies
# - Stage 2 (dev): Hot-reloading development server
# - Stage 3 (build): Build Next.js application with output: 'standalone'
# - Stage 4 (production): Minimal node-alpine runtime running node server.js
# ==============================================================================

# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install


# Stage 2: Development Stage (Hot-reloading server)
FROM node:22-alpine AS dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NODE_ENV=development \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME="0.0.0.0" \
    PORT=3000

EXPOSE 3000

CMD ["npm", "run", "dev"]


# Stage 3: Build Application
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_API_URL=http://localhost:8000

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build


# Stage 4: Minimal Production Standalone Image
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME="0.0.0.0" \
    PORT=3000

RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=build --chown=appuser:appgroup /app/public ./public
COPY --from=build --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=build --chown=appuser:appgroup /app/.next/static ./.next/static

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/login || exit 1

CMD ["node", "server.js"]
