"""
Chat Router Module

Handles RAG query SSE streaming responses and conversation session history.
Follows FastAPI best practices: Annotated dependencies, EventSourceResponse for SSE,
router-declared prefix/tags, and proper exception logging.
"""

import logging
from collections.abc import AsyncIterable
from typing import Annotated, Any, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.concurrency import run_in_threadpool
from fastapi.sse import EventSourceResponse, ServerSentEvent

from app.auth import CurrentUserDep
from app.database import get_supabase_client
from app.schemas import (
    ChatMessageResponse,
    ChatQueryRequest,
    ChatSessionResponse,
    Citation,
)
from app.services.context_retriever import ContextRetriever
from app.services.rag_service import RAGService, initialize_user_models

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/api/chat",
    tags=["Chat"],
)


def parse_citations(citations_raw: Any) -> List[Citation]:
    """Safely parses raw JSONB citations data into a list of Citation DTOs."""
    if not citations_raw:
        return []
    if isinstance(citations_raw, str):
        try:
            import json
            citations_raw = json.loads(citations_raw)
        except Exception:
            return []
    if isinstance(citations_raw, list):
        parsed = []
        for item in citations_raw:
            if isinstance(item, dict):
                try:
                    parsed.append(
                        Citation(
                            filename=str(item.get("filename", "Doc")),
                            page_number=int(item.get("page_number", 1)),
                            content=str(item.get("content", "")),
                        )
                    )
                except Exception:
                    pass
        return parsed
    return []


def get_rag_service(
    user: CurrentUserDep,
    request: ChatQueryRequest,
) -> RAGService:
    """FastAPI dependency that initializes RAGService with user's BYOK models."""
    llm, embeddings_model = initialize_user_models(
        user_id=user.user_id,
        provider=request.provider,
    )
    retriever = ContextRetriever(
        embeddings_model=embeddings_model,
        user_id=user.user_id,
    )
    return RAGService(
        user_id=user.user_id,
        llm=llm,
        retriever=retriever,
    )


RAGServiceDep = Annotated[RAGService, Depends(get_rag_service)]


async def _stream_with_session(
    service: RAGService,
    request: ChatQueryRequest,
    user_id: str,
) -> AsyncIterable[ServerSentEvent]:
    """Wraps RAGService stream with session creation and message persistence."""
    # Auto-create or resolve session
    active_session_id = request.session_id
    try:
        supabase = get_supabase_client()
        if not active_session_id:
            title = request.query[:30] + ("…" if len(request.query) > 30 else "")
            sess_res = supabase.table("chat_sessions").insert({
                "user_id": user_id,
                "title": title,
            }).execute()
            if sess_res.data:
                active_session_id = str(sess_res.data[0]["id"])
    except Exception:
        logger.warning("Failed to create chat session for user %s", user_id, exc_info=True)

    if active_session_id:
        yield ServerSentEvent(data={"session_id": active_session_id}, event="session")

    # Delegate to RAGService stream
    async for event in service.generate_rag_stream(
        query=request.query,
        document_ids=request.document_ids,
    ):
        yield event

    # Persist messages to database
    if active_session_id and service.last_response:
        try:
            supabase = get_supabase_client()
            supabase.table("chat_messages").insert([
                {
                    "session_id": active_session_id,
                    "user_id": user_id,
                    "sender": "user",
                    "content": request.query,
                    "citations": [],
                },
                {
                    "session_id": active_session_id,
                    "user_id": user_id,
                    "sender": "assistant",
                    "content": service.last_response,
                    "citations": service.last_citations,
                },
            ]).execute()
        except Exception:
            logger.warning(
                "Failed to persist chat messages for session %s",
                active_session_id,
                exc_info=True,
            )


@router.post("/stream", response_class=EventSourceResponse)
async def stream_chat_response(
    request: ChatQueryRequest,
    user: CurrentUserDep,
    service: RAGServiceDep,
) -> AsyncIterable[ServerSentEvent]:
    """
    Submits a RAG query and streams Server-Sent Events (SSE) tokens and citations in real time.
    Auto-persists messages to the specified or auto-created session.
    """
    async for event in _stream_with_session(service, request, user.user_id):
        yield event


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
            .order("created_at", desc=False)
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
                citations=parse_citations(r.get("citations")),
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
