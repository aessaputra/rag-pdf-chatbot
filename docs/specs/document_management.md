# Feature Specification: Document Management & RAG Scoping

## Problem Statement

When users upload PDF documents to the system, all uploaded files are indiscriminately searched during every RAG query. Users experience the following problems:
1. Context Dilution: Users cannot temporarily disable outdated or conflicting documents (for example, "2024 Policy" vs "2026 Policy"), which leads to contradictory LLM answers and hallucinations.
2. Lack of Visibility: Users have no interface to view or inspect the list of documents currently stored in their knowledge base.
3. Lack of Original File Access: Original PDF files are not persisted in storage, so users cannot read or download reference documents within the app.
4. Permanent Waste: Users cannot remove unwanted documents, wasting vector storage quota and cluttering search results.

---

## Solution

An integrated Document Management and RAG Scoping system:
- **Cloud Storage Integration:** Physical PDF files are stored securely in a private cloud storage bucket under isolated user folders.
- **RAG Scoping:** Users can toggle document availability between "Aktif" (Included in Chat) and "Off" (Excluded from Chat) without deleting vectors or re-embedding content.
- **High-Performance Pre-Filtering:** Vector search queries use PostgreSQL partial indexes and pre-filtering JOINs to exclude disabled or non-ready documents instantly.
- **Hard Delete & Storage Cleanup:** Deleting a document permanently removes the cloud storage file and cascades database deletions across metadata and vector chunks.
- **Ultra-Minimalist Management Modal:** An uncluttered, document-style modal dialog offering drag-and-drop uploads, ultra-concise micro-badges, status indicators (`processing`, `ready`, `failed`), signed URL PDF previews, and chat window alerts.

---

## User Stories

1. As a user, I want to open a Document Management modal from the navigation sidebar, so that I can view all PDF files stored in my personal knowledge base.
2. As a user, I want to drag and drop new PDF files into an upload zone, so that I can easily expand my AI's knowledge base.
3. As a user, I want to toggle a document's status to "Aktif", so that the AI assistant searches its contents during RAG chat queries.
4. As a user, I want to toggle a document's status to "Off", so that outdated or irrelevant content is excluded from search results without losing the file.
5. As a user, I want my PDF files stored in private cloud storage, so that only my authenticated account can access the raw documents.
6. As a user, I want to click a preview button to open a temporary signed URL of a PDF, so that I can read the original document in my browser.
7. As a user, I want to permanently delete a document after a confirmation prompt, so that its vectors, metadata, and physical storage files are completely removed.
8. As a user, I want to see a concise warning banner in the Chat Window when no active documents are selected, so that I know why RAG context retrieval is paused.
9. As a user, I want to see real-time status indicators (`processing`, `ready`, `failed`), so that I know when an uploaded PDF has finished indexing.
10. As a user, I want document file sizes and page counts displayed on each item card, so that I can distinguish between different document versions.
11. As a user, I want failed uploads to automatically clean up storage files, so that corrupt or unparseable files do not linger in my storage space.
12. As a user, I want an ultra-minimalist UI free of verbose text and marketing jargon, so that I can manage my documents with maximum speed and clarity.

---

## Implementation Decisions

- **Storage Architecture:** Private storage bucket named `documents`. Objects are keyed by `{user_id}/{document_id}.pdf`. Access is governed by storage security policies enforcing `((select auth.uid())::text = (storage.foldername(name))[1])`.
- **Database Schema Modifications:**
  - `documents` table extended with `file_path TEXT`, `is_active BOOLEAN NOT NULL DEFAULT true`, and `status TEXT NOT NULL DEFAULT 'ready'`.
  - Partial index `idx_documents_user_active_ready` on `documents (user_id) WHERE is_active = true AND status = 'ready'`.
- **RPC Search Function:** Hardened `match_document_chunks` function modified to perform a `JOIN` with `documents` filtering for `is_active = true` and `status = 'ready'`.
- **Backend API Endpoints (FastAPI):**
  - Document Upload Endpoint (`POST`): Accepts multi-part PDF file, uploads to cloud storage, inserts initial document record (`status = 'processing'`), extracts and embeds chunks, and updates status (`status = 'ready'`).
  - Document List Endpoint (`GET`): Returns all user documents with `is_active`, `status`, and `file_path` attributes.
  - Document Toggle Endpoint (`PATCH`): Accepts boolean payload to update `is_active` status.
  - Document Preview Endpoint (`GET`): Generates a 1-hour temporary signed URL for file viewing.
  - Document Delete Endpoint (`DELETE`): Deletes the file object from cloud storage and hard-deletes the database record (cascading vector chunks).
- **Frontend UI Architecture (Next.js 15):**
  - Ultra-minimalist Document Management Modal with warm monochrome palette, 1px crisp borders, micro-typography badges (`AKTIF` vs `OFF`), and concise micro-copy.
  - Navigation Sidebar button labeled `Dokumen`.
  - Chat Window alert banner displayed when no active documents exist in user's knowledge base.

---

## Testing Decisions

- **Definition of a Good Test:** Tests verify strictly external API behavior, status transitions, schema DTO validations, and storage error rollbacks — never internal private method implementations.
- **Tested Modules:**
  - Document Management Router endpoints (`GET`, `POST`, `PATCH`, `DELETE`).
  - Storage Service integration (upload, signed URL generation, deletion).
  - Pydantic DTO schema serialization (`DocumentItemResponse`, `DocumentToggleRequest`, `DocumentPreviewResponse`).
- **Prior Art:** Tests build on existing backend `pytest` conventions in the codebase using FastAPI `TestClient` and `unittest.mock`.

---

## Out of Scope

- OCR parsing for scanned image-only PDF files (only text-extractable PDFs are supported).
- Automatic diffing or version merging between multiple PDF uploads.
- Multi-tenant shared team document access control (restricted to individual user account RLS).

---

## Further Notes

- Strict adherence to Supabase Row-Level Security performance guidelines (`(select auth.uid()) = user_id`) and Postgres best practices.
- Async threadpool delegation (`run_in_threadpool`) used for all blocking storage and database calls to prevent event loop stalls.
