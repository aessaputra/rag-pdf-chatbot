-- ==============================================================================
-- Migration: Harden Grants and RPC Function
-- Fixes:
--   1. Narrows GRANT ALL to minimum required permissions (SELECT, INSERT, DELETE)
--   2. Adds USAGE on schema and sequences for completeness
--   3. Grants EXECUTE per-function (not blanket ALL FUNCTIONS)
--   4. Makes filter_user_id NOT NULL in match_document_chunks
--   5. Quotes search_path identifiers per Supabase security guidelines
-- ==============================================================================

-- 1. Revoke overly permissive grants and apply least-privilege
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;

-- Re-grant schema usage (defense-in-depth)
GRANT USAGE ON SCHEMA public TO authenticated;

-- Minimum table permissions
GRANT SELECT, INSERT, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;

-- Grant UPDATE only on tables that actually need it
GRANT UPDATE ON public.chat_sessions TO authenticated;

-- Grant sequence usage for future-proofing
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute on specific functions only (not blanket ALL FUNCTIONS)
GRANT EXECUTE ON FUNCTION public.match_document_chunks(VECTOR(768), INT, UUID) TO authenticated;

-- 2. Replace match_document_chunks with NOT NULL guard and quoted search_path
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
