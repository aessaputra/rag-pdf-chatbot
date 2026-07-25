"""
Schemas Module

Defines Data Transfer Objects (DTOs) and Pydantic models for API request/response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class UserPayload(BaseModel):
    """Authenticated user context payload extracted from Supabase JWT access token."""

    user_id: str
    email: EmailStr
    role: str = "authenticated"

    model_config = ConfigDict(frozen=True)


class Citation(BaseModel):
    """Reference citation details pointing to a specific page within an uploaded PDF."""

    filename: str
    page_number: int
    content: str


class ChatMessageResponse(BaseModel):
    """Response DTO for a chat message, including optional source citations."""

    id: str
    session_id: str
    sender: str
    content: str
    citations: List[Citation] = []
    created_at: datetime


class DocumentChunkDTO(BaseModel):
    """DTO representing a single parsed document chunk ready for embedding."""

    content: str
    page_number: int
    filename: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class DocumentUploadResponse(BaseModel):
    """Response returned upon successful PDF ingestion and vector storage."""

    document_id: str
    filename: str
    file_size: int
    total_pages: int
    total_chunks: int
    created_at: datetime


class DocumentItemResponse(BaseModel):
    """Response DTO for a document in the user's knowledge base."""

    id: str
    filename: str
    file_size: int
    total_pages: int
    file_path: Optional[str] = None
    is_active: bool = True
    status: str = "ready"
    created_at: datetime


class DocumentToggleRequest(BaseModel):
    """Payload for toggling a document's RAG active status."""

    is_active: bool


class DocumentPreviewResponse(BaseModel):
    """Response DTO containing a temporary signed URL for PDF preview."""

    document_id: str
    signed_url: str
    expires_in: int = 3600


class ChatSessionResponse(BaseModel):
    """Response DTO for a chat session thread."""

    id: str
    user_id: str
    title: str
    created_at: datetime


ProviderType = Literal["gemini", "openai", "openrouter", "openai_compatible"]


class ChatQueryRequest(BaseModel):
    """Payload for submitting a RAG query to the streaming endpoint."""

    query: str = Field(min_length=1, max_length=2000, description="User question prompt")
    provider: Optional[ProviderType] = Field("gemini", description="LLM provider name")
    document_ids: Optional[List[str]] = Field(None, max_length=20, description="Optional document ID filters")
    session_id: Optional[str] = Field(None, description="Optional chat session ID")



class ProviderConfigCreate(BaseModel):
    """Payload for registering a new LLM provider configuration."""

    provider: ProviderType
    api_key: str = Field(min_length=1, description="Raw API key string")
    display_name: Optional[str] = Field(None, max_length=100, description="Custom label e.g. Groq Llama 3")
    base_url: Optional[str] = Field(None, max_length=500, description="Custom base URL endpoint")
    model_name: Optional[str] = Field(None, max_length=200, description="Target model slug name")
    is_default: bool = Field(False, description="Set as active default chat provider")

    def model_post_init(self, __context: Any) -> None:
        """Validate required fields per provider type after initialization."""
        if self.provider == "openai_compatible":
            if not self.base_url or not self.base_url.strip():
                raise ValueError("base_url is required for OpenAI-Compatible provider")
            if not self.model_name or not self.model_name.strip():
                raise ValueError("model_name is required for OpenAI-Compatible provider")
        elif self.provider == "openrouter":
            if not self.model_name or not self.model_name.strip():
                raise ValueError("model_name is required for OpenRouter provider")


class ProviderConfigUpdate(BaseModel):
    """Payload for updating an existing LLM provider configuration."""

    display_name: Optional[str] = Field(None, max_length=100)
    api_key: Optional[str] = Field(None, min_length=1, description="New raw API key if rotating")
    base_url: Optional[str] = Field(None, max_length=500)
    model_name: Optional[str] = Field(None, max_length=200)
    is_default: Optional[bool] = None


class ProviderConfigResponse(BaseModel):
    """Response DTO for LLM provider configuration with masked API key."""

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
    """DTO for recommended embedding model presets."""

    id: str
    name: str
    provider: str
    model_name: str
    embedding_dimensions: int
    description: str


class EmbeddingConfigSaveRequest(BaseModel):
    """Payload for creating or updating user's active embedding model configuration."""

    provider: str = Field(description="Provider name: gemini, openai, openrouter, or openai_compatible")
    api_key: Optional[str] = Field(None, description="Raw API key string (optional if reusing provider key)")
    base_url: Optional[str] = Field(None, max_length=500)
    model_name: str = Field(min_length=1, description="Embedding model name slug")
    embedding_dimensions: int = Field(768, gt=0, description="Vector output dimensions")


class EmbeddingConfigResponse(BaseModel):
    """Response DTO for user's active embedding configuration."""

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
    """Payload for validating an API key and fetching available LLM models."""

    provider: str = Field(..., description="Provider type: gemini, openai, openrouter, ollama, or openai_compatible")
    api_key: Optional[str] = Field(None, description="Raw API key to test")
    base_url: Optional[str] = Field(None, max_length=500, description="Optional custom base URL")
    config_id: Optional[str] = Field(None, description="Optional existing ProviderConfig ID to reuse saved encrypted key")


class VerifyModelsResponse(BaseModel):
    """Response DTO for verified provider model listing."""

    success: bool
    models: List[str]
    default_model: str
    error: Optional[str] = None



