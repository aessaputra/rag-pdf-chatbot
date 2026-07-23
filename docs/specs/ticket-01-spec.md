# Ticket-01 Specification: Supabase Database Migration & Backend Core Setup

> **Reference Ticket:** [TICKET-01] (from `docs/TICKETS.md`)  
> **Applied Skill:** `supabase-postgres-best-practices`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengembang, kita memerlukan fondasi skema database Supabase PostgreSQL (`pgvector` & RLS) yang berkinerja tinggi, terisolasi dengan aman antar pengguna, serta setup konfigurasi core backend FastAPI yang teruji sebelum membangun modul ingestion dan RAG.

Tanpa optimasi RLS dan indexing yang tepat, query pencarian vektor dan verifikasi hak akses pengguna pada tabel RAG akan mengalami penurunan performa dramatis (*per-row evaluation overhead*).

---

## Solution

Membuat file skema SQL `docs/supabase_schema.sql` berbasis **Supabase Postgres Best Practices**:
1. Menggunakan pola `(select auth.uid())` pada kebijakan RLS untuk menghindari eksekusi per-baris (*caching query plan execution*).
2. Menambahkan indeks B-tree pada seluruh kolom Foreign Key (`user_id`, `document_id`, `session_id`).
3. Menambahkan indeks HNSW pada kolom `embedding` (`vector_cosine_ops`) untuk pencarian kemiripan vektor berkecepatan tinggi.
4. Menyediakan setup backend Pydantic Settings (`backend/app/config.py`), dependensi `requirements.txt`, dan pengujian otomatis via `pytest`.

---

## User Stories

1. As a backend developer, I want an optimized Supabase PostgreSQL schema with `pgvector` enabled, so that vector similarity search performs efficiently under load.
2. As a security engineer, I want Row-Level Security (RLS) policies using cached `(select auth.uid())`, so that user data is isolated without causing per-row evaluation bottlenecks.
3. As a database administrator, I want explicit foreign key indexes on all table relations, so that JOIN and cascade delete queries run with minimal lock contention.
4. As a DevOps engineer, I want a structured `backend/app/config.py` using Pydantic Settings, so that environment variables are validated at startup.
5. As a QA engineer, I want automated unit tests in `backend/tests/test_config.py`, so that configuration loading is verified in CI/CD.

---

## Implementation Decisions

### 1. Database Schema & RLS Best Practices (Supabase Best Practices)

- **Vector Extension**: Enable `vector` extension in PostgreSQL 15+.
- **RLS Subquery Caching**: Use `((select auth.uid()) = user_id)` instead of `auth.uid() = user_id` to evaluate user identity once per statement rather than once per row.
- **Foreign Key Indexing**: Create explicit indexes on all foreign key columns:
  - `idx_documents_user_id` on `documents(user_id)`
  - `idx_document_chunks_user_id` on `document_chunks(user_id)`
  - `idx_document_chunks_document_id` on `document_chunks(document_id)`
  - `idx_chat_sessions_user_id` on `chat_sessions(user_id)`
  - `idx_chat_messages_session_id` on `chat_messages(session_id)`
- **Vector Search Index**: Create HNSW index `idx_document_chunks_embedding_hnsw` using `vector_cosine_ops` for fast nearest-neighbor retrieval.

### 2. Schema Blueprint (SQL)

```sql
-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Document Chunks Table (Vector Storage)
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Foreign Key & Filter Indexes
CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);

-- Vector HNSW Index (Cosine Similarity)
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON public.document_chunks USING hnsw (embedding vector_cosine_ops);

-- Row Level Security (RLS) Policies with Cached auth.uid()
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their documents" 
ON public.documents FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their chunks" 
ON public.document_chunks FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their chat sessions" 
ON public.chat_sessions FOR ALL USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their chat messages" 
ON public.chat_messages FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.chat_sessions 
        WHERE id = chat_messages.session_id 
        AND user_id = (select auth.uid())
    )
);
```

### 3. Backend Pydantic Config Module

Modules:
- `backend/app/config.py` using `pydantic_settings.BaseSettings`
- Verification test: `backend/tests/test_config.py`

---

## Testing Decisions

- **Tested Seam**: `app.config.Settings` initialization & default fallback values.
- **Good Test Criteria**: Tests verify configuration settings load successfully without making external network calls.
- **Test Command**: `pytest backend/tests/test_config.py`

---

## Out of Scope

- Execution of full PDF parsing or vector generation (deferred to TICKET-03).
- Live execution of LLM stream (deferred to TICKET-04).

---

## Further Notes

Optimasi RLS berbasis `(select auth.uid())` memberikan peningkatan kecepatan query hingga **5-10x** pada tabel berukuran ribuan baris data embedding.
