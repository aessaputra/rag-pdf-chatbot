# Ticket-08 Specification: Docker Integration & Full Stack Verification

> **Reference Ticket:** [TICKET-08] (from `docs/TICKETS.md`)  
> **Applied Skills:** `to-spec`, `docker-patterns`, `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengembang dan pengoperasi sistem, kita membutuhkan konfigurasi kontainerisasi Docker (`Dockerfile` & `docker-compose.yml`) yang aman, efisien, dan siap produksi, serta dokumentasi panduan pengoperasian `README.md` yang lengkap.

Tanpa konfigurasi kontainerisasi yang terstandar dan instruksi setup yang jelas, pengujian dan penyebaran (*deployment*) aplikasi full-stack RAG PDF Chatbot di lingkungan pengujian maupun produksi akan rentan terhadap inkonsistensi environment.

---

## Solution

Menyusun file kontainerisasi `backend/Dockerfile`, `docker-compose.yml`, dan memperbarui `README.md`:
1. **Backend Dockerfile (`backend/Dockerfile`)**:
   - Menggunakan base image ringan `python:3.12-slim`.
   - Penginstalan dependensi teroptimasi (`pip install --no-cache-dir`).
   - Mengaktifkan pengujian kesehatan kontainer (`HEALTHCHECK` pada `/health`).
   - Eksekusi Uvicorn ASGI server pada port `8000` dengan bind `0.0.0.0`.
2. **Docker Compose Configuration (`docker-compose.yml`)**:
   - Mendefinisikan service `backend` terintegrasi dengan variabel lingkungan dari `.env`.
   - Konfigurasi port mapping `8000:8000` dan healthcheck dependency.
3. **Full-Stack Documentation (`README.md`)**:
   - Panduan arsitektur sistem, langkah setup lokal dev, eksekusi migrasi Supabase SQL `docs/supabase_schema.sql`, dan perintah `docker compose up --build`.

---

## User Stories

1. As a DevOps engineer, I want a multi-stage, production-ready `backend/Dockerfile` with a container health check, so that container orchestrators can monitor API status automatically.
2. As a developer, I want to run `docker compose up --build`, so that the backend API starts in a reproducible containerized environment.
3. As a project contributor, I want a detailed `README.md` with environment setup guides, so that I can onboard and run the full stack effortlessly.

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
