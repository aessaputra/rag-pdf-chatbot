CREATE TABLE IF NOT EXISTS public.user_enrichment_configs (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    preset TEXT NOT NULL DEFAULT 'standard' CHECK (preset IN ('off', 'standard', 'high', 'full')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_enrichment_configs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can select own enrichment config" ON public.user_enrichment_configs;
CREATE POLICY "Users can select own enrichment config"
ON public.user_enrichment_configs FOR SELECT TO authenticated
USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert own enrichment config" ON public.user_enrichment_configs;
CREATE POLICY "Users can insert own enrichment config"
ON public.user_enrichment_configs FOR INSERT TO authenticated
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own enrichment config" ON public.user_enrichment_configs;
CREATE POLICY "Users can update own enrichment config"
ON public.user_enrichment_configs FOR UPDATE TO authenticated
USING ((SELECT auth.uid()) = user_id)
WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own enrichment config" ON public.user_enrichment_configs;
CREATE POLICY "Users can delete own enrichment config"
ON public.user_enrichment_configs FOR DELETE TO authenticated
USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_enrichment_configs TO authenticated;

DROP TRIGGER IF EXISTS update_user_enrichment_configs_updated_at ON public.user_enrichment_configs;
CREATE TRIGGER update_user_enrichment_configs_updated_at
    BEFORE UPDATE ON public.user_enrichment_configs
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
