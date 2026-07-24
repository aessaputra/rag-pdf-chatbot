# 03 — Provider Configs CRUD API

**What to build:** REST endpoints allowing authenticated users to create, list, update, and delete their LLM Provider Configs. When creating or updating, API keys are encrypted using `CryptoService` before saving to Supabase. Responses return masked API keys (`••••xxxx`). Input validation enforces provider-specific required fields (e.g. `base_url` required for OpenAI-Compatible).

**Blocked by:** 01 — Encryption foundation + Provider Configs table

**Status:** ready-for-agent

- [x] Pydantic request/response schemas for `ProviderConfigCreate`, `ProviderConfigUpdate`, `ProviderConfigResponse`
- [x] Provider validation rules (`gemini`, `openai`, `openrouter`, `openai_compatible`)
- [x] `POST /api/settings/providers`: Create config (encrypt key, validate fields, handle default selection)
- [x] `GET /api/settings/providers`: List authenticated user's configs with masked API keys
- [x] `PUT /api/settings/providers/{id}`: Update config
- [x] `DELETE /api/settings/providers/{id}`: Delete config
- [x] Unit/integration tests for CRUD API routes

