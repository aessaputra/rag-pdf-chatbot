
from fastapi import APIRouter, HTTPException, status

from app.auth import CurrentUserDep
from app.database import execute_query, get_supabase_client
from app.schemas import (
    EmbeddingConfigResponse,
    EmbeddingConfigSaveRequest,
    EmbeddingPresetDTO,
    ProviderConfigCreate,
    ProviderConfigResponse,
    ProviderConfigUpdate,
    VerifyModelsRequest,
    VerifyModelsResponse,
)
from app.services.crypto_service import CryptoService
from app.services.model_service import ModelService

router = APIRouter(
    prefix="/api/settings",
    tags=["Settings"],
)


def _format_config_response(record: dict, crypto: CryptoService) -> ProviderConfigResponse:
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


@router.get("/providers", response_model=list[ProviderConfigResponse])
async def list_provider_configs(user: CurrentUserDep) -> list[ProviderConfigResponse]:
    supabase = await get_supabase_client()
    crypto = CryptoService()

    response = await execute_query(
        supabase.table("user_provider_configs")
        .select("*")
        .eq("user_id", user.user_id)
        .order("created_at", desc=True)
    )

    records = response.data if response.data else []
    return [_format_config_response(r, crypto) for r in records]


@router.post("/providers", response_model=ProviderConfigResponse, status_code=status.HTTP_201_CREATED)
async def create_provider_config(
    payload: ProviderConfigCreate,
    user: CurrentUserDep,
) -> ProviderConfigResponse:
    supabase = await get_supabase_client()
    crypto = CryptoService()

    if payload.is_default:
        await execute_query(
            supabase.table("user_provider_configs")
            .update({"is_default": False})
            .eq("user_id", user.user_id)
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

    response = await execute_query(supabase.table("user_provider_configs").insert(data))
    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gagal menyimpan konfigurasi provider."
        )

    return _format_config_response(response.data[0], crypto)


@router.post("/providers/verify-models", response_model=VerifyModelsResponse)
async def verify_and_list_models(
    payload: VerifyModelsRequest,
    user: CurrentUserDep,
) -> VerifyModelsResponse:
    api_key = payload.api_key
    base_url = payload.base_url

    if not api_key and payload.config_id:
        supabase = await get_supabase_client()
        crypto = CryptoService()
        existing = await execute_query(
            supabase.table("user_provider_configs")
            .select("api_key_enc, base_url")
            .eq("id", payload.config_id)
            .eq("user_id", user.user_id)
        )
        key_from_db = crypto.decrypt(existing.data[0].get("api_key_enc", "")) if existing.data else None
        url_from_db = existing.data[0].get("base_url") if existing.data else None
        if key_from_db:
            api_key = key_from_db
        if not base_url:
            base_url = url_from_db

    res = await ModelService.fetch_available_models(
        provider=payload.provider,
        api_key=api_key or "",
        base_url=base_url,
        model_type=payload.model_type,
    )
    return VerifyModelsResponse(**res)


@router.put("/providers/{config_id}", response_model=ProviderConfigResponse)
async def update_provider_config(
    config_id: str,
    payload: ProviderConfigUpdate,
    user: CurrentUserDep,
) -> ProviderConfigResponse:
    supabase = await get_supabase_client()
    crypto = CryptoService()

    existing = await execute_query(
        supabase.table("user_provider_configs")
        .select("*")
        .eq("id", config_id)
        .eq("user_id", user.user_id)
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konfigurasi provider tidak ditemukan."
        )

    update_data = payload.model_dump(exclude_unset=True, exclude={"api_key"})
    
    if payload.api_key:
        update_data["api_key_enc"] = crypto.encrypt(payload.api_key)

    if payload.is_default:
        await execute_query(
            supabase.table("user_provider_configs")
            .update({"is_default": False})
            .eq("user_id", user.user_id)
        )

    if not update_data:
        return _format_config_response(existing.data[0], crypto)

    response = await execute_query(
        supabase.table("user_provider_configs")
        .update(update_data)
        .eq("id", config_id)
        .eq("user_id", user.user_id)
    )

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gagal memperbarui konfigurasi provider."
        )

    return _format_config_response(response.data[0], crypto)


@router.delete("/providers/{config_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provider_config(
    config_id: str,
    user: CurrentUserDep,
) -> None:
    supabase = await get_supabase_client()

    existing = await execute_query(
        supabase.table("user_provider_configs")
        .select("id")
        .eq("id", config_id)
        .eq("user_id", user.user_id)
    )

    if not existing.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konfigurasi provider tidak ditemukan."
        )

    await execute_query(supabase.table("user_provider_configs").delete().eq("id", config_id).eq("user_id", user.user_id))


RECOMMENDED_EMBEDDING_PRESETS: list[EmbeddingPresetDTO] = [
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


@router.get("/embedding/presets", response_model=list[EmbeddingPresetDTO])
async def list_embedding_presets() -> list[EmbeddingPresetDTO]:
    return RECOMMENDED_EMBEDDING_PRESETS


@router.get("/embedding", response_model=EmbeddingConfigResponse)
async def get_embedding_config(user: CurrentUserDep) -> EmbeddingConfigResponse:
    supabase = await get_supabase_client()
    crypto = CryptoService()

    config_res = await execute_query(
        supabase.table("user_embedding_configs")
        .select("*")
        .eq("user_id", user.user_id)
    )

    if not config_res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Konfigurasi embedding belum diatur."
        )

    doc_count_res = await execute_query(
        supabase.table("documents")
        .select("id", count="exact")
        .eq("user_id", user.user_id)
    )
    is_locked = (doc_count_res.count or 0) > 0

    return _format_embedding_response(config_res.data[0], is_locked, crypto)


@router.post("/embedding", response_model=EmbeddingConfigResponse)
async def save_embedding_config(
    payload: EmbeddingConfigSaveRequest,
    user: CurrentUserDep,
) -> EmbeddingConfigResponse:
    supabase = await get_supabase_client()
    crypto = CryptoService()

    doc_count_res = await execute_query(
        supabase.table("documents")
        .select("id", count="exact")
        .eq("user_id", user.user_id)
    )
    has_documents = (doc_count_res.count or 0) > 0

    existing_res = await execute_query(
        supabase.table("user_embedding_configs")
        .select("*")
        .eq("user_id", user.user_id)
    )

    if has_documents and existing_res.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Model embedding telah terkunci karena Anda memiliki dokumen PDF yang diunggah. Hapus semua dokumen terlebih dahulu untuk mengganti model embedding."
        )

    api_key_enc = None
    if payload.api_key:
        api_key_enc = crypto.encrypt(payload.api_key)
    else:
        provider_res = await execute_query(
            supabase.table("user_provider_configs")
            .select("api_key_enc")
            .eq("user_id", user.user_id)
            .eq("provider", payload.provider)
            .limit(1)
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

    upsert_res = await execute_query(
        supabase.table("user_embedding_configs")
        .upsert(data, on_conflict="user_id")
    )

    if not upsert_res.data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Gagal menyimpan konfigurasi model embedding."
        )

    return _format_embedding_response(upsert_res.data[0], has_documents, crypto)

