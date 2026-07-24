"""
Settings Router Module

Handles CRUD REST endpoints for BYOK LLM Provider Configurations.
Follows FastAPI best practices (Annotated dependencies, explicit return types, non-blocking threadpool execution).
"""

from typing import List
from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from app.auth import CurrentUserDep
from app.database import get_supabase_client
from app.schemas import (
    EmbeddingConfigResponse,
    EmbeddingConfigSaveRequest,
    EmbeddingPresetDTO,
    ProviderConfigCreate,
    ProviderConfigResponse,
    ProviderConfigUpdate,
)

from app.services.crypto_service import CryptoService

router = APIRouter()


def _format_config_response(record: dict, crypto: CryptoService) -> ProviderConfigResponse:
    """Formats raw database record into ProviderConfigResponse DTO with masked API key."""
    decrypted_key = crypto.decrypt(record.get("api_key_enc", ""))
    masked_key = crypto.mask_api_key(decrypted_key)

    return ProviderConfigResponse(
        id=str(record["id"]),
        user_id=str(record["user_id"]),
        provider=record["provider"],
        display_name=record.get("display_name"),
        api_key_masked=masked_key,
        base_url=record.get("base_url"),
        model_name=record.get("model_name"),
        is_default=record.get("is_default", False),
        created_at=record["created_at"],
        updated_at=record["updated_at"],
    )


@router.get("/providers", response_model=List[ProviderConfigResponse])
async def list_provider_configs(user: CurrentUserDep) -> List[ProviderConfigResponse]:
    """Retrieves all LLM provider configurations owned by the authenticated user."""
    def fetch_configs() -> List[ProviderConfigResponse]:
        supabase = get_supabase_client()
        crypto = CryptoService()

        response = (
            supabase.table("user_provider_configs")
            .select("*")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )

        records = response.data if response.data else []
        return [_format_config_response(r, crypto) for r in records]

    return await run_in_threadpool(fetch_configs)


@router.post("/providers", response_model=ProviderConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_provider_config(
    payload: ProviderConfigCreate,
    user: CurrentUserDep,
) -> ProviderConfigResponse:
    """Creates a new LLM provider configuration with encrypted API key."""
    def insert_config() -> ProviderConfigResponse:
        supabase = get_supabase_client()
        crypto = CryptoService()

        # If marking as default, unset previous default configs for this user
        if payload.is_default:
            (
                supabase.table("user_provider_configs")
                .update({"is_default": False})
                .eq("user_id", user.user_id)
                .execute()
            )

        encrypted_api_key = crypto.encrypt(payload.api_key)

        data = {
            "user_id": user.user_id,
            "provider": payload.provider,
            "display_name": payload.display_name,
            "api_key_enc": encrypted_api_key,
            "base_url": payload.base_url,
            "model_name": payload.model_name,
            "is_default": payload.is_default,
        }

        response = supabase.table("user_provider_configs").insert(data).execute()
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gagal menyimpan konfigurasi provider."
            )

        return _format_config_response(response.data[0], crypto)

    return await run_in_threadpool(insert_config)


@router.put("/providers/{config_id}", response_model=ProviderConfigResponse)
async def update_provider_config(
    config_id: str,
    payload: ProviderConfigUpdate,
    user: CurrentUserDep,
) -> ProviderConfigResponse:
    """Updates an existing LLM provider configuration."""
    def modify_config() -> ProviderConfigResponse:
        supabase = get_supabase_client()
        crypto = CryptoService()

        # Check existing record ownership
        existing = (
            supabase.table("user_provider_configs")
            .select("*")
            .eq("id", config_id)
            .eq("user_id", user.user_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Konfigurasi provider tidak ditemukan."
            )

        update_data = {}
        if payload.display_name is not None:
            update_data["display_name"] = payload.display_name
        if payload.base_url is not None:
            update_data["base_url"] = payload.base_url
        if payload.model_name is not None:
            update_data["model_name"] = payload.model_name
        if payload.api_key:
            update_data["api_key_enc"] = crypto.encrypt(payload.api_key)

        if payload.is_default is not None:
            update_data["is_default"] = payload.is_default
            if payload.is_default:
                (
                    supabase.table("user_provider_configs")
                    .update({"is_default": False})
                    .eq("user_id", user.user_id)
                    .execute()
                )

        if not update_data:
            return _format_config_response(existing.data[0], crypto)

        response = (
            supabase.table("user_provider_configs")
            .update(update_data)
            .eq("id", config_id)
            .eq("user_id", user.user_id)
            .execute()
        )

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gagal memperbarui konfigurasi provider."
            )

        return _format_config_response(response.data[0], crypto)

    return await run_in_threadpool(modify_config)


@router.delete("/providers/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider_config(
    config_id: str,
    user: CurrentUserDep,
) -> None:
    """Deletes an LLM provider configuration owned by the authenticated user."""
    def remove_config() -> None:
        supabase = get_supabase_client()

        existing = (
            supabase.table("user_provider_configs")
            .select("id")
            .eq("id", config_id)
            .eq("user_id", user.user_id)
            .execute()
        )

        if not existing.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Konfigurasi provider tidak ditemukan."
            )

        supabase.table("user_provider_configs").delete().eq("id", config_id).eq("user_id", user.user_id).execute()

    await run_in_threadpool(remove_config)


# --- Embedding Configuration Endpoints ---

