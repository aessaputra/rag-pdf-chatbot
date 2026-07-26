-- ==============================================================================
-- Supabase Migration: Ticket 05 - Add parent_chunk_id and update RPC
-- ==============================================================================

-- 1. Add the parent_chunk_id column
ALTER TABLE public.document_chunks
ADD COLUMN parent_chunk_id UUID REFERENCES public.document_chunks(id) ON DELETE CASCADE;

-- Create an index on the new column to make the LEFT JOIN and cascading deletes fast
CREATE INDEX IF NOT EXISTS idx_document_chunks_parent_chunk_id ON public.document_chunks(parent_chunk_id);

-- 2. Drop the existing function
DROP FUNCTION IF EXISTS public.match_document_chunks(VECTOR, INT, UUID);

-- 3. Recreate the function with a LEFT JOIN
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
    embedding VECTOR,
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
        COALESCE(parent.content, dc.content) AS content,
        dc.page_number,
        dc.metadata,
        dc.embedding,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    LEFT JOIN public.document_chunks parent 
        ON dc.parent_chunk_id = parent.id
    WHERE dc.user_id = filter_user_id
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant EXECUTE
GRANT EXECUTE ON FUNCTION public.match_document_chunks(VECTOR, INT, UUID) TO authenticated;
