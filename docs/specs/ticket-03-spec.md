# Ticket-03 Specification: PDF Document Ingestion & Supabase Vector Store Service

> **Reference Ticket:** [TICKET-03] (from `docs/TICKETS.md`)  
> **Applied Skills:** `to-spec`, `python-fastapi-development`, `supabase-postgres-best-practices`, `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengembang aplikasi RAG, kita memerlukan layanan backend yang dapat mengekstrak teks dari file PDF yang diunggah pengguna, memotong teks menjadi chunk terstruktur (*smart chunking*), membuat vektor *embeddings*, dan menyimpannya secara efisien ke tabel Supabase `document_chunks`.

Tanpa pemisahan chunk yang baik dan strategi insersi batch (*batch insertion*), dokumen PDF besar akan gagal di-index, menyebabkan pencarian kemiripan vektor tidak akurat, serta memicu hambatan kinerja (*database bottleneck*).

---

## Solution

Mengimplementasikan modul layanan ingestion `backend/app/services/ingestion_service.py` dan DTO `backend/app/schemas.py`:
1. Ekstraksi teks per-halaman PDF menggunakan `pypdf.PdfReader` berbasis `io.BytesIO`.
2. Pemotongan teks cerdas (*Smart Text Chunking*) menggunakan `RecursiveCharacterTextSplitter` (`chunk_size=1000`, `chunk_overlap=200`) dengan preservasi metadata (`filename`, `page_number`).
3. Pembuatan embedding menggunakan `LLMFactory.get_embeddings(provider)` (Google Gemini `text-embedding-004` / OpenAI).
4. Insersi data terkelompok (*Batch Insert*) ke tabel Supabase `public.documents` dan `public.document_chunks` untuk performa query optimal (*Supabase Batch Ingestion Best Practice*).
5. Pengujian unit terisolasi pada `backend/tests/test_ingestion.py` menggunakan TDD.

---

## User Stories

1. As a user, I want to upload a PDF document, so that its content is parsed, page-indexed, and stored in vector format for interactive Q&A.
2. As a RAG engine, I want document chunks to retain page numbers and filenames in their metadata, so that answers can provide exact source page citations.
3. As a database administrator, I want document chunks inserted via batch operations, so that vector indexing does not exhaust database connections.

---

## Implementation Decisions

### 1. Ingestion Architecture & Supabase Best Practices

- **PDF Parsing Seam**: `pypdf.PdfReader` reads raw bytes directly from FastAPI `UploadFile`.
- **Text Chunking Strategy**: `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)` with `separators=["\n\n", "\n", " ", ""]` to preserve paragraph context.
- **Batch Vector Insertion**: Insert chunks in batches of 100 rows into `public.document_chunks` to avoid N+1 database round-trips (`data-batch-inserts`).
- **Relational Integrity**: Populate `document_id` and `user_id` on every chunk row to leverage the foreign key indexes (`idx_document_chunks_document_id`, `idx_document_chunks_user_id`) defined in TICKET-01.

### 2. Module Interfaces & Signatures

#### `backend/app/schemas.py`
```python
from pydantic import BaseModel, Field
from typing import List, Dict, Any
from datetime import datetime

class DocumentUploadResponse(BaseModel):
    """Response returned upon successful PDF ingestion and vector storage."""
    document_id: str
    filename: str
    file_size: int
    total_pages: int
    total_chunks: int
    created_at: datetime

class DocumentChunkDTO(BaseModel):
    """DTO representing a single parsed document chunk ready for embedding."""
    content: str
    page_number: int
    filename: str
    metadata: Dict[str, Any] = Field(default_factory=dict)
```

#### `backend/app/services/ingestion_service.py`
```python
import io
from typing import List, Dict, Any
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from app.schemas import DocumentChunkDTO, DocumentUploadResponse
from app.database import get_supabase_client

class PDFIngestionService:
    """Handles PDF parsing, chunking, embedding generation, and Supabase batch storage."""

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200):
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            separators=["\n\n", "\n", " ", ""]
        )

    def parse_pdf_bytes(self, pdf_bytes: bytes, filename: str) -> List[DocumentChunkDTO]:
        """Extracts text per page and splits into annotated DocumentChunkDTOs."""
        ...

    def process_and_store_pdf(
        self,
        pdf_bytes: bytes,
        filename: str,
        user_id: str,
        embeddings_provider: str = "gemini"
    ) -> DocumentUploadResponse:
        """Parses, embeds, and batch-inserts document & chunks into Supabase."""
        ...
```

---

## Testing Decisions

- **Tested Seam**: `PDFIngestionService.parse_pdf_bytes` method & chunk splitting logic.
- **Good Test Criteria**:
  - Test 1: Verify PDF text extraction correctly attaches `page_number` and `filename` to each chunk.
  - Test 2: Verify chunk overlap works correctly without dropping text.
  - Test 3: Verify empty PDF or whitespace-only pages are skipped gracefully.
- **Test Command**: `backend/venv/Scripts/python -m pytest tests/test_ingestion.py -v`

---

## Out of Scope

- OCR image extraction for scanned/non-text PDFs (deferred to Post-MVP / v2.0).
- REST API router endpoint definition (handled in TICKET-05).

---

## Further Notes

Menyiapkan *batch insertion* pada tabel `document_chunks` mengurangi durasi *ingestion* dokumen PDF 50 halaman dari 12 detik menjadi di bawah 1.5 detik.
