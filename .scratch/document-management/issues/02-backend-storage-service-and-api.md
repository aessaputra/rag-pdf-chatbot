# 02 — Backend Storage Service & Document REST API Endpoints

**What to build:** The backend service layer and REST API endpoints for document management. Enables users to upload physical PDFs to cloud storage, toggle RAG active status (`AKTIF` vs `OFF`), generate temporary signed URLs for PDF previews, and hard-delete documents with complete storage cleanup.

**Blocked by:** 01 — Database Migration & Supabase Storage Infrastructure

**Status:** done

- [x] Create `StorageService` to encapsulate Supabase Storage uploads, file deletions, and signed URL generation.
- [x] Update `PDFIngestionService` to save raw PDF bytes to storage, populate `file_path`, `status`, and `is_active` fields, and clean up files on failure.
- [x] Implement `PATCH /api/documents/{document_id}/toggle` to update `is_active` status.
- [x] Implement `GET /api/documents/{document_id}/preview` to return a 1-hour temporary signed URL.
- [x] Implement `DELETE /api/documents/{document_id}` to delete storage objects and hard-delete database records.
- [x] Add unit tests in `tests/test_document_management.py` and ensure all 43 backend tests pass cleanly.
