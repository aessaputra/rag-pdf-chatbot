# Ticket-05 Specification: FastAPI Main Endpoints & Router Integration

> **Reference Ticket:** [TICKET-05] (from `docs/TICKETS.md`)  
> **Applied Skills:** `to-spec`, `python-fastapi-development`, `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengembang aplikasi frontend Next.js, kita memerlukan endpoint REST API yang terstruktur dan terproteksi di FastAPI Backend untuk mengunggah dokumen PDF, melihat/menghapus daftar dokumen, mengelola sesi obrolan, serta menerima balasan RAG *streaming* secara realtime melalui koneksi Server-Sent Events (SSE).

Tanpa router API yang bersih, validasi Pydantic yang ketat, dan proteksi middleware JWT, frontend tidak dapat terhubung secara aman dengan layanan ingestion dan mesin RAG backend.

---

## Solution

Menyusun router API `backend/app/routers/document_router.py`, `backend/app/routers/chat_router.py`, dan file entry point `backend/app/main.py`:
1. **Document Router (`/api/documents`)**:
   - `POST /api/documents/upload`: Menerima file `UploadFile` (PDF), memvalidasi ekstensi `.pdf`, dan memanggil `PDFIngestionService`.
   - `GET /api/documents`: Mengembalikan daftar dokumen milik `user_id` aktif.
   - `DELETE /api/documents/{document_id}`: Menghapus dokumen dan chunks milik `user_id`.
2. **Chat Router (`/api/chat`)**:
   - `POST /api/chat/stream`: Endpoint SSE `StreamingResponse` (`text/event-stream`) yang menjalankan `RAGService.generate_rag_stream()`.
   - `GET /api/chat/sessions`: Mengembalikan daftar sesi obrolan pengguna.
3. **Application Entry Point (`backend/app/main.py`)**:
   - Menyiapkan objek `FastAPI` dengan middleware CORS (`http://localhost:3000`), routing `/api`, dan endpoint `/health`.
4. **Integration & API Testing**:
   - Menyiapkan unit/integration test di `backend/tests/test_routers.py` menggunakan `httpx.AsyncClient` / `TestClient`.

---

## User Stories

1. As an authenticated user, I want to upload a PDF file via `POST /api/documents/upload`, so that I receive immediate JSON confirmation of parsed pages and chunks.
2. As a frontend client, I want to connect to `POST /api/chat/stream` with `text/event-stream`, so that I can stream RAG tokens and citations in real time.
3. As a web developer, I want CORS middleware configured for `http://localhost:3000`, so that the Next.js frontend can make cross-origin API calls without browser blockage.

---

## Implementation Decisions

### 1. Endpoint Design & Security Middleware

All API routes under `/api/documents` and `/api/chat` require `user: UserPayload = Depends(get_current_user)`.

#### DTO Request Schemas (`backend/app/schemas.py`)
```python
from pydantic import BaseModel, Field
from typing import List, Optional

class ChatQueryRequest(BaseModel):
    """Payload for submitting a RAG query to the streaming endpoint."""
    query: str = Field(..., min_length=1, description="User question prompt")
    provider: Optional[str] = Field("gemini", description="LLM provider name: gemini, openai, or ollama")
    document_ids: Optional[List[str]] = Field(None, description="Optional document ID filters")
```

### 2. Router Blueprint & Signatures

#### `backend/app/routers/document_router.py`
```python
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from app.auth import get_current_user
from app.schemas import UserPayload, DocumentUploadResponse
from app.services.ingestion_service import PDFIngestionService

router = APIRouter()

@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_pdf_document(
    file: UploadFile = File(...),
    user: UserPayload = Depends(get_current_user)
):
    ...
```

#### `backend/app/routers/chat_router.py`
```python
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from app.auth import get_current_user
from app.schemas import UserPayload, ChatQueryRequest
from app.services.rag_service import RAGService

router = APIRouter()

@router.post("/stream")
async def stream_chat_response(
    request: ChatQueryRequest,
    user: UserPayload = Depends(get_current_user)
):
    rag_service = RAGService(provider=request.provider or "gemini")
    return StreamingResponse(
        rag_service.generate_rag_stream(
            query=request.query,
            user_id=user.user_id,
            document_ids=request.document_ids
        ),
        media_type="text/event-stream"
    )
```

---

## Testing Decisions

- **Tested Seam**: `main.py` health check and FastAPI router endpoints via `TestClient`.
- **Good Test Criteria**:
  - Test 1: `GET /health` returns `{"status": "online"}` with HTTP 200.
  - Test 2: Unauthenticated requests to protected endpoints return HTTP 401 Unauthorized.
  - Test 3: Uploading non-PDF file returns HTTP 400 Bad Request.
- **Test Command**: `backend/venv/Scripts/python -m pytest tests/test_routers.py -v`

---

## Out of Scope

- Frontend React/Next.js UI components (handled in TICKET-06 & TICKET-07).
- Docker deployment files (handled in TICKET-08).

---

## Further Notes

Menggunakan `StreamingResponse(media_type="text/event-stream")` bawaan FastAPI menyederhanakan alur SSE tanpa memerlukan dependensi eksternal tambahan.
