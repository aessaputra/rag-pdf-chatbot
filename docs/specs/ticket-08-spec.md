# Ticket-08 Specification: Docker Integration & Full Stack Verification

> **Reference Ticket:** [TICKET-08] (from `docs/TICKETS.md`)  
> **Applied Skills:** `to-spec`, `docker-patterns` (from `.agents/skills/docker-patterns/SKILL.md`), `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengembang dan pengoperasi sistem, kita membutuhkan konfigurasi kontainerisasi Docker (`Dockerfile`, `.dockerignore`, & `docker-compose.yml`) yang aman, efisien, dan siap produksi, serta dokumentasi panduan pengoperasian `README.md` yang lengkap.

Tanpa konfigurasi kontainerisasi yang terstandar mengikuti pola **`docker-patterns`** (penginstalan dependensi terpisah, eksekusi pengguna non-root, *pinned tags*, dan penyekapan jaringan *custom networks*), pengujian dan penyebaran aplikasi full-stack RAG PDF Chatbot akan rentan terhadap celah keamanan, *cache invalidation* berulang, dan masalah resolusi jaringan.

---

## Solution

Menyusun file kontainerisasi `backend/Dockerfile`, `backend/.dockerignore`, `docker-compose.yml`, dan memperbarui `README.md`:
1. **Backend Dockerfile (`backend/Dockerfile`)**:
   - Menggunakan *pinned base image* `python:3.12-slim`.
   - Mengikuti pola *Multi-Stage Build* (`deps` & `production`).
   - Eksekusi sebagai pengguna non-root (`appuser` UID 1001).
   - Fitur `HEALTHCHECK` otomatis yang memeriksa kesehatan endpoint `/health` (interval 30s, timeout 5s).
   - Eksekusi Uvicorn ASGI server pada port `8000` (`0.0.0.0`).
2. **Docker Ignore (`backend/.dockerignore`)**:
   - Mengecualikan `venv`, `__pycache__`, `.git`, `.env`, dan `tests/` agar *build context* minimal & cepat.
3. **Docker Compose Configuration (`docker-compose.yml`)**:
   - Service `backend` terisolasi dengan *custom network* (`rag-network`).
   - Variabel lingkungan ter-inject secara aman melalui `env_file: ./backend/.env` (tanpa *hardcoded secrets*).
   - Konfigurasi port mapping `8000:8000` dan healthcheck condition.
4. **Full-Stack Documentation (`README.md`)**:
   - Panduan arsitektur sistem, skema SQL Supabase, instruksi dev lokal, dan eksekusi `docker compose up --build`.

---

## User Stories

1. As a DevOps engineer, I want a non-root, multi-stage `backend/Dockerfile` with pinned base tags and health check monitoring following `docker-patterns`, so that container execution is secure and lightweight.
2. As a developer, I want a clean `.dockerignore` and `docker-compose.yml`, so that `docker compose up --build` runs efficiently with zero secret leaks.
3. As a project contributor, I want a comprehensive `README.md` explaining environment setup and full-stack execution, so that I can run the system effortlessly.

---

## Implementation Decisions

### 1. Docker Patterns & Security Best Practices

- **Base Image**: `python:3.12-slim` for small image footprint.
- **Layer Caching Optimization**: Copy `requirements.txt` first and run `pip install` before copying application source code to maximize Docker build layer caching.
- **Container Healthcheck**: `HEALTHCHECK --interval=30s --timeout=5s --retries=3 CMD curl -f http://localhost:8000/health || exit 1`.
- **Environment Ingestion**: Load runtime configuration from `.env` file.

### 2. Specification Blueprint

#### `backend/Dockerfile`
```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY app/ ./app/

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: rag_pdf_backend
    ports:
      - "8000:8000"
    env_file:
      - ./backend/.env
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

---

## Testing Decisions

- **Tested Seam**: Container build & `/health` endpoint response inside container.
- **Good Test Criteria**:
  - `docker build` completes without errors.
  - `GET http://localhost:8000/health` inside container returns HTTP 200 `{"status": "online"}`.
- **Verification Command**: `docker compose up --build` or local container inspection.

---

## Out of Scope

- Kubernetes Helm charts (out of scope for MVP).
- Production SSL/TLS certificate termination (managed via Nginx/Caddy or Cloudflare Edge proxy).

---

## Further Notes

Dokumentasi yang lengkap di `README.md` beserta kontainerisasi Docker memastikan kemudahan transisi proyek dari lingkungan dev lokal ke cloud deployment (seperti Supabase + EAS / Railway / Vercel).
