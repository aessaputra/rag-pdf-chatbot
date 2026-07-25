from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserPayload(BaseModel):
    user_id: str
    email: EmailStr
    role: str = "authenticated"

    model_config = ConfigDict(frozen=True)


class Citation(BaseModel):
    filename: str
    page_number: int
    content: str


class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    sender: str
    content: str
    citations: List[Citation] = []
    created_at: datetime


class DocumentChunkDTO(BaseModel):
    content: str
    page_number: int
    filename: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentUploadResponse(BaseModel):
    document_id: str
    filename: str
    file_size: int
    total_pages: int
    total_chunks: int
    created_at: datetime


class DocumentItemResponse(BaseModel):
    id: str
    filename: str
    file_size: int
    total_pages: int
    file_path: Optional[str] = None
    is_active: bool = True
    status: str = "ready"
    created_at: datetime


class DocumentToggleRequest(BaseModel):
    is_active: bool


class DocumentPreviewResponse(BaseModel):
    document_id: str
    signed_url: str
    expires_in: int = 3600


class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: datetime


ProviderType = Literal["gemini", "openai", "openrouter", "openai_compatible"]


class ChatQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=2000, description="User question prompt")
    provider: Optional[ProviderType] = Field("gemini", description="LLM provider name")
    document_ids: Optional[List[str]] = Field(None, max_length=20, description="Optional document ID filters")
    session_id: Optional[str] = Field(None, description="Optional chat session ID")



class ProviderConfigCreate(BaseModel):
    provider: ProviderType
    api_key: str = Field(min_length=1, description="Raw API key string")
    display_name: Optional[str] = Field(None, max_length=100, description="Custom label e.g. Groq Llama 3")
    base_url: Optional[str] = Field(None, max_length=500, description="Custom base URL endpoint")
    model_name: Optional[str] = Field(None, max_length=200, description="Target model slug name")
    is_default: bool = Field(False, description="Set as active default chat provider")

    def model_post_init(self, __context: Any) -> None:
        if self.provider == "openai_compatible":
            if not self.base_url or not self.base_url.strip():
                raise ValueError("base_url is required for OpenAI-Compatible provider")
            if not self.model_name or not self.model_name.strip():
                raise ValueError("model_name is required for OpenAI-Compatible provider")
        elif self.provider == "openrouter":
            if not self.model_name or not self.model_name.strip():
                raise ValueError("model_name is required for OpenRouter provider")


class ProviderConfigUpdate(BaseModel):
    display_name: Optional[str] = Field(None, max_length=100)
    api_key: Optional[str] = Field(None, min_length=1, description="New raw API key if rotating")
    base_url: Optional[str] = Field(None, max_length=500)
    model_name: Optional[str] = Field(None, max_length=200)
    is_default: Optional[bool] = None


class ProviderConfigResponse(BaseModel):
    id: str
    user_id: str
    provider: str
    display_name: Optional[str] = None
    api_key_masked: str
    base_url: Optional[str] = None
    model_name: Optional[str] = None
    is_default: bool
    created_at: datetime
    updated_at: datetime


class EmbeddingPresetDTO(BaseModel):
    id: str
    name: str
    provider: str
    model_name: str
    embedding_dimensions: int
    description: str


class EmbeddingConfigSaveRequest(BaseModel):
    provider: str = Field(description="Provider name: gemini, openai, openrouter, or openai_compatible")
    api_key: Optional[str] = Field(None, description="Raw API key string (optional if reusing provider key)")
    base_url: Optional[str] = Field(None, max_length=500)
    model_name: str = Field(min_length=1, description="Embedding model name slug")
    embedding_dimensions: int = Field(768, gt=0, description="Vector output dimensions")


class EmbeddingConfigResponse(BaseModel):
    user_id: str
    provider: str
    api_key_masked: str
    base_url: Optional[str] = None
    model_name: str
    embedding_dimensions: int
    locked: bool
    created_at: datetime
    updated_at: datetime


class VerifyModelsRequest(BaseModel):
    provider: str = Field(..., description="Provider type: gemini, openai, openrouter, ollama, or openai_compatible")
    model_type: Literal["chat", "embedding"] = Field("chat", description="Model type filter: chat or embedding")
    api_key: Optional[str] = Field(None, description="Raw API key to test")
    base_url: Optional[str] = Field(None, max_length=500, description="Optional custom base URL")
    config_id: Optional[str] = Field(None, description="Optional existing ProviderConfig ID to reuse saved encrypted key")


class VerifyModelsResponse(BaseModel):
    success: bool
    models: List[str]
    default_model: str
    probed_dimension: Optional[int] = None
    error: Optional[str] = None




