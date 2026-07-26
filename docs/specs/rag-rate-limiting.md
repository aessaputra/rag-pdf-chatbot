## Problem Statement

The user is facing an issue where the multi-threaded document ingestion pipeline (HyDE synthetic question generation) hits the LLM provider's rate limit (Error 429 Too Many Requests) almost immediately. Because the system dispatches 10 parallel requests in the exact same millisecond via `ThreadPoolExecutor`, the LLM provider rejects the burst, leading to numerous failure logs. Furthermore, based on the `/langchain-architecture` skill, using synchronous `ThreadPoolExecutor` for LLM parallelization is an anti-pattern that consumes heavy OS memory and thread resources compared to native `asyncio`.

## Solution

Implement a **Pure Async Batch Processing Architecture** coupled with a **Token Bucket Rate Limiter**. 
1. We will transition the FastAPI background ingestion task (`process_document`) from synchronous threads to purely asynchronous coroutines.
2. We will replace `ThreadPoolExecutor` with `asyncio.gather` for LLM chunk processing.
3. We will inject LangChain's native `InMemoryRateLimiter` into the LLM, which flawlessly throttles `ainvoke` calls.
4. We will wrap all blocking I/O (Supabase SDK, PyMuPDF4LLM) in `asyncio.to_thread` to ensure the FastAPI Main Event Loop is never blocked.

This combination represents the ultimate enterprise best practice for LangChain workloads: it eliminates 429 errors, maximizes throughput, and minimizes system memory footprint while maintaining server responsiveness.

## User Stories

1. As an application administrator, I want the system to dispatch LLM API requests smoothly, so that I do not trigger aggressive 429 Rate Limit errors from my LLM provider.
2. As a backend developer, I want the error logs in my LLM dashboard to be clean, so that I can easily spot real API failures instead of expected rate-limit bursts.
3. As a backend developer, I want to use Pure Async/Await across my entire pipeline, so that my FastAPI server can process hundreds of chunks concurrently without CPU/Memory bottlenecks or Event Loop freezes.
4. As a system architect, I want to avoid changing the LLM System Prompt to a batch format, so that the LLM maintains 100% attention on a single paragraph per request, guaranteeing high-quality synthetic questions.

## Implementation Decisions

- **Token Bucket Limiter:** We will instantiate an `InMemoryRateLimiter` configured for `requests_per_second=2` and `max_bucket_size=5`. This allows a quick burst of 5 requests and smoothly queues the rest at 2 requests per second.
- **Pure Async Refactoring:** We will refactor `process_document`, `_attach_synthetic_questions`, and `generate_questions` to be `async def`.
- **Async Batching:** We will replace `ThreadPoolExecutor.map` with `asyncio.gather(*tasks)` exactly as recommended by the `/langchain-architecture` skill.
- **LLM Invocation:** We will switch from `llm.invoke()` to the asynchronous `await llm.ainvoke()`. The rate-limiter built into LangChain will seamlessly pause the coroutine exactly when needed.
- **Thread Offloading:** We will wrap all synchronous database calls (`supabase.table()...execute()`) and PDF parsing in `await asyncio.to_thread(...)` to prevent Event Loop blocking.

## Testing Decisions

- **Automated Tests:** We will heavily update `tests/test_ingestion.py`.
- **Validation:** A good test ensures that the document chunks are still processed completely and in the correct order, and that the migration to `async/await` does not break background task execution.
- **Seams:** The test seam remains the `generate_questions` mock, which will be updated to an `AsyncMock` to accommodate the `await` syntax. `pytest.mark.asyncio` will be added to the test suite.

## Out of Scope

- **Batch Prompting:** Changing the LLM prompt to accept multiple paragraphs (JSON input/output mapping) is strictly out of scope.
- **External Message Queues:** Implementing a full-blown Celery or Redis-based rate limiter is out of scope. We will rely on LangChain's in-memory solution which is perfect for single-instance FastAPI deployments.

## Further Notes

- A token bucket rate of 2 RPS means 70 requests will take about 35 seconds. Because it is purely asynchronous, FastAPI is free to serve hundreds of other user requests (e.g., chat streaming) during this 35-second wait without skipping a beat.
