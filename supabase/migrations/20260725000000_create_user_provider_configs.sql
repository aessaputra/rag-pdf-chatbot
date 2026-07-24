-- ==============================================================================
-- Supabase Migration: Create User Provider Configs Table
-- Follows .agents/skills/supabase and .agents/skills/supabase-postgres-best-practices
-- Includes: user_provider_configs table, check constraints, RLS policies with
-- cached policy evaluation ((SELECT auth.uid()) = user_id), and Data API Grants.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.user_provider_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    provider TEXT NOT NULL CHECK (provider IN ('gemini', 'openai', 'openrouter', 'openai_compatible')),
    display_name TEXT,
    api_key_enc TEXT NOT NULL,
    base_url TEXT,
    model_name TEXT,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for RLS performance and user lookup
CREATE INDEX IF NOT EXISTS idx_user_provider_configs_user_id ON public.user_provider_configs(user_id);

-- Row Level Security (RLS)
ALTER TABLE public.user_provider_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own provider configs" ON public.user_provider_configs;
CREATE POLICY "Users can select own provider configs"
ON public.user_provider_configs FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own provider configs" ON public.user_provider_configs;
CREATE POLICY "Users can insert own provider configs"
ON public.user_provider_configs FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own provider configs" ON public.user_provider_configs;
CREATE POLICY "Users can update own provider configs"
ON public.user_provider_configs FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own provider configs" ON public.user_provider_configs;
CREATE POLICY "Users can delete own provider configs"
ON public.user_provider_configs FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

-- Data API Grants
GRANT ALL ON TABLE public.user_provider_configs TO authenticated;
