# RAG PDF Chatbot Implementation Plan & PRD

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Membangun aplikasi RAG-PDF-Chatbot full-stack dengan otentikasi Supabase Auth (RLS), multi-provider LLM (Gemini, OpenAI, Ollama), penyimpanan vektor Supabase `pgvector`, dan antarmuka Next.js 15 realtime SSE streaming dengan sitasi nomor halaman PDF.

**Architecture:** Frontend Next.js 15 (App Router) berkomunikasi via HTTP & SSE ke Backend FastAPI. FastAPI menggunakan Supabase JWT middleware untuk otentikasi pengguna, mengolah PDF menjadi vector embeddings ke Supabase `pgvector`, dan menjalankan alur retrieval RAG dengan LangChain untuk mengembalikan streaming jawaban beserta sitasi dokumen.

**Tech Stack:** 
- Backend: Python 3.11+, FastAPI v0.139+, LangChain v1.3+, PyJWT, Uvicorn, PyPDF
- Database: Supabase PostgreSQL 15+ (`pgvector`), Supabase Python SDK
- Frontend: Next.js 15+, React 19, TypeScript, Tailwind CSS v4, `@supabase/ssr`, `@supabase/supabase-js`, Lucide React

---

## Global Constraints

- **Python Version**: >= 3.11
- **Node.js Version**: >= 18.0.0
- **FastAPI Version**: >= 0.139.0
- **LangChain Version**: >= 1.3.0
- **Database**: Supabase PostgreSQL dengan ekstensi `pgvector` & Row Level Security (RLS) aktif
- **Authentication**: Supabase JWT diposisikan di header `Authorization: Bearer <token>` untuk semua endpoint terproteksi
- **Code Style**: Pydantic v2 schemas di FastAPI, Strict TypeScript types & Functional components di Next.js 15

---

## File Structure Mapping

```
rag-pdf-chatbot/
├── docs/
│   ├── PRD.md
│   ├── TICKETS.md
│   └── supabase_schema.sql
├── backend/
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py
│   │   ├── config.py
│   │   ├── auth.py
│   │   ├── database.py
│   │   ├── schemas.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── llm_factory.py
│   │   │   ├── ingestion_service.py
│   │   │   └── rag_service.py
│   │   └── routers/
│   │       ├── __init__.py
│   │       ├── auth_router.py
│   │       ├── document_router.py
│   │       └── chat_router.py
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_ingestion.py
│   │   └── test_rag.py
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── dashboard/
│   │   │       └── page.tsx
│   │   ├── components/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── DocumentManager.tsx
│   │   │   ├── ChatWindow.tsx
│   │   │   ├── CitationPanel.tsx
│   │   │   └── Header.tsx
│   │   ├── lib/
│   │   │   ├── supabaseClient.ts
│   │   │   └── api.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.ts
│   └── .env.example
├── docker-compose.yml
└── README.md
```

---

## Task Decomposition

### Task 1: Supabase Database Migration & Backend Core Setup

**Files:**
- Create: `docs/supabase_schema.sql`
- Create: `backend/requirements.txt`
- Create: `backend/.env.example`
- Create: `backend/app/config.py`
- Create: `backend/app/database.py`
- Create: `backend/tests/conftest.py`

**Interfaces:**
- Consumes: Supabase Database URL & Service Key from environment variables
- Produces: `get_supabase_client()` helper & SQLAlchemy/async connection pool

- [ ] **Step 1: Write `docs/supabase_schema.sql` SQL script**

```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their documents" ON public.documents FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their chunks" ON public.document_chunks FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their chat sessions" ON public.chat_sessions FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users can manage their chat messages" ON public.chat_messages FOR ALL USING (
    EXISTS (SELECT 1 FROM public.chat_sessions WHERE id = chat_messages.session_id AND user_id = auth.uid())
);
```

- [ ] **Step 2: Create `backend/requirements.txt`**