RECOMMENDED_EMBEDDING_PRESETS: List[EmbeddingPresetDTO] = [
    EmbeddingPresetDTO(
        id="gemini-embedding-001",
        name="Google Gemini (768d)",
        provider="gemini",
        model_name="models/gemini-embedding-001",
        embedding_dimensions=768,
        description="Default"
    ),
    EmbeddingPresetDTO(
        id="openai-text-embedding-3-small-1536",
        name="OpenAI text-embedding-3-small (1536d)",
        provider="openai",
        model_name="text-embedding-3-small",
        embedding_dimensions=1536,
        description="Standard"
    ),
    EmbeddingPresetDTO(
        id="openai-text-embedding-3-small-768",
        name="OpenAI text-embedding-3-small (768d)",
        provider="openai",
        model_name="text-embedding-3-small",
        embedding_dimensions=768,
        description="MRL Sliced"
    ),
    EmbeddingPresetDTO(
        id="openai-text-embedding-3-large-3072",
        name="OpenAI text-embedding-3-large (3072d)",
        provider="openai",
        model_name="text-embedding-3-large",
        embedding_dimensions=3072,
        description="High Precision"
    ),
]


def _format_embedding_response(record: dict, is_locked: bool, crypto: CryptoService) -> EmbeddingConfigResponse:
    """Formats raw database record into EmbeddingConfigResponse DTO with masked API key."""
    decrypted_key = crypto.decrypt(record.get("api_key_enc", ""))
    masked_key = crypto.mask_api_key(decrypted_key)

    return EmbeddingConfigResponse(
        user_id=str(record["user_id"]),
        provider=record["provider"],
        api_key_masked=masked_key,
        base_url=record.get("base_url"),
        model_name=record["model_name"],
        embedding_dimensions=record.get("embedding_dimensions", 768),
        locked=is_locked,
        created_at=record["created_at"],
        updated_at=record["updated_at"],
    )


@router.get("/embedding/presets", response_model=List[EmbeddingPresetDTO])
async def list_embedding_presets() -> List[EmbeddingPresetDTO]:
    """Returns static list of recommended embedding model presets."""
    return RECOMMENDED_EMBEDDING_PRESETS


@router.get("/embedding", response_model=EmbeddingConfigResponse)
async def get_embedding_config(user: CurrentUserDep) -> EmbeddingConfigResponse:
    """Retrieves authenticated user's active embedding model configuration and lock status."""
    def fetch_embedding() -> EmbeddingConfigResponse:
        supabase = get_supabase_client()
        crypto = CryptoService()

        # Check existing embedding config
        config_res = (
            supabase.table("user_embedding_configs")
            .select("*")
            .eq("user_id", user.user_id)
            .execute()
        )

        if not config_res.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Konfigurasi embedding belum diatur."
            )

        # Determine lock status based on document count
        doc_count_res = (
            supabase.table("documents")
            .select("id", count="exact")
            .eq("user_id", user.user_id)
            .execute()
        )
        is_locked = (doc_count_res.count or 0) > 0

        return _format_embedding_response(config_res.data[0], is_locked, crypto)

    return await run_in_threadpool(fetch_embedding)


@router.post("/embedding", response_model=EmbeddingConfigResponse)
async def save_embedding_config(
    payload: EmbeddingConfigSaveRequest,
    user: CurrentUserDep,
) -> EmbeddingConfigResponse:
    """Saves or updates user's active embedding model configuration. Rejects if documents exist (locked)."""
    def upsert_embedding() -> EmbeddingConfigResponse:
        supabase = get_supabase_client()
        crypto = CryptoService()

        # Check if embedding model is locked due to existing documents
        doc_count_res = (
            supabase.table("documents")
            .select("id", count="exact")
            .eq("user_id", user.user_id)
            .execute()
        )
        has_documents = (doc_count_res.count or 0) > 0

        # Check existing embedding config
        existing_res = (
            supabase.table("user_embedding_configs")
            .select("*")
            .eq("user_id", user.user_id)
            .execute()
        )

        if has_documents and existing_res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Model embedding telah terkunci karena Anda memiliki dokumen PDF yang diunggah. Hapus semua dokumen terlebih dahulu untuk mengganti model embedding."
            )

        # Resolve API key: custom payload key or reuse existing ProviderConfig key
        api_key_enc = None
        if payload.api_key:
            api_key_enc = crypto.encrypt(payload.api_key)
        else:
            # Re-use API key from user's configured provider
            provider_res = (
                supabase.table("user_provider_configs")
                .select("api_key_enc")
                .eq("user_id", user.user_id)
                .eq("provider", payload.provider)
                .limit(1)
                .execute()
            )
            if provider_res.data:
                api_key_enc = provider_res.data[0]["api_key_enc"]

        if not api_key_enc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"API key untuk provider '{payload.provider}' belum dikonfigurasi. Masukkan API key atau simpan Provider Config terlebih dahulu."
            )

        data = {
            "user_id": user.user_id,
            "provider": payload.provider,
            "api_key_enc": api_key_enc,
            "base_url": payload.base_url,
            "model_name": payload.model_name,
            "embedding_dimensions": payload.embedding_dimensions,
            "locked": has_documents,
        }

        upsert_res = (
            supabase.table("user_embedding_configs")
            .upsert(data, on_conflict="user_id")
            .execute()
        )

        if not upsert_res.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Gagal menyimpan konfigurasi model embedding."
            )

        return _format_embedding_response(upsert_res.data[0], has_documents, crypto)

    return await run_in_threadpool(upsert_embedding)

