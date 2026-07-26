-- ==============================================================================
-- Migration: Harden client grants, function execution, and domain constraints
-- ==============================================================================

-- Existing app traffic goes through the backend Supabase service-role client.
-- Browser clients only use Supabase Auth, so public table/RPC access is not needed.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;

REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;

REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;

REVOKE ALL ON SCHEMA public FROM anon;
REVOKE ALL ON SCHEMA public FROM authenticated;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON FUNCTION public.match_document_chunks(VECTOR, INT, UUID) TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon, authenticated, PUBLIC;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated, PUBLIC;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'documents_status_check'
          AND conrelid = 'public.documents'::regclass
    ) THEN
        ALTER TABLE public.documents
        ADD CONSTRAINT documents_status_check
        CHECK (status IN ('processing', 'ready', 'failed')) NOT VALID;
    END IF;
END;
$$;

ALTER TABLE public.documents VALIDATE CONSTRAINT documents_status_check;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'user_embedding_configs_provider_check'
          AND conrelid = 'public.user_embedding_configs'::regclass
    ) THEN
        ALTER TABLE public.user_embedding_configs
        ADD CONSTRAINT user_embedding_configs_provider_check
        CHECK (provider IN ('gemini', 'openai', 'openrouter', 'openai_compatible')) NOT VALID;
    END IF;
END;
$$;

ALTER TABLE public.user_embedding_configs VALIDATE CONSTRAINT user_embedding_configs_provider_check;
