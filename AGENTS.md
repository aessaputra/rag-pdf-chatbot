# AGENTS.md

## Project Overview

**RAG PDF Chatbot** — A production-grade full-stack Retrieval-Augmented Generation (RAG) system for chatting with PDF documents. Users upload PDFs, which are parsed, chunked, and embedded into Supabase `pgvector`. Questions are answered via LLM with page-level citations streamed back as Server-Sent Events (SSE).

### Architecture

The project follows a **two-service monorepo** layout:

```
rag-pdf-chatbot/
├── backend/          # FastAPI REST + SSE API (Python)
├── frontend/         # Next.js 15 App Router (TypeScript)
├── supabase/         # SQL migrations for Supabase PostgreSQL
├── docker-compose.yml          # Dev environment
├── docker-compose.prod.yml     # Production overrides
└── .agents/skills/             # AI coding agent skills
```

| Layer | Stack |
|---|---|
| **Frontend** | Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, `@supabase/ssr`, Lucide React |
| **Backend** | FastAPI, Pydantic v2, PyJWT, Uvicorn |
| **RAG Pipeline** | LangChain (`langchain-google-genai`, `langchain-openai`, `langchain-ollama`), PyPDF |
| **Database** | Supabase PostgreSQL, `pgvector` (HNSW cosine index), Supabase Auth (JWT) |
| **Containers** | Docker multi-stage builds, Docker Compose (dev + prod) |

### Key Design Decisions

- **Multi-Provider LLM**: Supports Google Gemini (default), OpenAI GPT-4o mini, and Ollama (local) via a factory pattern in `backend/app/services/llm_factory.py`.
- **JWT Auth**: Backend validates Supabase JWTs using JWKS (asymmetric RS256/ES256) or HMAC (HS256) fallback. Frontend uses `@supabase/ssr` with `middleware.ts` for server-side session validation.
- **SSE Streaming**: Chat responses stream token-by-token via Server-Sent Events through `backend/app/routers/chat_router.py` → `backend/app/services/rag_service.py`.
- **Row Level Security (RLS)**: All Supabase tables enforce RLS with cached policy evaluation `((select auth.uid()) = user_id)`.

---

## Setup Commands

### Prerequisites

- Python 3.11+ with `venv`
- Node.js 18+ with `npm`
- A Supabase project (for PostgreSQL + Auth)
- At least one LLM API key (Gemini recommended)

### 1. Database Setup (Supabase)

1. Open your Supabase Dashboard → SQL Editor.
2. Execute migration files in order from `supabase/migrations/`:
   - `20260723000000_init_rag_schema.sql` — Creates tables (`documents`, `document_chunks`, `chat_sessions`, `chat_messages`), HNSW vector index, and RLS policies.
   - `20260724000000_harden_grants_and_rpc.sql` — Hardens grants and adds RPC functions.

### 2. Backend Setup (FastAPI)

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env
# Edit .env — required keys:
#   SUPABASE_URL, SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY),
#   SUPABASE_JWT_SECRET, GEMINI_API_KEY (or OPENAI_API_KEY for OpenAI)

# Run dev server
uvicorn app.main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`. Swagger docs at `http://localhost:8000/docs`.

### 3. Frontend Setup (Next.js 15)

```bash
cd frontend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
# Edit .env.local — required keys:
#   NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
#   NEXT_PUBLIC_API_URL (defaults to http://localhost:8000)

# Run dev server
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## Development Workflow

### Running Services Locally

- **Backend**: `cd backend && uvicorn app.main:app --reload --port 8000`
- **Frontend**: `cd frontend && npm run dev`
- Both must run simultaneously; the frontend proxies API calls to the backend at `NEXT_PUBLIC_API_URL`.

### Running with Docker Compose (Development)

```bash
# Ensure backend/.env and frontend/.env are configured
docker compose up --build -d

