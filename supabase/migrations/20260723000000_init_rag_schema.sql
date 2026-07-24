-- ==============================================================================
-- Supabase Migration: RAG PDF Chatbot Schema
-- Created per .agents/skills/supabase and .agents/skills/supabase-postgres-best-practices
-- Includes: pgvector extension, documents, document_chunks, chat_sessions, chat_messages,
-- HNSW vector cosine index, cached RLS policies ((select auth.uid()) = user_id),
-- search_path hardening, and Data API Grants for authenticated role.
-- ==============================================================================

-- 1. Enable Vector Extension
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- 2. Documents Table
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_size INT NOT NULL,
    total_pages INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_documents_user_id ON public.documents(user_id);

-- 3. Document Chunks Table with Vector Embedding
CREATE TABLE IF NOT EXISTS public.document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    page_number INT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding VECTOR(768),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON public.document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_user_id ON public.document_chunks(user_id);

-- HNSW Vector Index for Fast Cosine Distance Similarity Search
CREATE INDEX IF NOT EXISTS idx_document_chunks_embedding_hnsw 
ON public.document_chunks 
USING hnsw (embedding vector_cosine_ops);

-- 4. Chat Sessions Table
CREATE TABLE IF NOT EXISTS public.chat_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Conversation',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);

-- 5. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    sender TEXT NOT NULL CHECK (sender IN ('user', 'assistant')),
    content TEXT NOT NULL,
    citations JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Follows Supabase Security Checklist:
-- - Target role: TO authenticated
-- - Ownership check: USING ((select auth.uid()) = user_id)
-- - UPDATE policies: both USING and WITH CHECK
-- ==============================================================================

-- Enable RLS on all public tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS: documents
DROP POLICY IF EXISTS "Users can select own documents" ON public.documents;
CREATE POLICY "Users can select own documents"
ON public.documents FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own documents" ON public.documents;
CREATE POLICY "Users can insert own documents"
ON public.documents FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own documents" ON public.documents;
CREATE POLICY "Users can delete own documents"
ON public.documents FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- RLS: document_chunks
DROP POLICY IF EXISTS "Users can select own chunks" ON public.document_chunks;
CREATE POLICY "Users can select own chunks"
ON public.document_chunks FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own chunks" ON public.document_chunks;
CREATE POLICY "Users can insert own chunks"
ON public.document_chunks FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own chunks" ON public.document_chunks;
CREATE POLICY "Users can delete own chunks"
ON public.document_chunks FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- RLS: chat_sessions
DROP POLICY IF EXISTS "Users can select own sessions" ON public.chat_sessions;
CREATE POLICY "Users can select own sessions"
ON public.chat_sessions FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own sessions" ON public.chat_sessions;
CREATE POLICY "Users can insert own sessions"
ON public.chat_sessions FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;
CREATE POLICY "Users can update own sessions"
ON public.chat_sessions FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own sessions" ON public.chat_sessions;
CREATE POLICY "Users can delete own sessions"
ON public.chat_sessions FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- RLS: chat_messages
DROP POLICY IF EXISTS "Users can select own messages" ON public.chat_messages;
CREATE POLICY "Users can select own messages"
ON public.chat_messages FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own messages" ON public.chat_messages;
CREATE POLICY "Users can insert own messages"
ON public.chat_messages FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own messages" ON public.chat_messages;
CREATE POLICY "Users can delete own messages"
ON public.chat_messages FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- RPC Function: Vector Similarity Search (Hardened with search_path)
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding VECTOR(768),
    match_count INT DEFAULT 4,
    filter_user_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    content TEXT,
    page_number INT,
    metadata JSONB,
    similarity FLOAT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = 'public', 'extensions', 'pg_temp'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.page_number,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE (filter_user_id IS NULL OR dc.user_id = filter_user_id)
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- ==============================================================================
-- Data API Grants (Supabase Core Principle 4)
-- ==============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
