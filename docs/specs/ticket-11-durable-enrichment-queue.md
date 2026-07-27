# Ticket-11 Specification: Durable Enrichment Queue + UI Presets

> **Applied Skills:** `to-spec`, `grilling`, `supabase`  
> **Status:** Specification Ready for Implementation  
> **Depends on:** ticket-10 (Stable IndexRAG Enrichment)

---

## Problem Statement

Ticket-10 provides stable document upload with best-effort IndexRAG enrichment, but:

1. Enrichment status is ephemeral; server restarts can halt in-progress enrichment jobs.
2. Users cannot see enrichment progress or know why retrieval quality may improve later.
3. The 75-paragraph cap is hard-coded; users cannot trade off cost vs retrieval quality.
4. Paragraph selection is first-75; not optimized for retrieval value.

Users want predictable enrichment behavior, visible progress, and control over the cost/accuracy tradeoff.

---

## Solution

Add durable enrichment infrastructure with user-configurable presets:

### 1. Durable Queue Table

Create `document_enrichment_jobs` table:

```sql
CREATE TABLE document_enrichment_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    total_paragraphs INT NOT NULL DEFAULT 0,
    processed_paragraphs INT NOT NULL DEFAULT 0,
    question_chunks_created INT NOT NULL DEFAULT 0,
    failed_paragraphs INT NOT NULL DEFAULT 0,
    attempt_count INT NOT NULL DEFAULT 0,
    max_attempts INT NOT NULL DEFAULT 3,
    last_error TEXT,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id)
);

-- RLS
ALTER TABLE document_enrichment_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own enrichment jobs" ON document_enrichment_jobs
    FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id);
```

### 2. Enrichment Job Worker

- On document `ready`, create `pending` job record.
- Background task picks up `pending` jobs, transitions to `running`.
- Process paragraphs with progress updates.
- On completion: `completed` with counts.
- On failure: `failed` with `last_error`, increment `attempt_count`.
- Retry logic: pick up `failed` jobs where `attempt_count < max_attempts`.

### 3. Quality-Based Paragraph Selection

Replace first-75 with quality scoring:
- Prioritize paragraphs by content length (skip very short/noisy).
- Optionally: skip boilerplate-detected paragraphs.
- Select top N by quality score up to configured cap.

### 4. User Enrichment Presets

Add `user_enrichment_configs` table or embed in `user_embedding_configs`:

| Preset | Cap | Description |
|--------|-----|-------------|
| Off | 0 | No enrichment |
| Standard | 75 | Default, balanced cost/quality |
| High | 150 | More coverage, higher cost |
| Full | Unlimited | All paragraphs, highest cost |

UI should show cost warning for High/Full presets.

### 5. API Exposure

Extend `GET /api/documents/{id}` response:

```json
{
  "id": "...",
  "filename": "...",
  "status": "ready",
  "enrichment": {
    "status": "completed",
    "total_paragraphs": 120,
    "processed_paragraphs": 75,
    "question_chunks_created": 375,
    "failed_paragraphs": 0
  }
}
```

### 6. Frontend Integration

- Document list: show enrichment status badge (pending/running/completed/failed).
- Document detail: show enrichment progress bar if running.
- Settings: enrichment preset dropdown with cost warning.

---

## User Stories

1. As a user, I want enrichment to resume after server restart, so I don't lose progress.
2. As a user, I want to see enrichment progress, so I know when retrieval quality will improve.
3. As a user, I want to choose my enrichment level, so I can balance cost vs accuracy.
4. As a user, I want cost warnings for high enrichment levels, so I don't accidentally exhaust my API quota.
5. As a developer, I want durable job records, so I can debug failed enrichment.
6. As a developer, I want retry logic, so transient failures don't permanently block enrichment.
7. As a maintainer, I want quality-based selection, so cap budget goes to valuable paragraphs.

---

## Implementation Decisions

- Queue table in Supabase (not Redis/Celery) to minimize infra.
- Worker remains FastAPI background task for now; can migrate to dedicated worker later.
- Preset stored per-user; default Standard (75).
- Quality scoring: simple length heuristic initially; can enhance later.
- Retry attempts: max 3 by default, configurable via env.
- API contract: optional `enrichment` field in document response.
- Frontend: minimal status badge first; progress bar and settings UI in follow-up.

---

## Out of Scope

- Dedicated worker process / Celery / Redis.
- Per-paragraph status visibility.
- Cost estimation API (beyond static warning text).
- Admin-level enrichment controls.
- Backfill for existing documents (manual trigger only).

---

## Migration Plan

1. Add `document_enrichment_jobs` migration.
2. Add `user_enrichment_configs` or extend `user_embedding_configs`.
3. Update `process_document` to create job record.
4. Update `enrich_document_questions` to update job progress.
5. Add retry pickup logic.
6. Add quality-based selection.
7. Extend document API response.
8. Add frontend status badge.
9. Add settings preset UI.

---

## Testing Requirements

- Job record creation on document ready.
- Progress updates during enrichment.
- Failure recording and retry pickup.
- Cap enforcement per preset.
- Quality-based selection prioritizes longer paragraphs.
- API returns enrichment status.
- Frontend displays status correctly.
