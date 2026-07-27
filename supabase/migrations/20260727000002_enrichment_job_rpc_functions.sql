CREATE OR REPLACE FUNCTION start_enrichment_job(
    p_document_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE document_enrichment_jobs
    SET 
        status = 'running',
        started_at = NOW()
    WHERE 
        document_id = p_document_id
        AND user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION complete_enrichment_job(
    p_document_id UUID,
    p_processed_paragraphs INTEGER,
    p_question_chunks_created INTEGER
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
BEGIN
    UPDATE document_enrichment_jobs
    SET 
        status = 'completed',
        completed_at = NOW(),
        processed_paragraphs = p_processed_paragraphs,
        question_chunks_created = p_question_chunks_created
    WHERE 
        document_id = p_document_id
        AND user_id = auth.uid();
END;
$$;

REVOKE EXECUTE ON FUNCTION start_enrichment_job(UUID) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION complete_enrichment_job(UUID, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION start_enrichment_job(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION complete_enrichment_job(UUID, INTEGER, INTEGER) TO authenticated;
