# Design Specification: Chat Session History Restoration & Persistence

**Date**: 2026-07-24  
**Topic**: Chat Session History Persistence & Restoration (`/dashboard`)  
**Design & Code Principles**: Clean Code, FastAPI Best Practices, Vercel React Best Practices & Composition Patterns, Minimalist UI.

---

## 1. Overview & Goal

Implement full-stack persistence and UI restoration for Chat Session History in the RAG PDF Chatbot application. Users can view past conversation threads in the Sidebar, switch between active sessions with auto-loaded message/citation history, start new sessions, and delete obsolete sessions.

### Core Objectives:
1. **Backend REST Endpoints (`backend/app/routers/chat_router.py`)**:
   - `GET /api/chat/sessions`: List user sessions sorted by `created_at` DESC.
   - `GET /api/chat/sessions/{session_id}/messages`: Retrieve stored messages and citations for a specific session.
   - `POST /api/chat/sessions`: Create a new session explicitly.
   - `DELETE /api/chat/sessions/{session_id}`: Delete a session and its associated messages.
   - Stream Persistence (`POST /api/chat/stream`): Persist user prompt, assistant response, and citations array to Supabase `chat_messages` table upon completion. Emits `session_id` in initial stream token.
2. **Frontend Helper API (`frontend/src/lib/api.ts`)**:
   - Add `listChatSessions`, `getSessionMessages`, `createChatSession`, `deleteChatSession`.
3. **Sidebar UI Integration (`frontend/src/components/Sidebar.tsx`)**:
   - Display a monospace section header **`PERCAKAPAN`**.
   - Render a scrollable list of chat sessions with active session highlighting and a trash icon button for deletion on hover.
4. **Dashboard Auto-Load Flow (`frontend/src/app/dashboard/page.tsx`)**:
   - On load, fetch user sessions. Auto-load the most recent session's messages and citations into `ChatWindow`.

---

## 2. Component Breakdown

### A. Backend (`backend/app/routers/chat_router.py` & `backend/app/services/rag_service.py`)
- Pydantic DTOs for `ChatSessionResponse` and `ChatMessageResponse`.
- FastAPI endpoints with `Annotated[UserPayload, Depends(get_current_user)]` and non-blocking `run_in_threadpool` database calls.
- Auto-creation of `chat_sessions` record if `session_id` is missing in `ChatQueryRequest`.

### B. Frontend Types & API (`frontend/src/types/index.ts` & `frontend/src/lib/api.ts`)
- Interface `ChatSession`: `{ id: string; title: string; created_at: string }`.
- API functions handling Supabase JWT authorization headers.

### C. Sidebar Component (`frontend/src/components/Sidebar.tsx`)
- Composition pattern: Accepts `sessions`, `activeSessionId`, `onSelectSession`, `onDeleteSession` props.
- Render sessions list with active styling (`bg-[#18181b] border-white text-white`).

### D. Dashboard Page (`frontend/src/app/dashboard/page.tsx`)
- Orchestrates session switching, auto-loading messages, starting new chats, sending queries with active `session_id`, and updating `sessions` state.

---

## 3. Verification Plan

1. **Automated Verification**:
   - Run `python -m pytest tests/ -v` in `backend/` to verify session endpoints & RAG streaming persistence.
   - Run `npm run build` in `frontend/` to ensure TypeScript types and App Router compilation pass cleanly.
2. **Manual Verification**:
   - Send chat queries, verify session auto-creation and stream persistence in database.
   - Click past sessions in Sidebar and verify message history & citations reload correctly.
   - Click `Percakapan Baru` and verify fresh canvas initialization.
