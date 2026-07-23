"""
Configuration Module Tests

Verifies application configuration loading, default settings, and validation rules.
"""

import pytest
from pydantic import ValidationError
from app.config import Settings, settings


def test_should_load_default_settings_with_expected_attributes():
    """Verify that default settings object initializes with valid attributes."""
    assert settings.DEFAULT_LLM_PROVIDER in ["gemini", "openai", "ollama"]
    assert isinstance(settings.SUPABASE_URL, str)
    assert isinstance(settings.SUPABASE_JWT_SECRET, str)


def test_should_allow_valid_llm_provider_override():
    """Verify that valid LLM providers can be set successfully."""
    custom_settings = Settings(DEFAULT_LLM_PROVIDER="openai")
    assert custom_settings.DEFAULT_LLM_PROVIDER == "openai"


def test_should_raise_validation_error_for_invalid_llm_provider():
    """Verify that unsupported LLM providers trigger a validation error."""
    with pytest.raises(ValidationError):
        Settings(DEFAULT_LLM_PROVIDER="unsupported_llm_model")
