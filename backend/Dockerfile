# ==============================================================================
# Multi-Stage Build Dockerfile for FastAPI Backend
# Follows .agents/skills/docker-patterns/SKILL.md best practices:
# - Stage 1 (deps): Isolated dependency installation in virtual environment
# - Stage 2 (production): Non-root user execution, minimal attack surface, healthcheck
# ==============================================================================

# Stage 1: Build Dependencies
FROM python:3.12-slim AS deps

WORKDIR /app

# Prevent Python from writing .pyc files and buffer stdout/stderr
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment for clean dependency isolation
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt


# Stage 2: Production Minimal & Hardened Runtime Image
FROM python:3.12-slim AS production

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PATH="/opt/venv/bin:$PATH"

# Install curl for container HEALTHCHECK
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user and group for container security hardening
RUN groupadd -g 1001 appgroup && \
    useradd -u 1001 -g appgroup -s /bin/sh appuser

# Copy virtual environment and app code from deps stage with non-root ownership
COPY --from=deps /opt/venv /opt/venv
COPY --chown=appuser:appgroup app/ ./app/

# Switch to non-root user
USER appuser

EXPOSE 8000

# Automated Container Health Check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# Start ASGI Server Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]