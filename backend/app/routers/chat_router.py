"""
Chat Router Module

Handles RAG query SSE streaming responses and conversation session history.
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse

from app.auth import get_current_user
from app.database import get_supabase_client
from app.schemas import ChatQueryRequest, UserPayload
from app.services.rag_service import RAGService

router = APIRouter()


@router.post("/stream")
async def stream_chat_response(
    request: ChatQueryRequest,
    user: UserPayload = Depends(get_current_user)
) -> StreamingResponse:
    """
    Submits a RAG query and streams Server-Sent Events (SSE) tokens and citations in real time.
    """
    provider = request.provider or "gemini"
    rag_service = RAGService(provider=provider)

    return StreamingResponse(
        rag_service.generate_rag_stream(
            query=request.query,
            user_id=user.user_id,
            document_ids=request.document_ids
        ),
        media_type="text/event-stream"
    )


@router.get("/sessions", response_model=List[Dict[str, Any]])
def list_chat_sessions(user: UserPayload = Depends(get_current_user)) -> List[Dict[str, Any]]:
    """Retrieves all chat session history records owned by the authenticated user."""
    supabase = get_supabase_client()
    response = (
        supabase.table("chat_sessions")
        .select("id, title, created_at")
        .eq("user_id", user.user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data if response.data else []
