"""
Unit tests for BYOK LLMFactory dynamic provider and embedding model creation
"""

import pytest

from app.services.crypto_service import CryptoService
from app.services.llm_factory import LLMFactory


def test_llm_factory_gemini_creation():
    """Verify LLMFactory creates ChatGoogleGenerativeAI with provided model name."""
    crypto = CryptoService()
    encrypted_key = crypto.encrypt("AIzaSy-test-gemini-key")

    config = {
        "provider": "gemini",
        "api_key_enc": encrypted_key,
        "model_name": "gemini-2.5-flash"
    }

    llm = LLMFactory.get_llm_for_config(config)
    assert llm is not None
    assert hasattr(llm, "model")
    assert llm.model == "gemini-2.5-flash"


def test_llm_factory_openai_compatible_creation():
    """Verify LLMFactory creates ChatOpenAI with custom base_url and model_name."""
    crypto = CryptoService()
    encrypted_key = crypto.encrypt("gsk_groq_api_key_123")

    config = {
        "provider": "openai_compatible",
        "api_key_enc": encrypted_key,
        "base_url": "https://api.groq.com/openai/v1",
        "model_name": "llama-3.3-70b-versatile"
    }

    llm = LLMFactory.get_llm_for_config(config)
    assert llm is not None
    assert llm.model_name == "llama-3.3-70b-versatile"
    assert str(llm.openai_api_base) == "https://api.groq.com/openai/v1"


def test_llm_factory_openrouter_creation():
    """Verify LLMFactory creates ChatOpenAI pointing to OpenRouter endpoint."""
    crypto = CryptoService()
    encrypted_key = crypto.encrypt("sk-or-v1-key")

    config = {
        "provider": "openrouter",
        "api_key_enc": encrypted_key,
        "model_name": "meta-llama/llama-3-70b"
    }

    llm = LLMFactory.get_llm_for_config(config)
    assert llm is not None
    assert llm.model_name == "meta-llama/llama-3-70b"
    assert "openrouter.ai" in str(llm.openai_api_base)


def test_llm_factory_embeddings_creation():
    """Verify LLMFactory creates OpenAIEmbeddings with custom dimensions."""
    crypto = CryptoService()
    encrypted_key = crypto.encrypt("sk-openai-key")

    config = {
        "provider": "openai",
        "api_key_enc": encrypted_key,
        "model_name": "text-embedding-3-small",
        "embedding_dimensions": 1536
    }

    embeddings = LLMFactory.get_embeddings_for_config(config)
    assert embeddings is not None
    assert embeddings.model == "text-embedding-3-small"
    assert embeddings.dimensions == 1536


def test_llm_factory_rejects_missing_api_key():
    with pytest.raises(ValueError, match="API key is required"):
        LLMFactory.get_llm_for_config({"provider": "openai", "model_name": "gpt-4o-mini"})


def test_embedding_factory_rejects_missing_api_key():
    with pytest.raises(ValueError, match="API key is required"):
        LLMFactory.get_embeddings_for_config({"provider": "gemini", "model_name": "models/gemini-embedding-001"})
