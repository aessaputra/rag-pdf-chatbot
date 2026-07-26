from typing import Any

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

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

    @staticmethod
    def _resolve_model_name(config: dict[str, Any]) -> str:
        model_name = config.get("model_name")
        if not model_name:
            raise ValueError("Model name is required.")
        return model_name

    @classmethod
    def get_llm_for_config(cls, config: dict[str, Any]) -> BaseChatModel:
        provider = config.get("provider", "gemini").lower().strip()
        api_key = cls._resolve_api_key(config)
        model_name = cls._resolve_model_name(config)
        base_url = config.get("base_url")

        if not api_key:
            raise ValueError(f"API key is required for provider '{provider}'.")

        if provider == "openai":
            return ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url=base_url or None,
                streaming=True,
            )
        elif provider == "openrouter":
            return ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url=base_url or "https://openrouter.ai/api/v1",
                streaming=True,
            )
        elif provider == "openai_compatible":
            return ChatOpenAI(
                model=model_name,
                api_key=api_key,
                base_url=base_url,
                streaming=True,
            )
        else:
            return ChatGoogleGenerativeAI(
                model=model_name,
                google_api_key=api_key,
                streaming=True,
            )

    @classmethod
    def get_embeddings_for_config(cls, config: dict[str, Any]) -> Embeddings:
        provider = config.get("provider", "gemini").lower().strip()
        api_key = cls._resolve_api_key(config)
        model_name = cls._resolve_model_name(config)
        base_url = config.get("base_url")
        dimensions = config.get("embedding_dimensions")

        if not api_key:
            raise ValueError(f"API key is required for provider '{provider}'.")

        if provider == "openai":
            kwargs: dict[str, Any] = {
                "model": model_name,
                "api_key": api_key,
            }
            if base_url:
                kwargs["base_url"] = base_url
            if dimensions:
                kwargs["dimensions"] = dimensions
            return OpenAIEmbeddings(**kwargs)

        elif provider in ("openrouter", "openai_compatible"):
            kwargs = {
                "model": model_name,
                "api_key": api_key,
                "base_url": base_url or ("https://openrouter.ai/api/v1" if provider == "openrouter" else None),
            }
            if dimensions:
                kwargs["dimensions"] = dimensions
            return OpenAIEmbeddings(**kwargs)

        else:
            kwargs = {
                "model": model_name,
                "google_api_key": api_key,
            }
            if dimensions:
                kwargs["output_dimensionality"] = dimensions
            return GoogleGenerativeAIEmbeddings(**kwargs)
