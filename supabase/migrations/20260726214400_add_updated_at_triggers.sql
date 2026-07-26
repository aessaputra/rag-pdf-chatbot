CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public', 'pg_temp'
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_user_provider_configs_updated_at ON public.user_provider_configs;
CREATE TRIGGER set_user_provider_configs_updated_at
BEFORE UPDATE ON public.user_provider_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_embedding_configs_updated_at ON public.user_embedding_configs;
CREATE TRIGGER set_user_embedding_configs_updated_at
BEFORE UPDATE ON public.user_embedding_configs
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
