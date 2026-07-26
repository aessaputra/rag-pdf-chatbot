from typing import Any

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import settings
from app.services.crypto_service import CryptoService


class LLMFactory:
    @staticmethod
    def _resolve_api_key(config: dict[str, Any]) -> str:
        if config.get("api_key"):
            return config["api_key"]

        if config.get("api_key_enc"):
            crypto = CryptoService()
            return crypto.decrypt(config["api_key_enc"])

        return ""

    @classmethod
    def get_llm_for_config(cls, config: dict[str, Any]) -> BaseChatModel:
        provider = config.get("provider", "gemini").lower().strip()
        api_key = cls._resolve_api_key(config)
        model_name = config.get("model_name")
        base_url = config.get("base_url")

        if provider != "ollama" and not api_key:
            raise ValueError(f"API key is required for provider '{provider}'.")

        if provider == "openai":
            return ChatOpenAI(
                model=model_name or "gpt-4o-mini",
                api_key=api_key,
                base_url=base_url or None,
                streaming=True,
            )
        elif provider == "openrouter":
            return ChatOpenAI(
                model=model_name or "~openai/gpt-latest",
                api_key=api_key,
                base_url=base_url or "https://openrouter.ai/api/v1",
                streaming=True,
            )
        elif provider == "openai_compatible":
            return ChatOpenAI(
                model=model_name or "gpt-3.5-turbo",
                api_key=api_key,
                base_url=base_url,
                streaming=True,
            )
        elif provider == "ollama":
            return ChatOllama(
                model=model_name or "llama3",
                base_url=base_url or settings.OLLAMA_BASE_URL,
            )
        else:
            return ChatGoogleGenerativeAI(
                model=model_name or "gemini-2.5-flash",
                google_api_key=api_key,
                streaming=True,
            )

    @classmethod
    def get_embeddings_for_config(cls, config: dict[str, Any]) -> Embeddings:
        provider = config.get("provider", "gemini").lower().strip()
        api_key = cls._resolve_api_key(config)
        model_name = config.get("model_name")
        base_url = config.get("base_url")
        dimensions = config.get("embedding_dimensions")

        if provider != "ollama" and not api_key:
            raise ValueError(f"API key is required for provider '{provider}'.")

        if provider == "openai":
            kwargs: dict[str, Any] = {
                "model": model_name or "text-embedding-3-small",
                "api_key": api_key,
            }
            if base_url:
                kwargs["base_url"] = base_url
            if dimensions:
                kwargs["dimensions"] = dimensions
            return OpenAIEmbeddings(**kwargs)

        elif provider in ("openrouter", "openai_compatible"):
            kwargs = {
                "model": model_name or "text-embedding-3-small",
                "api_key": api_key,
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
        else:
            kwargs = {
                "model": model_name or "models/gemini-embedding-001",
                "google_api_key": api_key,
            }
            if dimensions:
                kwargs["output_dimensionality"] = dimensions
            return GoogleGenerativeAIEmbeddings(**kwargs)
