from app.config import Settings, settings

def test_settings_default_values():
    assert settings.DEFAULT_LLM_PROVIDER in ["gemini", "openai", "ollama"]
    assert hasattr(settings, "SUPABASE_URL")
    assert hasattr(settings, "SUPABASE_JWT_SECRET")

def test_settings_override():
    custom_settings = Settings(DEFAULT_LLM_PROVIDER="openai")
    assert custom_settings.DEFAULT_LLM_PROVIDER == "openai"
