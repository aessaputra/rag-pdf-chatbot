import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class ModelService:
    @classmethod
    async def fetch_available_models(
        cls,
        provider: str,
        api_key: str,
        base_url: str | None = None,
        model_type: str = "chat",
    ) -> dict[str, Any]:
        provider_norm = provider.lower().strip()
        is_embedding = model_type.lower().strip() == "embedding"

        if not api_key and provider_norm == "openrouter":
            api_key = "public"

        if not api_key or not api_key.strip():
            return {
                "success": False,
                "models": [],
                "default_model": "",
                "probed_dimension": None,
                "error": "Kunci API belum diisi. Masukkan Kunci API untuk memuat model live dari provider.",
            }

        try:
            if provider_norm == "gemini":
                models = await cls._fetch_gemini_models(api_key, is_embedding)
            elif provider_norm in ("openai", "openrouter", "openai_compatible"):
                models = await cls._fetch_openai_style_models(provider_norm, api_key, base_url, is_embedding)
            else:
                models = []

            if not models:
                return {
                    "success": False,
                    "models": [],
                    "default_model": "",
                    "probed_dimension": None,
                    "error": f"Tidak ada model {model_type} yang ditemukan dari provider '{provider}'.",
                }

            default_model = models[0]
            probed_dim: int | None = None

            if is_embedding and default_model and api_key and api_key != "public":
                try:
                    probed_dim = await cls.probe_vector_dimension(provider_norm, api_key, default_model, base_url)
                except Exception as err:
                    logger.warning("Vector probe failed: %s", str(err))

            return {
                "success": True,
                "models": models,
                "default_model": default_model,
                "probed_dimension": probed_dim,
                "error": None,
            }
        except Exception as err:
            logger.warning("Live fetch failed for provider %s: %s", provider_norm, str(err))
            return {
                "success": False,
                "models": [],
                "default_model": "",
                "probed_dimension": None,
                "error": str(err),
            }

    @classmethod
    async def probe_vector_dimension(
        cls,
        provider: str,
        api_key: str,
        model_name: str,
        base_url: str | None = None,
    ) -> int:
        provider_norm = provider.lower().strip()

        if provider_norm == "gemini":
            from langchain_google_genai import GoogleGenerativeAIEmbeddings
            emb = GoogleGenerativeAIEmbeddings(model=model_name, google_api_key=api_key)
            vec = await emb.aembed_query("probe")
            return len(vec)

        if provider_norm in ("openai", "openrouter", "openai_compatible"):
            from langchain_openai import OpenAIEmbeddings
            kw: dict[str, Any] = {"model": model_name, "openai_api_key": api_key}
            if base_url:
                kw["openai_api_base"] = base_url
            emb = OpenAIEmbeddings(**kw)
            vec = await emb.aembed_query("probe")
            return len(vec)

        return 768

    @staticmethod
    async def _fetch_gemini_models(api_key: str, is_embedding: bool) -> list[str]:
        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url)
            if resp.status_code != 200:
                raise ValueError("Kunci API tidak valid atau akses ditolak.")
            data = resp.json()
            models: list[str] = []
            for item in data.get("models", []):
                name = item.get("name", "")
                methods = item.get("supportedGenerationMethods", [])
                clean_name = name.replace("models/", "")
                if is_embedding:
                    if "embedContent" in methods:
                        models.append(name if name.startswith("models/") else f"models/{clean_name}")
                else:
                    if "generateContent" in methods:
                        models.append(clean_name)
            return models

    @staticmethod
    async def _fetch_openai_style_models(
        provider: str,
        api_key: str,
        base_url: str | None,
        is_embedding: bool,
    ) -> list[str]:
        if provider == "openrouter":
            url = "https://openrouter.ai/api/v1/models"
            headers = {}
            if api_key and api_key != "public":
                headers["Authorization"] = f"Bearer {api_key}"
        elif provider == "openai_compatible" and base_url:
            url = f"{base_url.rstrip('/')}/models"
            headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        else:
            url = "https://api.openai.com/v1/models"
            headers = {"Authorization": f"Bearer {api_key}"}

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code != 200:
                raise ValueError("Kunci API tidak valid atau akses ditolak.")
            data = resp.json()
            models: list[str] = []
            for item in data.get("data", []):
                m_id = item.get("id", "")
                if is_embedding:
                    if "embed" in m_id.lower():
                        models.append(m_id)
                else:
                    models.append(m_id)
            return models

