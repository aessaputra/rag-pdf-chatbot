# Ticket-04 Specification: Multi-Provider LLM Factory & RAG Streaming Engine

> **Reference Ticket:** [TICKET-04] (from `docs/TICKETS.md`)  
> **Applied Skills:** `to-spec`, `python-fastapi-development`, `supabase-postgres-best-practices`, `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengguna, kita membutuhkan mesin RAG (Retrieval-Augmented Generation) yang dapat mencari potongan informasi terpenting dari dokumen PDF yang telah di-upload, menjawab pertanyaan dengan cepat melalui *Server-Sent Events (SSE) token streaming*, dan menyertakan sitasi referensi nomor halaman secara realtime.

Tanpa streaming SSE dan penunjuk sitasi yang terstruktur, pengguna akan mengalami efek *freeze* saat menunggu jawaban LLM penuh dan tidak bisa memverifikasi klaim jawaban dari dokumen sumber.

---

## Solution

Mengimplementasikan layanan RAG `backend/app/services/rag_service.py` dan pengujian `backend/tests/test_rag.py`:
1. **Vector Retrieval Engine**: Melakukan pencarian kemiripan vektor (*similarity search*) di Supabase `document_chunks` disaring berdasarkan `user_id` untuk mengambil top-K chunk relevan.
2. **Citation Metadata Generator**: Mengonstruksi metadata sitasi (`filename`, `page_number`, `content_snippet`) dari chunk relevan.
3. **SSE Streaming Generator**:
   - Mengirimkan event pertama `event: citations` dalam format JSON yang berisi array sitasi sumber.
   - Mengalirkan token jawaban LLM secara realtime via `event: token` menggunakan `astream()`.
4. **Multi-Provider Switching**: Menggunakan `LLMFactory` untuk berpindah provider (Gemini, OpenAI, Ollama) sesuai preferensi request/konfigurasi.
5. Pengujian unit berbasis TDD di `backend/tests/test_rag.py`.

---

## User Stories

1. As a user asking questions about my PDF, I want answers to stream token-by-token in real time, so that I see immediate responses without long loading pauses.
2. As a researcher, I want every AI response to include source citations with PDF filenames and page numbers, so that I can click and verify facts instantly.
3. As a developer, I want to switch between Google Gemini, OpenAI, and Ollama without changing RAG service code, so that LLM providers are modular and interchangeable.

---

## Implementation Decisions

### 1. RAG Retrieval & SSE Streaming Architecture

- **Similarity Search Query**: Generate query embedding using `LLMFactory.get_embeddings(provider)` and query Supabase `document_chunks` table using RPC / Cosine similarity, filtered by `user_id`.
- **Top-K Chunk Limit**: Retrieve top 4 most relevant chunks to balance accuracy and LLM prompt context window.
- **SSE Stream Protocol Standard**:
  - Line 1: `event: citations\ndata: [{"filename": "doc.pdf", "page_number": 3, "content": "..."}]\n\n`
  - Line 2+: `event: token\ndata: {"token": "Hallo"}\n\n`
  - Line Final: `event: done\ndata: {"status": "completed"}\n\n`

### 2. Module Signatures & Interface Blueprint

#### `backend/app/services/rag_service.py`
```python
from typing import AsyncGenerator, List, Dict, Any, Optional
import json
from app.services.llm_factory import LLMFactory
from app.database import get_supabase_client
from app.schemas import Citation

class RAGService:
    """RAG Engine responsible for context retrieval, prompt formatting, and SSE token streaming."""

    def __init__(self, provider: str = "gemini"):
        self.provider = provider
        self.llm = LLMFactory.get_llm(provider)
        self.embeddings_model = LLMFactory.get_embeddings(provider)

    def retrieve_relevant_chunks(
        self,
        query: str,
        user_id: str,
        top_k: int = 4,
        document_ids: Optional[List[str]] = None
    ) -> List[Dict[str, Any]]:
        """Queries Supabase document_chunks for vector similarity matching user_id."""
        ...

    async def generate_rag_stream(
        self,
        query: str,
        user_id: str,
        document_ids: Optional[List[str]] = None
    ) -> AsyncGenerator[str, None]:
        """
        Yields SSE-formatted strings containing citations first, followed by streaming tokens.
        """
        ...
```

---

## Testing Decisions

- **Tested Seam**: `RAGService` prompt formatter & SSE event generation logic.
- **Good Test Criteria**:
  - Test 1: Verify context string formatting correctly includes page numbers and content snippets.
  - Test 2: Verify `generate_rag_stream` emits valid `event: citations` SSE payload as first event.
  - Test 3: Verify token chunks are wrapped in `event: token` SSE lines correctly.
- **Test Command**: `backend/venv/Scripts/python -m pytest tests/test_rag.py -v`

---

## Out of Scope

- HTTP FastAPI endpoint routing (handled in TICKET-05).
- WebSockets fallback (SSE protocol is the primary streaming mechanism).

---

## Further Notes

Menghasilkan event `citations` sebagai SSE frame pertama sebelum LLM token memungkinkan frontend Next.js menampilkan panel referensi dokumen secara instan saat AI mulai mengetik.
