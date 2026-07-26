## Problem Statement

Paid API users experience very slow document ingestion times (e.g., 2+ minutes for a 6-page document). This is because the system currently processes document paragraphs sequentially (one by one) in a standard `for` loop to generate HyDE synthetic questions. While the existing rate-limiting logic prevents crashes, the lack of concurrency creates a severe bottleneck for users whose API tiers support high throughput.

## Solution

Implement a multi-threading approach using Python's `concurrent.futures.ThreadPoolExecutor` during the synthetic question generation phase. This allows the system to send multiple paragraphs to the LLM concurrently, massively reducing the overall ingestion time by fully utilizing the concurrency limits of paid API keys.

## User Stories

1. As a paid user, I want my document processing to finish within seconds instead of minutes, so that I can immediately start chatting with my document.
2. As a system administrator, I want to configure the maximum concurrency level, so that I can tune the throughput without hitting connection limits or overloading the database.
3. As a developer, I want the parallel processing to be isolated within the ingestion service, so that it doesn't leak threads or affect the main FastAPI event loop.

## Implementation Decisions

- The `PDFIngestionService._attach_synthetic_questions` method will be updated to use `ThreadPoolExecutor`.
- `executor.map` or `concurrent.futures.as_completed` will be used to execute `self.generate_questions` across all chunks concurrently.
- A fixed concurrency limit will be introduced as a constant `MAX_CONCURRENT_LLM_REQUESTS = 10` in `ingestion_service.py`. This provides a safe default for 10x speedup without instantly hitting secondary API limits.
- Thread safety: `DocumentChunkDTO` appending will be handled safely by aggregating the futures' results after completion.
- The existing `tenacity` retry logic will be retained. Multi-threading paired with exponential backoff ensures that if a user hits a rate limit, the thread safely sleeps without blocking other parallel threads.

## Testing Decisions

- Test the `PDFIngestionService._attach_synthetic_questions` method directly to verify all chunks are processed and returned correctly in a multi-threaded context.
- Test that execution time significantly decreases when using a mocked LLM with an artificial delay (assert parallel elapsed time is substantially less than sequential elapsed time).
- Prior art: We have `test_ingestion.py` using `pytest` which already mocks `generate_questions` and `invoke`.

## Out of Scope

- Migrating the entire backend pipeline to `asyncio` (`async def`). We stick to `ThreadPoolExecutor` because `process_document` currently runs inside a FastAPI background task which executes synchronous code safely in its own threadpool.
- Dynamic concurrency scaling based on API tier. We will use a sensible fixed default (10) for now.

## Further Notes

By turning a 70-iteration sequential loop into batches of 10 concurrent requests, a typical 2-minute ingestion process should drop to approximately 10-15 seconds.
