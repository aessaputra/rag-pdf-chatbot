# Ticket-09 Specification: Index-RAG Implementation

## Problem Statement

The current RAG implementation uses arbitrary character chunking (`RecursiveCharacterTextSplitter`), which breaks semantic boundaries (paragraphs) and fails to maintain exact line location metadata. When answering user queries, the LLM sometimes hallucinates page numbers or line numbers because the underlying chunking does not preserve this precision. Furthermore, exact citations are essential to ensure the reliability of the RAG system.

## Solution

Implement the **Index-RAG (i-RAG)** approach. Instead of arbitrary character chunking, the document will be parsed naturally into paragraphs based on double newlines (`\n\n`). For each paragraph, the ingestion service will generate multiple synthetic questions (HyDE) to increase retrieval accuracy. These questions will be embedded and stored in the database alongside the original paragraph, sharing the exact same location metadata (`page_number`, `line_start`, `line_end`). The retrieval process will return the original paragraph content even if a synthetic question was the closest match, enabling precise citation and improved accuracy. To avoid API timeouts during the costly LLM generation process, the ingestion logic will be moved to a background task using FastAPI `BackgroundTasks`.

## User Stories

1. As a user, I want the system to parse my uploaded PDF documents by natural paragraphs, so that the context of the information is preserved.
2. As a user, I want the chatbot to provide exact page and line number citations in its responses, so that I can easily verify facts from the original document.
3. As a developer, I want the ingestion process to use `BackgroundTasks` to process documents asynchronously, so that the `/api/documents/upload` endpoint responds quickly without timeout errors.
4. As a user, I want the system to generate multiple synthetic questions per paragraph during ingestion, so that the semantic retrieval is more robust against phrasing variations.
5. As a developer, I want to store the original paragraph text in the `metadata` JSONB of synthetic question chunks, so that the retriever can feed the actual context to the LLM.

## Implementation Decisions

- **Ingestion Modifications:**
  - Replace `RecursiveCharacterTextSplitter` with custom paragraph-based extraction logic using `\n\n` as the delimiter in `PDFIngestionService`.
  - Capture `line_start` and `line_end` for each paragraph.
  - Integrate an LLM call inside the ingestion pipeline to generate exactly 5 synthetic questions per paragraph.
  - The upload endpoint `POST /api/documents/upload` will receive `BackgroundTasks` via dependency injection. It will synchronously create the document record (`status = 'processing'`) and upload the file to Supabase Storage, then dispatch the parsing and chunking work to the background task.
- **Frontend Modifications (Crucial for UX):**
  - **`frontend/src/types/index.ts`**: Tambahkan opsional `line_start` dan `line_end` pada interface `Citation`.
  - **`frontend/src/components/chat/CitationPanel.tsx` & `FormattedMessage.tsx`**: Update UI dan *aria-label* agar menampilkan informasi baris (contoh: "HAL 12 BARIS 45-50") jika datanya tersedia.
  - **`frontend/src/context/DocumentContext.tsx`**: Tambahkan *polling mechanism* (`setInterval`) yang akan memanggil ulang `fetchDocuments()` secara berkala (misal tiap 5 detik) HANYA JIKA ada dokumen yang memiliki `status === 'processing'`.
- **Database / Metadata Schema (No Migration Needed):**
  - Store chunks with an augmented `metadata` JSON object containing `filename`, `page_number`, `line_start`, `line_end`, `type` ("paragraph" or "question"), and `paragraph_content` (for question chunks).
- **Retrieval Modifications:**
  - In `ContextRetriever.retrieve_relevant_chunks`, check if the matched chunk has `metadata["type"] == "question"`. If so, dynamically replace its `content` with `metadata["paragraph_content"]` before passing it to the prompt builder.
  - Update `Citation` and `DocumentChunkDTO` models to support optional `line_start` and `line_end`.
- **Prompt Modifications:**
  - Update `PromptBuilder.format_context_prompt` to include line numbers in the context strings sent to the LLM (e.g. `[doc1: filename.pdf, Page 12, Lines 45-50]`).

## Testing Decisions

- **What makes a good test:** Tests should verify the output metadata of the parsing function and ensure the background task behaves properly without crashing the server.
- **Modules to test:**
  - `backend/app/services/ingestion_service.py` (specifically paragraph chunking and question generation).
  - `backend/app/routers/document_router.py` (upload endpoint should return 201 immediately while dispatching a background task).
  - `backend/app/services/context_retriever.py` (verify the metadata swap logic).
  - `frontend/src/components/...` (verify frontend polls correctly when document is processing).
- **Prior art for the tests:** Existing unit tests in `backend/tests/test_ingestion.py` and `backend/tests/test_routers.py`.

## Out of Scope

- Migrating existing chunks in the database to the new Index-RAG format (users will need to re-upload documents if they want the improved citations).
- Adding advanced PDF parsing libraries (like `unstructured` or `marker`); we will stick to `\n\n` for simplicity as agreed in the design session.
- Adding a UI toggle for the number of generated questions; we will hardcode to 5 questions as per the original paper.

## Further Notes

- **API Limits:** This feature relies heavily on the LLM API configured by the user (BYOK). Since 5 questions are generated per paragraph, users with large documents might encounter rate limits from their chosen LLM provider. This should be handled gracefully (e.g., catching rate limit exceptions, logging them, and setting document status to `failed` so the user is aware).
- **Background Task Durability:** FastAPI `BackgroundTasks` are stored in memory. If the backend server restarts while a document is still `processing`, that task will be lost, and the document will remain stuck in `processing`. For a production system, a task queue like Celery would be ideal, but for this iteration, `BackgroundTasks` is an acceptable tradeoff for simplicity.