# Verify backend health
curl http://localhost:8000/health
# Returns: {"status": "online"}
```

Hot-reloading is enabled via bind mounts in the dev docker-compose.yml.

### Running with Docker Compose (Production)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Production mode uses minimal standalone images with no bind mounts and `restart: always`.

### Environment Variables

#### Backend (`backend/.env`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | Supabase project URL |
| `SUPABASE_SECRET_KEY` | ✅ | Supabase service role key (alias: `SUPABASE_SERVICE_ROLE_KEY`) |
| `SUPABASE_JWT_SECRET` | ❌ | HMAC JWT signing secret (fallback if JWKS not configured) |
| `SUPABASE_JWKS_URL` | ❌ | Supabase JWKS endpoint for asymmetric JWT verification |
| `SUPABASE_JWT_AUDIENCE` | ❌ | JWT audience claim (default: `authenticated`) |
| `DEFAULT_LLM_PROVIDER` | ❌ | `gemini` (default), `openai`, or `ollama` |
| `GEMINI_API_KEY` | ❌ | Google Gemini API key |
| `OPENAI_API_KEY` | ❌ | OpenAI API key |
| `OLLAMA_BASE_URL` | ❌ | Ollama server URL (default: `http://localhost:11434`) |

#### Frontend (`frontend/.env.local`)

| Variable | Required | Description |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | ✅ | Supabase anon/publishable key |
| `NEXT_PUBLIC_API_URL` | ✅ | Backend API base URL (default: `http://localhost:8000`) |

---

## Testing Instructions

### Backend Tests (pytest)

All tests are in `backend/tests/` and use `pytest` + `pytest-asyncio`:

```bash
cd backend

# Activate virtual environment first
venv\Scripts\activate   # Windows
source venv/bin/activate  # Linux/macOS

# Run all tests (15 tests across 5 files)
python -m pytest tests/ -v

# Run a specific test file
python -m pytest tests/test_auth.py -v

# Run a single test by name
python -m pytest tests/ -v -k "test_verify_expired_supabase_token"
```

#### Test Files and Coverage

| File | Tests |
|---|---|
| `test_auth.py` | JWT verification (HMAC, expired, missing claims, JWKS) |
| `test_config.py` | Pydantic Settings loading, env var aliases |
| `test_ingestion.py` | PDF parsing, text chunking with metadata |
| `test_rag.py` | RAG SSE streaming, citation extraction, context formatting |
| `test_routers.py` | FastAPI endpoint integration (upload, chat, documents) |

### Frontend

Currently no automated test suite. Validate with:

```bash
cd frontend
npm run build   # TypeScript type-check + Next.js build
npm run lint    # ESLint checks (if configured)
```

---

## Code Style

### Python (Backend)

- **Pydantic v2** models with `model_config = ConfigDict(...)` — not legacy Pydantic v1 `class Config`.
- **Type hints** on all function signatures (return types, parameters).
- **Docstrings** on all modules, classes, and public functions (Google-style or PEP 257).
- **Imports**: Standard library → third-party → local (`app.*`).
- **Settings**: Use `pydantic-settings` `BaseSettings` with `AliasChoices` for env var aliases. Never hardcode credentials.
- **Dependencies**: Use FastAPI `Depends()` for injection. Auth uses `CurrentUserDep = Annotated[UserPayload, Depends(get_current_user)]`.
- **Routers**: Mounted on `app.include_router(router, prefix="/api/...")`.

### TypeScript (Frontend)

- **Strict mode** enabled (`"strict": true` in `tsconfig.json`).
- **Path alias**: `@/*` maps to `./src/*`.
- **React 19** + **Next.js 15 App Router** conventions:
  - Pages in `src/app/<route>/page.tsx`, layouts in `layout.tsx`.
  - Server components by default; `"use client"` directive for interactive components.
  - Auth middleware in `src/middleware.ts`.
- **Type definitions**: Centralized in `src/types/index.ts` using discriminated unions, `readonly` properties, and generic wrappers (`ApiResponse<T>`).
- **Styling**: Tailwind CSS v4 via PostCSS (`@tailwindcss/postcss`). Utility merging with `clsx` + `tailwind-merge`.
- **Icons**: `lucide-react` for all iconography.

### File Organization

