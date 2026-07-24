"""
Chat Router Module

Handles RAG query SSE streaming responses and conversation session history.
Follows FastAPI best practices (Annotated dependencies, explicit router tags).
"""

from typing import List, Optional
from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import StreamingResponse

from app.auth import CurrentUserDep
from app.database import get_supabase_client
from app.schemas import (
    ChatMessageResponse,
    ChatQueryRequest,
    ChatSessionResponse,
    Citation,
)
from app.services.rag_service import RAGService

router = APIRouter()


@router.post("/stream")
async def stream_chat_response(
    request: ChatQueryRequest,
    user: CurrentUserDep,
) -> StreamingResponse:
    """
    Submits a RAG query and streams Server-Sent Events (SSE) tokens and citations in real time.
    Auto-persists messages to the specified or auto-created session.
    """
    rag_service = RAGService(user_id=user.user_id, provider=request.provider)
    await run_in_threadpool(rag_service.initialize_user_models)

    return StreamingResponse(
        rag_service.generate_rag_stream(
            query=request.query,
            user_id=user.user_id,
            document_ids=request.document_ids,
            session_id=request.session_id,
        ),
        media_type="text/event-stream",
    )


@router.get("/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(user: CurrentUserDep) -> List[ChatSessionResponse]:
    """Retrieves all chat session history records owned by the authenticated user."""
    def fetch_sessions() -> List[ChatSessionResponse]:
        supabase = get_supabase_client()
        response = (
            supabase.table("chat_sessions")
            .select("*")
            .eq("user_id", user.user_id)
            .order("created_at", desc=True)
            .execute()
        )
        records = response.data if response.data else []
        return [
            ChatSessionResponse(
                id=str(r["id"]),
                user_id=str(r["user_id"]),
                title=r.get("title", "Percakapan"),
                created_at=str(r["created_at"]),
            )
            for r in records
        ]

    return await run_in_threadpool(fetch_sessions)


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
async def list_session_messages(
    session_id: str,
    user: CurrentUserDep,
) -> List[ChatMessageResponse]:
    """Retrieves all chat messages for a specific session."""
    def fetch_messages() -> List[ChatMessageResponse]:
        supabase = get_supabase_client()
        response = (
            supabase.table("chat_messages")
            .select("*")
            .eq("session_id", session_id)
            .eq("user_id", user.user_id)
            .order("created_at", asc=True)
            .execute()
        )
        records = response.data if response.data else []
        return [
            ChatMessageResponse(
                id=str(r["id"]),
                session_id=str(r["session_id"]),
                user_id=str(r["user_id"]),
                sender=r["sender"],
                content=r["content"],
                citations=[Citation(**c) for c in (r.get("citations") or [])],
                created_at=str(r["created_at"]),
            )
            for r in records
        ]

    return await run_in_threadpool(fetch_messages)


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_chat_session(
    user: CurrentUserDep,
    title: Optional[str] = None,
) -> ChatSessionResponse:
    """Creates a new chat session."""
    def insert_session() -> ChatSessionResponse:
        supabase = get_supabase_client()
        data = {
            "user_id": user.user_id,
            "title": title or "Percakapan Baru",
        }
        response = supabase.table("chat_sessions").insert(data).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Gagal membuat sesi percakapan.")
        record = response.data[0]
        return ChatSessionResponse(
            id=str(record["id"]),
            user_id=str(record["user_id"]),
            title=record["title"],
            created_at=str(record["created_at"]),
        )

    return await run_in_threadpool(insert_session)


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_chat_session(session_id: str, user: CurrentUserDep) -> None:
    """Deletes a chat session and its messages."""
    def remove_session() -> None:
        supabase = get_supabase_client()
        supabase.table("chat_sessions").delete().eq("id", session_id).eq("user_id", user.user_id).execute()

    await run_in_threadpool(remove_session)

