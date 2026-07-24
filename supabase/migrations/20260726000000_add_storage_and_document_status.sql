-- ==============================================================================
-- Supabase Migration: Add Storage Bucket & Document Status (RAG Scoping)
-- Follows .agents/skills/supabase and .agents/skills/supabase-postgres-best-practices
-- Includes:
--   1. Add file_path, is_active, and status columns to public.documents
--   2. Add UPDATE RLS policy on public.documents (missing from init migration)
--   3. Partial Index for active + ready documents
--   4. Private Storage Bucket 'documents' creation & RLS Policies
--   5. Update match_document_chunks RPC to pre-filter active & ready documents
-- ==============================================================================

-- 1. Alter public.documents table
ALTER TABLE public.documents
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ready';

-- 2. Add UPDATE RLS policy on public.documents (was missing from init migration)
DROP POLICY IF EXISTS "Users can update own documents" ON public.documents;
CREATE POLICY "Users can update own documents"
ON public.documents FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

-- 3. Partial Index for active & ready documents (high-performance RAG queries)
CREATE INDEX IF NOT EXISTS idx_documents_user_active_ready
ON public.documents (user_id)
WHERE is_active = true AND status = 'ready';

-- 4. Storage Bucket Creation (Private Bucket, PDF only, 50 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('documents', 'documents', false, 52428800, ARRAY['application/pdf'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage RLS Policies (Isolated to user folder: {user_id}/*)
DROP POLICY IF EXISTS "Users can read own documents in storage" ON storage.objects;
CREATE POLICY "Users can read own documents in storage"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can upload own documents to storage" ON storage.objects;
CREATE POLICY "Users can upload own documents to storage"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own documents from storage" ON storage.objects;
CREATE POLICY "Users can delete own documents from storage"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'documents' AND (SELECT auth.uid())::text = (storage.foldername(name))[1]);

-- 5. Update match_document_chunks RPC with Pre-filtering JOIN
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
    JOIN public.documents d ON d.id = dc.document_id
    WHERE dc.user_id = filter_user_id
      AND d.is_active = true
      AND d.status = 'ready'
    ORDER BY dc.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.match_document_chunks(VECTOR, INT, UUID) TO authenticated;
