"""
Model Service Module

Provides helper functions for validating provider API keys and fetching available models
from LLM providers (Google Gemini, OpenAI, OpenRouter, Ollama, OpenAI-Compatible).
"""

import logging
from typing import Any, Dict, List, Optional
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

# Canonical defaults when API list fetching is empty or fails
DEFAULT_MODELS: Dict[str, str] = {
    "gemini": "gemini-2.5-flash",
    "openai": "gpt-4o-mini",
    "openrouter": "meta-llama/llama-3.3-70b-instruct",
    "ollama": "llama3",
    "openai_compatible": "gpt-3.5-turbo",
}


class ModelService:
    """Service to fetch and validate available models for dynamic BYOK provider configurations."""

    @classmethod
    async def fetch_available_models(
        cls,
        provider: str,
        api_key: str,
        base_url: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Fetches live available models from provider API endpoints.

        Returns:
            Dict with keys:
                - success (bool)
                - models (List[str])
                - default_model (str)
                - error (Optional[str])
        """
        provider_norm = provider.lower().strip()
        default_model = DEFAULT_MODELS.get(provider_norm, "gemini-2.5-flash")

        try:
            if provider_norm == "gemini":
                models = await cls._fetch_gemini_models(api_key)
            elif provider_norm in ("openai", "openrouter", "openai_compatible"):
                models = await cls._fetch_openai_style_models(provider_norm, api_key, base_url)
            elif provider_norm == "ollama":
                models = await cls._fetch_ollama_models(base_url or settings.OLLAMA_BASE_URL)
            else:
                models = []

            # Ensure default model is included if models list returned
            if models and default_model not in models:
                models.insert(0, default_model)

            return {
                "success": True,
                "models": models if models else [default_model],
                "default_model": default_model,
                "error": None,
            }
        except Exception as err:
            logger.warning("Failed to fetch models for provider %s: %s", provider_norm, str(err))
            return {
                "success": False,
                "models": [default_model],
                "default_model": default_model,
                "error": f"Gagal mengambil daftar model: {str(err)}",
            }

    @staticmethod
    async def _fetch_gemini_models(api_key: str) -> List[str]:
        if not api_key or api_key.startswith("mock-"):
            return ["gemini-2.5-flash", "gemini-2.5-pro", "gemini-1.5-flash", "gemini-1.5-pro"]

        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise ValueError(f"HTTP {resp.status_code}: {resp.text[:150]}")

            data = resp.json()
            models_data = data.get("models", [])
            results: List[str] = []

            for item in models_data:
                name = item.get("name", "")
                methods = item.get("supportedGenerationMethods", [])

                # Filter generation models
                if "generateContent" in methods:
                    clean_name = name.replace("models/", "")
                    if "gemini" in clean_name and not clean_name.endswith("-embedding"):
                        results.append(clean_name)

            # Sort results with gemini-2.5-flash first if present
            results.sort(key=lambda m: (0 if "2.5-flash" in m else 1, m))
            return results if results else ["gemini-2.5-flash", "gemini-2.5-pro"]

    @staticmethod
    async def _fetch_openai_style_models(
        provider: str, api_key: str, base_url: Optional[str]
    ) -> List[str]:
        if not api_key or api_key.startswith("mock-"):
            if provider == "openai":
                return ["gpt-4o-mini", "gpt-4o", "o1-preview", "o3-mini"]
            elif provider == "openrouter":
                return ["meta-llama/llama-3.3-70b-instruct", "openai/gpt-4o", "anthropic/claude-3.5-sonnet"]
            else:
                return ["gpt-3.5-turbo", "llama-3.3-70b-versatile"]

        target_url = (base_url.rstrip("/") if base_url else "")
        if provider == "openrouter":
            endpoint = "https://openrouter.ai/api/v1/models"
        elif target_url:
            endpoint = f"{target_url}/models" if not target_url.endswith("/models") else target_url
        else:
            endpoint = "https://api.openai.com/v1/models"

        headers = {"Authorization": f"Bearer {api_key}"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(endpoint, headers=headers)
            if resp.status_code != 200:
                raise ValueError(f"HTTP {resp.status_code}: {resp.text[:150]}")

            data = resp.json()
            model_items = data.get("data", [])
            results: List[str] = []

            for item in model_items:
                model_id = item.get("id", "")
                if not model_id:
                    continue

                if provider == "openai":
                    # Filter chat/instruct models
                    if any(k in model_id for k in ("gpt-", "o1", "o3", "chat")):
                        if not any(k in model_id for k in ("realtime", "audio", "transcription", "tts", "whisper", "embedding")):
                            results.append(model_id)
                else:
                    results.append(model_id)

            results.sort()
            return results if results else (["gpt-4o-mini", "gpt-4o"] if provider == "openai" else [])

    @staticmethod
    async def _fetch_ollama_models(base_url: str) -> List[str]:
        target_url = base_url.rstrip("/") + "/api/tags"
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(target_url)
            if resp.status_code != 200:
                return ["llama3"]

            data = resp.json()
            models_data = data.get("models", [])
            results = [m.get("name", "").split(":")[0] for m in models_data if m.get("name")]
            return results if results else ["llama3"]