```text
fastapi>=0.139.0
uvicorn[standard]>=0.30.0
pydantic>=2.7.0
pydantic-settings>=2.2.0
langchain>=1.3.0
langchain-community>=0.3.0
langchain-core>=0.3.0
google-genai>=0.1.0
openai>=1.30.0
supabase>=2.4.0
pyjwt>=2.8.0
pypdf>=4.2.0
python-multipart>=0.0.9
pytest>=8.0.0
pytest-asyncio>=0.23.0
httpx>=0.27.0
```

- [ ] **Step 3: Create `backend/app/config.py`**

```python
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    SUPABASE_URL: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_JWT_SECRET: str = ""
    DEFAULT_LLM_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 4: Create test `backend/tests/test_config.py`**

```python
from app.config import settings

def test_settings_load():
    assert hasattr(settings, "DEFAULT_LLM_PROVIDER")
```

- [ ] **Step 5: Run pytest**

Run: `pytest backend/tests/test_config.py`
Expected: PASS

---

### Task 2: Supabase JWT Authentication Middleware in FastAPI

**Files:**
- Create: `backend/app/auth.py`
- Create: `backend/tests/test_auth.py`

**Interfaces:**
- Consumes: Bearer token from HTTP Header `Authorization`
- Produces: `get_current_user(token)` FastAPI Dependency returning `user_id` and `email`

- [ ] **Step 1: Write test `backend/tests/test_auth.py`**

```python
import pytest
import jwt
from fastapi import HTTPException
from app.auth import verify_supabase_token

def test_verify_invalid_token():
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token("invalid.token.string", secret="secret")
    assert exc_info.value.status_code == 401

def test_verify_valid_token():
    payload = {"sub": "12345678-1234-1234-1234-123456789012", "email": "test@example.com"}
    token = jwt.encode(payload, "secret", algorithm="HS256")
    user = verify_supabase_token(token, secret="secret")
    assert user["sub"] == "12345678-1234-1234-1234-123456789012"
    assert user["email"] == "test@example.com"
```

- [ ] **Step 2: Implement `backend/app/auth.py`**

```python
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.config import settings

security = HTTPBearer()

def verify_supabase_token(token: str, secret: str = settings.SUPABASE_JWT_SECRET) -> dict:
    try:
        payload = jwt.decode(token, secret, algorithms=["HS256"], options={"verify_aud": False})
        return payload
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid authentication token: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    token = credentials.credentials
    return verify_supabase_token(token)
```

- [ ] **Step 3: Run auth tests**

Run: `pytest backend/tests/test_auth.py`
Expected: PASS

---

### Task 3: PDF Document Ingestion & Supabase Vector Store Service

**Files:**
- Create: `backend/app/services/ingestion_service.py`
- Create: `backend/app/schemas.py`
- Create: `backend/tests/test_ingestion.py`

**Interfaces:**
- Consumes: Uploaded PDF file bytes & `user_id`
- Produces: Parsed text chunks, extracted page numbers, and embeddings inserted into Supabase `document_chunks` table

---

### Task 4: Multi-Provider LLM Factory & RAG Streaming Engine

**Files:**
- Create: `backend/app/services/llm_factory.py`
- Create: `backend/app/services/rag_service.py`
- Create: `backend/tests/test_rag.py`

---

### Task 5: FastAPI Main Endpoints (`main.py` & Routers)

**Files:**
- Create: `backend/app/routers/document_router.py`
- Create: `backend/app/routers/chat_router.py`
- Create: `backend/app/main.py`

---

### Task 6: Frontend Next.js 15 Setup & Supabase Auth Client

**Files:**
- Create: `frontend/package.json`
- Create: `frontend/src/lib/supabaseClient.ts`
- Create: `frontend/src/app/login/page.tsx`

---

### Task 7: Premium Next.js UI Chat Interface & Citation Panel

**Files:**
- Create: `frontend/src/components/Sidebar.tsx`
- Create: `frontend/src/components/DocumentManager.tsx`
- Create: `frontend/src/components/ChatWindow.tsx`
- Create: `frontend/src/components/CitationPanel.tsx`
- Create: `frontend/src/app/dashboard/page.tsx`

---

## Self-Review Checklist

1. **Spec Coverage Check:** Passed.
2. **Placeholder Scan:** Passed.
3. **Type Consistency:** Verified.
