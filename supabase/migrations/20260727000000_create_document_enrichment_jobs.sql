CREATE TABLE IF NOT EXISTS public.document_enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_paragraphs INT NOT NULL DEFAULT 0,
    processed_paragraphs INT NOT NULL DEFAULT 0,
    question_chunks_created INT NOT NULL DEFAULT 0,
    failed_paragraphs INT NOT NULL DEFAULT 0,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id)
);

CREATE INDEX IF NOT EXISTS idx_document_enrichment_jobs_document_id ON public.document_enrichment_jobs(document_id);
CREATE INDEX IF NOT EXISTS idx_document_enrichment_jobs_user_id ON public.document_enrichment_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_document_enrichment_jobs_status ON public.document_enrichment_jobs(status);

ALTER TABLE public.document_enrichment_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own enrichment jobs" ON public.document_enrichment_jobs;
CREATE POLICY "Users can select own enrichment jobs"
ON public.document_enrichment_jobs FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own enrichment jobs" ON public.document_enrichment_jobs;
CREATE POLICY "Users can insert own enrichment jobs"
ON public.document_enrichment_jobs FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own enrichment jobs" ON public.document_enrichment_jobs;
CREATE POLICY "Users can update own enrichment jobs"
ON public.document_enrichment_jobs FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own enrichment jobs" ON public.document_enrichment_jobs;
CREATE POLICY "Users can delete own enrichment jobs"
ON public.document_enrichment_jobs FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_enrichment_jobs TO authenticated;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_document_enrichment_jobs_updated_at ON public.document_enrichment_jobs;
CREATE TRIGGER update_document_enrichment_jobs_updated_at
    BEFORE UPDATE ON public.document_enrichment_jobs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
