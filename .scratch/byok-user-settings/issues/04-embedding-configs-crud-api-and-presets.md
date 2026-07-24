# 04 — Embedding Configs CRUD API & Presets

**What to build:** REST endpoints for getting and updating the user's Embedding Config, and listing recommended embedding model presets. If a user already has uploaded documents, the API rejects updates to the Embedding Config (Embedding Lock).

**Blocked by:** 02 — Embedding Configs table & vector unconstrain, 03 — Provider Configs CRUD API

**Status:** ready-for-agent

- [x] Pydantic schemas for `EmbeddingConfigSaveRequest`, `EmbeddingConfigResponse`, `EmbeddingPresetDTO`
- [x] Endpoint `GET /api/settings/embedding/presets`: Returns list of recommended presets (Gemini 768d, OpenAI 1536d, OpenAI 768d, etc.)
- [x] Endpoint `GET /api/settings/embedding`: Retrieves user's active embedding config and lock status (`locked: boolean`)
- [x] Endpoint `POST /api/settings/embedding`: Saves embedding config (allows selecting preset or custom model). Rejects if `locked == true`
- [x] Logic to check document count for user to determine `locked` status
- [x] Backend tests for preset list, saving embedding config, and verifying lock enforcement

