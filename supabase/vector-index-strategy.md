# Vector Index Strategy

PaperMind currently stores embeddings in an unconstrained `VECTOR` column so each user can choose an Embedding Config with different dimensions. That keeps BYOK flexible, but it prevents a single HNSW index from covering all rows because pgvector indexes require a fixed dimensional operator class.

Keep sequential vector search until representative data reaches 100,000 embedded chunks or p95 `match_document_chunks` latency exceeds 500 ms for a tenant with ready active documents. Before changing schema, benchmark with production-like row counts, tenant distribution, and the active MMR settings.

Preferred upgrade path: split `document_chunks` storage by supported embedding dimension, keeping one fixed-dimension vector column per table so each can have its own HNSW cosine index. Keep the public retrieval contract unchanged by routing through `match_document_chunks` based on the caller's Embedding Config dimension.

Do not add partial or expression vector indexes unless pgvector supports the exact unconstrained-vector cast safely for the target dimensions and benchmarks show a real latency win.
