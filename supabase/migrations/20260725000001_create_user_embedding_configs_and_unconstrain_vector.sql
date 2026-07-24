-- ==============================================================================
-- Supabase Migration: Create User Embedding Configs Table & Unconstrain Vector
-- Follows .agents/skills/supabase and .agents/skills/supabase-postgres-best-practices
-- Includes:
--   1. user_embedding_configs table with RLS and Grants
--   2. Drop HNSW index on fixed 768d embedding
--   3. Alter document_chunks.embedding to unconstrained VECTOR
--   4. Update match_document_chunks RPC function to accept unconstrained VECTOR
-- ==============================================================================

-- 1. Create user_embedding_configs table
CREATE TABLE IF NOT EXISTS public.user_embedding_configs (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    api_key_enc TEXT NOT NULL,
    base_url TEXT,
    model_name TEXT NOT NULL,
    embedding_dimensions INT NOT NULL DEFAULT 768,
    locked BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE public.user_embedding_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own embedding config" ON public.user_embedding_configs;
CREATE POLICY "Users can select own embedding config"
ON public.user_embedding_configs FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own embedding config" ON public.user_embedding_configs;
CREATE POLICY "Users can insert own embedding config"
ON public.user_embedding_configs FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own embedding config" ON public.user_embedding_configs;
CREATE POLICY "Users can update own embedding config"
ON public.user_embedding_configs FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own embedding config" ON public.user_embedding_configs;
CREATE POLICY "Users can delete own embedding config"
ON public.user_embedding_configs FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Data API Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_embedding_configs TO authenticated;

-- 2. Drop fixed 768d HNSW index to allow flexible dimensions
DROP INDEX IF EXISTS public.idx_document_chunks_embedding_hnsw;

-- 3. Alter document_chunks.embedding column to generic VECTOR (unconstrained dimension)
ALTER TABLE public.document_chunks ALTER COLUMN embedding TYPE VECTOR;

-- 4. Update match_document_chunks RPC function for generic VECTOR
CREATE OR REPLACE FUNCTION public.match_document_chunks(
    query_embedding VECTOR,
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
    -- Enforce user_id filter to prevent cross-tenant data access
    IF filter_user_id IS NULL THEN
        RAISE EXCEPTION 'filter_user_id is required and cannot be NULL';
    END IF;

    RETURN QUERY
    SELECT
        dc.id,
        dc.document_id,
        dc.content,
        dc.page_number,
        dc.metadata,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE dc.user_id = filter_user_id
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant EXECUTE on generic VECTOR match_document_chunks function
GRANT EXECUTE ON FUNCTION public.match_document_chunks(VECTOR, INT, UUID) TO authenticated;
