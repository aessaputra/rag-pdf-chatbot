# 01 — Database Migration & Supabase Storage Infrastructure

**What to build:** The core database schema enhancements and cloud storage infrastructure for PDF documents. Allows physical PDF storage isolated in private cloud user buckets, creates a high-performance partial index for active ready documents, and updates vector similarity search to pre-filter active documents at the database layer.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] Add `file_path`, `is_active`, and `status` columns to `public.documents` table.
- [x] Create Partial Index `idx_documents_user_active_ready` on `public.documents (user_id) WHERE is_active = true AND status = 'ready'`.
- [x] Create private Supabase Storage Bucket `documents` with strict authenticated user RLS policies for `{user_id}/*` path isolation.
- [x] Update `match_document_chunks` RPC function with `JOIN public.documents` pre-filtering for `is_active = true` and `status = 'ready'`.

## Additional: Missing UPDATE RLS Policy

Added `UPDATE` RLS policy on `public.documents` that was missing from the init migration — required for the `PATCH /toggle` endpoint in Ticket 02.
