# 02 — Embedding Configs table & vector unconstrain

**What to build:** The database supports flexible vector embedding dimensions per user and tracks user embedding choices. A new `user_embedding_configs` table exists. The `document_chunks.embedding` column is updated to unconstrained `VECTOR` (no fixed dimension). The fixed HNSW index is dropped in favor of index-based queries filtered by `user_id`. The `match_document_chunks` RPC function is updated to support dynamic vector sizes without dimension mismatch errors.

**Blocked by:** 01 — Encryption foundation + Provider Configs table

**Status:** ready-for-agent

- [x] Migration creates `user_embedding_configs` table: `user_id` (UUID PK → auth.users), `provider` (TEXT), `api_key_enc` (TEXT), `base_url` (TEXT, nullable), `model_name` (TEXT), `embedding_dimensions` (INT), `locked` (BOOLEAN, default false), `created_at`, `updated_at`
- [x] RLS policies enabled on `user_embedding_configs` with `(SELECT auth.uid()) = user_id`
- [x] Migration alters `document_chunks.embedding` type from `VECTOR(768)` to `VECTOR`
- [x] Drop HNSW index `idx_document_chunks_embedding_hnsw`
- [x] Update `match_document_chunks` RPC to accept generic `VECTOR` parameter
- [x] Test verifying custom dimensions (e.g. 1536d, 768d) insert and similarity search correctly

