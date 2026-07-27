# Ticket-10 Specification: Stable IndexRAG Enrichment

> **Applied Skills:** `to-spec`, `grilling`, `langchain-architecture`, `systematic-debugging`, `codebase-memory`  
> **Status:** Specification Complete (Pending User Approval for Implementation)

---

## Problem Statement

PaperMind currently needs to follow the IndexRAG pattern from `references/Index-RAG`, where each paragraph is expanded with synthetic questions before embedding. This improves semantic retrieval because user questions can match generated question chunks even when the source paragraph uses different wording.

However, running synthetic question generation as a required part of document ingestion is unstable for production BYOK usage. A single PDF can produce hundreds of paragraphs, which can trigger hundreds of chat model requests during upload processing. This causes provider rate limits, request failures, unexpected user API costs, and failed document processing.

The user wants PaperMind to keep the retrieval benefits of IndexRAG while making document upload stable and resilient.

---

## Solution

Split ingestion into two stages:

1. **Required Core Ingestion**
   - Parse the uploaded PDF.
   - Split text into paragraph chunks with page and line metadata.
   - Embed the original paragraph chunks.
   - Store paragraph chunks.
   - Mark the document as `ready`.

2. **Best-Effort IndexRAG Enrichment**
   - After the document is `ready`, run synthetic question generation as a separate background enrichment step.
   - Enrich at most 75 eligible paragraph chunks per document.
   - Generate synthetic questions for each selected paragraph.
   - Embed generated questions.
   - Store generated questions as separate question chunks linked to their source paragraph chunk.
   - If enrichment fails for one paragraph, skip that paragraph and continue.
   - If enrichment fails entirely, keep the document `ready` and only log the failure.

This preserves stable upload behavior while still adding IndexRAG-style retrieval enhancement when provider limits allow it.

---

## User Stories

1. As a user, I want PDF upload to complete reliably, so that I can use my document even when my chat provider is rate-limited.
2. As a user, I want PaperMind to avoid triggering hundreds of immediate chat model requests, so that my BYOK quota is not exhausted unexpectedly.
3. As a user, I want my document to become `ready` after paragraph embedding succeeds, so that optional enrichment cannot block basic RAG usage.
4. As a user, I want retrieval quality to improve when synthetic questions are generated successfully, so that my questions can match document meaning even with different wording.
5. As a user, I want partial enrichment failures to be tolerated, so that one failed paragraph does not ruin the whole document.
6. As a user, I want long PDFs to have bounded enrichment work, so that costs and request volume stay predictable.
7. As a developer, I want core ingestion separated from optional enrichment, so that document readiness is not coupled to chat model availability.
8. As a developer, I want enrichment to reuse the existing Provider Config and Embedding Config system, so that BYOK behavior remains consistent.
9. As a developer, I want generated questions stored as separate chunks, so that retrieval can match them directly.
10. As a developer, I want question chunks linked to their source paragraph chunks, so that citations still resolve to the original document context.
11. As a developer, I want failed question generation to be logged, so that failures are diagnosable without adding schema complexity.
12. As a developer, I want no new queue dependency yet, so that the implementation remains small and fits the current FastAPI background task architecture.
13. As a developer, I want no frontend contract changes, so that this stability improvement can ship without UI work.
14. As a maintainer, I want tests proving enrichment is best-effort, so that future changes do not accidentally make upload depend on synthetic question generation again.
15. As a maintainer, I want tests proving the 75-paragraph cap, so that large PDFs cannot reintroduce unbounded model fan-out.

---

## Implementation Decisions

- Core ingestion is the only required path for document readiness.
- Core ingestion must not call the chat model.
- Core ingestion may call only the embedding model required to store paragraph chunks.
- Synthetic question generation is an optional enrichment step.
- Enrichment runs only after paragraph chunks are stored and the document is marked `ready`.
- Enrichment uses a hard cap of 75 paragraph chunks per document.
- Enrichment should select eligible paragraph chunks only, not previously generated question chunks.
- Each selected paragraph may generate up to the existing configured number of synthetic questions.
- Generated questions are stored as separate chunks.
- Each question chunk is linked to its source paragraph chunk through the existing parent-child relationship.
- Question chunk metadata identifies the chunk type as `question` and stores the generated question text.
- Question chunks should preserve filename, page number, and line range metadata from the source paragraph.
- Retrieval should continue to return original paragraph context for citations when a question chunk is matched.
- A failed question generation call for one paragraph should not fail the document or stop the whole enrichment job.
- Failed paragraphs are skipped and logged.
- A total enrichment failure is logged only.
- No persistent enrichment status is added in this iteration.
- No new database migration is required.
- No new queue, worker, Redis, Celery, LangGraph, or durable execution system is added in this iteration.
- No frontend changes are required.
- The implementation should use the existing LangChain chat and embedding abstractions already present in the backend.
- The implementation should prefer the existing FastAPI `BackgroundTasks` model for now.
- The implementation should avoid adding new dependencies.

---

## Testing Decisions

- The main test seam is the ingestion service, because it owns PDF parsing, chunk storage, document status updates, and enrichment behavior.
- Existing ingestion tests are the prior art.
- Tests should verify externally observable behavior, not private implementation details.
- Core ingestion tests should prove that paragraph chunks are stored and the document becomes `ready` without requiring synthetic question generation.
- Enrichment success tests should prove generated question chunks are stored separately and linked to their source paragraph chunks.
- Enrichment failure tests should prove failed question generation for one paragraph is skipped while other paragraphs continue.
- Enrichment resilience tests should prove document status remains `ready` when enrichment fails.
- Cap tests should prove enrichment processes no more than 75 paragraph chunks.
- Existing question parsing tests can remain as coverage for synthetic question response parsing.
- Verification should include backend tests where available and Python compile checks.

---

## Out of Scope

- Durable job queue.
- Celery, Redis, Supabase Queue, or external worker infrastructure.
- LangGraph orchestration.
- New database columns for enrichment status.
- New enrichment progress UI.
- Cost estimation UI.
- Provider-specific throttling settings in the UI.
- Automatic retry scheduling after process restart.
- Migration or backfill for existing documents.
- Changing chat API contracts.
- Changing frontend document list behavior.
- Changing Provider Config or Embedding Config schemas.

---

## Further Notes

This spec intentionally narrows IndexRAG to a production-safe shape. The original reference pattern generates questions inline during ingestion. PaperMind should instead treat synthetic questions as retrieval enrichment, not as a requirement for upload success.

Future work can add persistent enrichment status and a durable queue if users need visible progress, resumability after backend restarts, or controlled retry scheduling.
