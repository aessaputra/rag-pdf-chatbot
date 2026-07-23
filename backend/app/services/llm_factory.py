"""
LLM Factory Module

Provides multi-provider initialization for Chat Models and Embedding models (Gemini, OpenAI, Ollama).
"""

from typing import Any
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from langchain_ollama import ChatOllama, OllamaEmbeddings
from langchain_openai import ChatOpenAI, OpenAIEmbeddings

from app.config import settings


class LLMFactory:
    """Factory for creating LLM Chat Models and Embedding generators based on provider selection."""

    @staticmethod
    def get_llm(provider: str = settings.DEFAULT_LLM_PROVIDER) -> Any:
        """Returns a streaming-enabled LLM instance for the specified provider."""
        normalized_provider = provider.lower().strip()

        if normalized_provider == "openai":
            return ChatOpenAI(
                model="gpt-4o-mini",
                api_key=settings.OPENAI_API_KEY,
                streaming=True
            )
        elif normalized_provider == "ollama":
            return ChatOllama(
                model="llama3",
                base_url=settings.OLLAMA_BASE_URL
            )
        else:  # Default: Google Gemini
            return ChatGoogleGenerativeAI(
                model="gemini-1.5-flash",
                google_api_key=settings.GEMINI_API_KEY,
                streaming=True
            )

    @staticmethod
    def get_embeddings(provider: str = settings.DEFAULT_LLM_PROVIDER) -> Any:
        """Returns an Embeddings generator instance for the specified provider."""
        normalized_provider = provider.lower().strip()

        if normalized_provider == "openai":
            return OpenAIEmbeddings(
                model="text-embedding-3-small",
                api_key=settings.OPENAI_API_KEY
            )
        elif normalized_provider == "ollama":
            return OllamaEmbeddings(
                model="llama3",
                base_url=settings.OLLAMA_BASE_URL
            )
        else:  # Default: Google Gemini
            return GoogleGenerativeAIEmbeddings(
                model="models/text-embedding-004",
                google_api_key=settings.GEMINI_API_KEY
            )
