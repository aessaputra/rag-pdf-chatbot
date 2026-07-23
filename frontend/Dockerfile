# ==============================================================================
# Multi-Stage Build Dockerfile for Next.js 15 Standalone Frontend
# Follows .agents/skills/docker-patterns/SKILL.md & Code Review best practices:
# - Stage 1 (deps): Install npm dependencies
# - Stage 2 (build): Build Next.js application with output: 'standalone' & ARGs
# - Stage 3 (production): Minimal node-alpine runtime running node server.js
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

# Build Arguments for Next.js Client Bundle Embedding
ARG NEXT_PUBLIC_SUPABASE_URL=https://sgfhbxprnsolgcgzuymn.supabase.co
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_lMDEZn1F3hJZa2jNKEXJvQ_sD04VImY
ARG NEXT_PUBLIC_API_URL=http://localhost:8000

ENV NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL} \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY} \
    NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL} \
    NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Stage 3: Minimal Production Standalone Image
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000

# Create non-root user and group
RUN addgroup -g 1001 -S appgroup && adduser -S appuser -u 1001 -G appgroup

COPY --from=build --chown=appuser:appgroup /app/public ./public
COPY --from=build --chown=appuser:appgroup /app/.next/standalone ./
COPY --from=build --chown=appuser:appgroup /app/.next/static ./.next/static

USER appuser

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
