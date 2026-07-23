"""
App Configuration Module

Defines application-wide settings using Pydantic BaseSettings, loading values from
environment variables or .env file with default fallbacks.
"""

from typing import Literal, Optional
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

SUPPORTED_LLM_PROVIDERS = ("gemini", "openai", "ollama")


class Settings(BaseSettings):
    """Application configuration settings schema and validator."""

    # Supabase Credentials
    SUPABASE_URL: str = "https://placeholder.supabase.co"
    SUPABASE_SERVICE_ROLE_KEY: str = "placeholder-key"
    SUPABASE_JWT_SECRET: str = "placeholder-secret"

    # LLM Provider Configurations
    DEFAULT_LLM_PROVIDER: Literal["gemini", "openai", "ollama"] = "gemini"
    GEMINI_API_KEY: Optional[str] = ""
    OPENAI_API_KEY: Optional[str] = ""
    OLLAMA_BASE_URL: str = "http://localhost:11434"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @field_validator("DEFAULT_LLM_PROVIDER")
    @classmethod
    def validate_llm_provider(cls, value: str) -> str:
        """Ensures the configured default LLM provider is supported."""
        normalized = value.lower().strip()
        if normalized not in SUPPORTED_LLM_PROVIDERS:
            raise ValueError(
                f"Unsupported LLM provider '{value}'. Supported providers are: {SUPPORTED_LLM_PROVIDERS}"
            )
        return normalized


settings = Settings()
