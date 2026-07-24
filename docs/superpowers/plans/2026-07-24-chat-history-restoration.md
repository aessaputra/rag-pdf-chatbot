# Chat Session History Restoration & Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement full-stack Chat Session History persistence and UI restoration so users can view, switch between, create, and delete chat sessions in the sidebar.

**Architecture:** 
1. Backend (`backend/app/routers/chat_router.py` & `backend/app/services/rag_service.py`): Add session CRUD endpoints (`GET /sessions`, `GET /sessions/{id}/messages`, `DELETE /sessions/{id}`), auto-create session on query if missing, and persist assistant SSE response + citations to Supabase `chat_messages`.
2. Frontend Types & API (`frontend/src/types/index.ts` & `frontend/src/lib/api.ts`): Add `ChatSession` type and API functions (`listChatSessions`, `getSessionMessages`, `createChatSession`, `deleteChatSession`).
3. Sidebar & Dashboard (`frontend/src/components/Sidebar.tsx` & `frontend/src/app/dashboard/page.tsx`): Render sessions list in Sidebar under `PERCAKAPAN`, auto-load most recent session on load, handle one-click session switching.

**Tech Stack:** FastAPI, Pydantic v2, Supabase PostgreSQL (`chat_sessions`, `chat_messages`), Next.js 15, React 19, TypeScript, Tailwind CSS v4.

---

### Task 1: Backend Session CRUD Endpoints & SSE Persistence (`backend/app/`)

**Files:**
- Modify: `backend/app/schemas.py:50-80`
- Modify: `backend/app/routers/chat_router.py:1-58`
- Modify: `backend/app/services/rag_service.py:100-220`
- Create/Modify: `backend/tests/test_chat_sessions.py`

- [ ] **Step 1: Add Pydantic Schemas for Chat Sessions & Messages in `backend/app/schemas.py`**

Add DTOs to `backend/app/schemas.py`:

```python
class ChatSessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    created_at: str

class ChatMessageResponse(BaseModel):
    id: str
    session_id: str
    user_id: str
    sender: str  # 'user' or 'assistant'
    content: str
    citations: List[CitationDTO] = []
    created_at: str

class ChatQueryRequest(BaseModel):
    query: str
    provider: str = "gemini"
    document_ids: Optional[List[str]] = None
    session_id: Optional[str] = None
```

- [ ] **Step 2: Add REST Endpoints in `backend/app/routers/chat_router.py`**

Implement `GET /sessions`, `GET /sessions/{session_id}/messages`, `POST /sessions`, and `DELETE /sessions/{session_id}`:

```python
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
                citations=r.get("citations") or [],
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
```

- [ ] **Step 3: Update `RAGService` to auto-persist messages & emit `session_id`**

Update `backend/app/services/rag_service.py` to accept `session_id`, auto-create session if None, save `user` prompt message and `assistant` streamed message + citations array into Supabase `chat_messages` table.

- [ ] **Step 4: Run pytest in `backend/`**

Run command:
`cd backend && venv\Scripts\activate && python -m pytest tests/ -v`

Expected Output: All tests pass cleanly.

---

### Task 2: Frontend Types, API Client & Sidebar/Dashboard UI Integration

**Files:**
- Modify: `frontend/src/types/index.ts:1-50`
- Modify: `frontend/src/lib/api.ts:250-329`
- Modify: `frontend/src/components/Sidebar.tsx:1-128`
- Modify: `frontend/src/app/dashboard/page.tsx:1-250`

- [ ] **Step 1: Add `ChatSession` types to `frontend/src/types/index.ts`**

```ts
export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export interface ChatMessageItem {
  id?: string;
  session_id?: string;
  sender: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at?: string;
}
```

- [ ] **Step 2: Add Helper API Functions in `frontend/src/lib/api.ts`**

Add `listChatSessions`, `getSessionMessages`, `createChatSession`, and `deleteChatSession` functions.

- [ ] **Step 3: Update `Sidebar.tsx` to render Session History**

Add `sessions`, `activeSessionId`, `onSelectSession`, `onDeleteSession` to `SidebarProps`.
Render `PERCAKAPAN` section header and scrollable session item list.

- [ ] **Step 4: Update `frontend/src/app/dashboard/page.tsx` to manage sessions & auto-load latest session**

- Manage state: `sessions: ChatSession[]`, `activeSessionId: string | null`.
- Load sessions on init. Auto-select `sessions[0]` and fetch its messages.
- Pass active `session_id` when streaming queries.
- Refresh sessions list after query completion.

- [ ] **Step 5: Run frontend type check and build**

Run command:
`cd frontend && npm run build`

Expected Output: 0 TypeScript errors and clean Next.js build.

---

### Task 3: Commit Changes to Git

- [ ] **Step 1: Commit backend & frontend session history changes**

Run command:
`git add backend/ frontend/ docs/superpowers/specs/2026-07-24-chat-history-restoration-design.md docs/superpowers/plans/2026-07-24-chat-history-restoration.md`
`git commit -m "feat(chat): implement full-stack chat session history persistence and restoration"`
