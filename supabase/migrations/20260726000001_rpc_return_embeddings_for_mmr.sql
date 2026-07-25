-- ==============================================================================
-- Supabase Migration: Update RPC to return embeddings for MMR processing
-- ==============================================================================

-- Drop the existing function since the return type is changing
DROP FUNCTION IF EXISTS public.match_document_chunks(VECTOR, INT, UUID);

-- Recreate with embedding column
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
        dc.content,
        dc.page_number,
        dc.metadata,
        dc.embedding,
        1 - (dc.embedding <=> query_embedding) AS similarity
    FROM public.document_chunks dc
    WHERE dc.user_id = filter_user_id
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- Grant EXECUTE on generic VECTOR match_document_chunks function
GRANT EXECUTE ON FUNCTION public.match_document_chunks(VECTOR, INT, UUID) TO authenticated;
