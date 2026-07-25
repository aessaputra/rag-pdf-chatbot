from functools import lru_cache
from typing import Literal, Optional
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Supabase Configuration
    SUPABASE_URL: str = Field(alias="SUPABASE_URL")
    SUPABASE_SECRET_KEY: str = Field(
        validation_alias=AliasChoices("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
    )
    SUPABASE_JWKS_URL: Optional[str] = Field(None, alias="SUPABASE_JWKS_URL")
    SUPABASE_JWT_SECRET: str = Field("placeholder_jwt_secret", alias="SUPABASE_JWT_SECRET")
    SUPABASE_JWT_AUDIENCE: str = Field("authenticated", alias="SUPABASE_JWT_AUDIENCE")

    # Encryption Configuration
    SETTINGS_ENCRYPTION_KEY: str = Field(
        "default_secret_key_32_bytes_long_123456",
        alias="SETTINGS_ENCRYPTION_KEY",
        description="32-byte secret key for AES-256-GCM BYOK API key encryption"
    )

    # LLM Provider Configuration

    DEFAULT_LLM_PROVIDER: Literal["gemini", "openai", "ollama"] = Field("gemini", alias="DEFAULT_LLM_PROVIDER")
    GEMINI_API_KEY: str = Field("placeholder_gemini_key", alias="GEMINI_API_KEY")
    OPENAI_API_KEY: str = Field("placeholder_openai_key", alias="OPENAI_API_KEY")
    OLLAMA_BASE_URL: str = Field("http://localhost:11434", alias="OLLAMA_BASE_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


# Singleton settings instance export
settings = get_settings()
