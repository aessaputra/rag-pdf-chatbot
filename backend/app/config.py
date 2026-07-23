"""
Configuration Module

Loads and validates environment variables using Pydantic v2 BaseSettings.
Supports modern Supabase key conventions (SUPABASE_SECRET_KEY, SUPABASE_JWKS_URL).
"""

from functools import lru_cache
from typing import Literal, Optional
from pydantic import AliasChoices, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application Settings Model."""

    # Modern Supabase Configuration
    SUPABASE_URL: str = Field(..., alias="SUPABASE_URL")
    SUPABASE_SECRET_KEY: str = Field(
        ...,
        validation_alias=AliasChoices("SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY")
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        "placeholder_service_role_key",
        validation_alias=AliasChoices("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_SECRET_KEY")
    )
    SUPABASE_JWKS_URL: Optional[str] = Field(None, alias="SUPABASE_JWKS_URL")
    SUPABASE_JWT_SECRET: str = Field("placeholder_jwt_secret", alias="SUPABASE_JWT_SECRET")

    # LLM Provider Configuration
    DEFAULT_LLM_PROVIDER: Literal["gemini", "openai", "ollama"] = Field("gemini", alias="DEFAULT_LLM_PROVIDER")
    GEMINI_API_KEY: str = Field("placeholder_gemini_key", alias="GEMINI_API_KEY")
    OPENAI_API_KEY: str = Field("placeholder_openai_key", alias="OPENAI_API_KEY")
    OLLAMA_BASE_URL: str = Field("http://localhost:11434", alias="OLLAMA_BASE_URL")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Returns cached singleton Settings instance."""
    return Settings()


# Singleton settings instance export
settings = get_settings()