```
backend/
├── app/
│   ├── main.py              # FastAPI app + CORS + router registration
│   ├── config.py            # Pydantic Settings (env vars)
│   ├── auth.py              # JWT verification (JWKS + HMAC)
│   ├── database.py          # Supabase client initialization
│   ├── schemas.py           # Pydantic request/response DTOs
│   ├── routers/
│   │   ├── chat_router.py   # POST /api/chat/stream (SSE)
│   │   └── document_router.py  # POST /api/documents/upload, GET, DELETE
│   └── services/
│       ├── ingestion_service.py  # PDF parsing + chunking
│       ├── llm_factory.py        # Multi-provider LLM instantiation
│       └── rag_service.py        # RAG pipeline + citation extraction
├── tests/                   # pytest test modules
├── requirements.txt
└── Dockerfile               # Multi-stage (dev + production)

frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx       # Root layout (fonts, global providers)
│   │   ├── page.tsx         # Home page (redirects to dashboard)
│   │   ├── globals.css      # Tailwind CSS v4 imports
│   │   ├── login/page.tsx   # Login page
│   │   └── dashboard/page.tsx  # Main chat dashboard
│   ├── components/
│   │   ├── ChatWindow.tsx   # Chat messages + input
│   │   ├── CitationPanel.tsx  # Citation side drawer
│   │   ├── DocumentManager.tsx  # PDF upload + document list
│   │   └── Sidebar.tsx      # Navigation sidebar
│   ├── lib/
│   │   ├── api.ts           # Backend API client (SSE, upload, list, delete)
│   │   └── supabaseClient.ts  # Supabase browser client
│   ├── middleware.ts        # Auth middleware (server-side session check)
│   └── types/index.ts       # Shared TypeScript types
├── package.json
├── tsconfig.json
└── Dockerfile               # Multi-stage (dev + production)
```

---

## API Routes

### Backend (FastAPI)

| Method | Path | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | ❌ | Health check |
| `POST` | `/api/documents/upload` | ✅ Bearer | Upload and ingest a PDF |
| `GET` | `/api/documents` | ✅ Bearer | List user's documents |
| `DELETE` | `/api/documents/{document_id}` | ✅ Bearer | Delete a document |
| `POST` | `/api/chat/stream` | ✅ Bearer | RAG query with SSE streaming response |
| `GET` | `/api/chat/sessions` | ✅ Bearer | List user's chat sessions |

All authenticated endpoints require a Supabase JWT in the `Authorization: Bearer <token>` header.

---

## Build and Deployment

### Build Commands

```bash
# Backend: No build step (interpreted Python). Just install deps:
cd backend && pip install -r requirements.txt

# Frontend: Next.js production build
cd frontend && npm run build

# Docker (full stack)
docker compose up --build -d

# Docker (production)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

### Docker Details

- Both services use **multi-stage Dockerfiles** with `dev` and `production` targets.
- Dev stage: bind mounts for hot-reload, `uvicorn --reload` for backend.
- Production stage: minimal standalone images, no volume mounts.
- Custom bridge network `rag-network` for inter-service communication.
- Backend health check: `curl -f http://localhost:8000/health`.
- Frontend depends on backend via `service_healthy` condition.

---

## Debugging and Troubleshooting

### Common Issues

- **`SUPABASE_SECRET_KEY` not found**: The backend accepts both `SUPABASE_SECRET_KEY` and `SUPABASE_SERVICE_ROLE_KEY` via `AliasChoices`. Make sure one is set in `backend/.env`.
- **JWT verification fails**: Check that `SUPABASE_JWT_SECRET` matches your Supabase project's JWT secret, or configure `SUPABASE_JWKS_URL` for asymmetric verification.
- **Frontend redirects to `/login` in a loop**: Ensure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are set in `frontend/.env.local`.
- **CORS errors**: The backend allows origins `http://localhost:3000` and `http://127.0.0.1:3000`. For production, update `allow_origins` in `backend/app/main.py`.
- **Docker frontend can't reach backend**: Both services must be on the same `rag-network`. The frontend container uses `NEXT_PUBLIC_API_URL` to reach the backend.

### Logging

- Backend uses Python `logging` module. Auth warnings are logged via `logger.warning()`.
- FastAPI auto-logs request/response in dev mode with Uvicorn.

---

## Additional Notes

- **Package manager**: Backend uses `pip` with `requirements.txt`. Frontend uses `npm` with `package-lock.json`.
- **No monorepo tooling**: Backend and frontend are independent projects in the same repo. There is no shared build orchestrator — run commands from each directory.
- **Supabase migrations** are in `supabase/migrations/` and must be applied manually via the Supabase SQL Editor or `supabase db push`.
- **Frontend public routes**: Only `/login` is accessible without authentication. All other routes are protected by `middleware.ts`.
- **Path aliases**: Frontend uses `@/*` → `./src/*` for imports (configured in `tsconfig.json`).
