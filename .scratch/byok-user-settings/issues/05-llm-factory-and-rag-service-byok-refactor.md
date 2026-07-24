# 05 — LLM Factory & RAG Service BYOK Refactor

**What to build:** Refactor `LLMFactory`, `RAGService`, and `IngestionService` to instantiate LLM models and embeddings dynamically using the decrypted credentials from the authenticated user's `ProviderConfig` and `EmbeddingConfig`. Remove dependency on fallback global environment variables for end-user execution. Hard-block requests with HTTP 403 if the user has no configured API key for the selected provider.

**Blocked by:** 03 — Provider Configs CRUD API, 04 — Embedding Configs CRUD API & Presets

**Status:** ready-for-agent

- [x] Update `LLMFactory.get_llm(provider_config)` to accept decrypted configuration object and initialize `ChatGoogleGenerativeAI`, `ChatOpenAI` (with `base_url` & `model`), or OpenRouter/OpenAI-Compatible instances
- [x] Update `LLMFactory.get_embeddings(embedding_config)` to construct embeddings model dynamically
- [x] Refactor `RAGService` to retrieve user's active provider config and embedding config per request
- [x] Refactor `IngestionService` to use user's active embedding config during PDF document chunking and vector storage
- [x] Auto-set `locked = true` in `user_embedding_configs` upon successful ingestion of the user's first document
- [x] Tests verifying dynamic BYOK model instantiation, embedding vector generation, and 403 errors when credentials are missing

