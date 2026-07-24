"""
Chat Router Module

Handles RAG query SSE streaming responses and conversation session history.
Follows FastAPI best practices (Annotated dependencies, explicit router tags).
"""

from typing import Any, Dict, List
from fastapi import APIRouter
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from app.auth import CurrentUserDep
from app.database import get_supabase_client
from app.schemas import ChatQueryRequest
from app.services.rag_service import RAGService

router = APIRouter()


@router.post("/stream")
async def stream_chat_response(
    request: ChatQueryRequest,
    user: CurrentUserDep,
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
            document_ids=request.document_ids,
        ),
        media_type="text/event-stream",
    )


@router.get("/sessions", response_model=List[Dict[str, Any]])
async def list_chat_sessions(user: CurrentUserDep) -> List[Dict[str, Any]]:
    """Retrieves all chat session history records owned by the authenticated user."""
    def fetch_sessions() -> List[Dict[str, Any]]:
        supabase = get_supabase_client()
        response = (
            supabase.table("chat_sessions")
            .select("id, title, created_at")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        return response.data if response.data else []

    return await run_in_threadpool(fetch_sessions)
