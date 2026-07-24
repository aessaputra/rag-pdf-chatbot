"""
LLM Factory Module

Provides multi-provider initialization for Chat Models and Embedding models
(Gemini, OpenAI, OpenRouter, OpenAI-Compatible) using user BYOK credentials.
"""

from typing import Any, Dict, Optional
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import settings
from app.services.crypto_service import CryptoService


class LLMFactory:
    """Factory for creating streaming Chat Models and Embedding generators dynamically per user config."""

    @staticmethod
    def _resolve_api_key(config: Dict[str, Any]) -> str:
        """Helper to resolve and decrypt API key from config dictionary."""
        if "api_key" in config and config["api_key"]:
            return config["api_key"]

        if "api_key_enc" in config and config["api_key_enc"]:
            crypto = CryptoService()
            return crypto.decrypt(config["api_key_enc"])

        return ""

    @classmethod
    def get_llm_for_config(cls, config: Dict[str, Any]) -> Any:
        """
        Returns a streaming-enabled LLM instance using decrypted BYOK configuration.
        Supports Gemini, OpenAI, OpenRouter, and OpenAI-Compatible custom endpoints.
        """
        provider = config.get("provider", "gemini").lower().strip()
        api_key = cls._resolve_api_key(config)
        model_name = config.get("model_name")
        base_url = config.get("base_url")

        if provider == "openai":
            return ChatOpenAI(
                model=model_name or "gpt-4o-mini",
                api_key=api_key or "mock-openai-key",
                base_url=base_url or None,
                streaming=True,
            )
        elif provider == "openrouter":
            return ChatOpenAI(
                model=model_name or "~openai/gpt-latest",
                api_key=api_key or "mock-openrouter-key",
                base_url=base_url or "https://openrouter.ai/api/v1",
                streaming=True,
            )
        elif provider == "openai_compatible":
            return ChatOpenAI(
                model=model_name or "gpt-3.5-turbo",
                api_key=api_key or "mock-custom-key",
                base_url=base_url,
                streaming=True,
            )
        elif provider == "ollama":
            return ChatOllama(
                model=model_name or "llama3",
                base_url=base_url or settings.OLLAMA_BASE_URL,
            )
        else:  # Default: Google Gemini
            return ChatGoogleGenerativeAI(
                model=model_name or "gemini-2.5-flash",
                google_api_key=api_key or "mock-gemini-key",
                streaming=True,
            )

    @classmethod
    def get_embeddings_for_config(cls, config: Dict[str, Any]) -> Any:
        """
        Returns an Embeddings generator instance using decrypted BYOK configuration.
        Supports customizable vector output dimensions.
        """
        provider = config.get("provider", "gemini").lower().strip()
        api_key = cls._resolve_api_key(config)
        model_name = config.get("model_name")
        base_url = config.get("base_url")
        dimensions = config.get("embedding_dimensions")

        if provider == "openai":
            kwargs: Dict[str, Any] = {
                "model": model_name or "text-embedding-3-small",
                "api_key": api_key or "mock-openai-key",
            }
            if base_url:
                kwargs["base_url"] = base_url
            if dimensions:
                kwargs["dimensions"] = dimensions
            return OpenAIEmbeddings(**kwargs)

        elif provider in ("openrouter", "openai_compatible"):
            kwargs = {
                "model": model_name or "text-embedding-3-small",
                "api_key": api_key or "mock-custom-key",
                "base_url": base_url or ("https://openrouter.ai/api/v1" if provider == "openrouter" else None),
            }
            if dimensions:
                kwargs["dimensions"] = dimensions
            return OpenAIEmbeddings(**kwargs)

        elif provider == "ollama":
            return OllamaEmbeddings(
                model=model_name or "llama3",
                base_url=base_url or settings.OLLAMA_BASE_URL,
            )
        else:  # Default: Google Gemini
            kwargs = {
                "model": model_name or "models/gemini-embedding-001",
                "google_api_key": api_key or "mock-gemini-key",
            }
            if dimensions:
                kwargs["output_dimensionality"] = dimensions
            return GoogleGenerativeAIEmbeddings(**kwargs)

    @staticmethod
    def get_llm(provider: str = settings.DEFAULT_LLM_PROVIDER) -> Any:
        """Legacy fallback helper for creating static LLM instances from environment settings."""
        return LLMFactory.get_llm_for_config({
            "provider": provider,
            "api_key": settings.OPENAI_API_KEY if provider == "openai" else settings.GEMINI_API_KEY,
        })

    @staticmethod
    def get_embeddings(provider: str = settings.DEFAULT_LLM_PROVIDER) -> Any:
        """Legacy fallback helper for creating static Embeddings instances from environment settings."""
        return LLMFactory.get_embeddings_for_config({
            "provider": provider,
            "api_key": settings.OPENAI_API_KEY if provider == "openai" else settings.GEMINI_API_KEY,
        })
