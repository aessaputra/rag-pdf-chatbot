"""
Schemas Module

Defines Data Transfer Objects (DTOs) and Pydantic models for API request/response validation.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
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
