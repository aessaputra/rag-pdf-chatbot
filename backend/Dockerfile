# ==============================================================================
# Multi-Stage Build Dockerfile for FastAPI Backend
# Follows .agents/skills/docker-patterns/SKILL.md best practices:
# - Stage 1 (deps): Isolated dependency installation in virtual environment
# - Stage 2 (dev): Hot-reloading development server stage
# - Stage 3 (production): Non-root user execution, minimal attack surface, healthcheck
# ==============================================================================

# Stage 1: Build Dependencies
FROM python:3.12-slim AS deps

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt


# Stage 2: Development Stage (Hot-reloading server)
FROM python:3.12-slim AS dev

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY --from=deps /opt/venv /opt/venv
COPY app/ ./app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]


# Stage 3: Production Minimal & Hardened Runtime Image
FROM python:3.12-slim AS production

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/sh appuser

COPY --from=deps /opt/venv /opt/venv
COPY --chown=appuser:appgroup app/ ./app/

USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]