# Specification: BYOK (Bring Your Own Key) Multi-Provider AI Support

## Problem Statement

Currently, the application relies on global LLM and embedding API keys hardcoded in backend environment variables (`.env`). All users share the operator's API keys, which incurs central operational costs and prevents users from configuring their preferred AI providers or using custom endpoints (e.g. OpenRouter, Groq, Together AI, local vLLM). Furthermore, users cannot customize model parameters or manage separate embedding models.

## Solution

Implement a Bring Your Own Key (BYOK) model where users manage their own AI provider configurations securely. Users can register multiple Chat Provider Configs (Google Gemini, OpenAI, OpenRouter, and OpenAI-Compatible custom endpoints) and select their active Embedding Config. All sensitive credentials are encrypted server-side using AES-256-GCM. Unconfigured users are gracefully blocked from performing chat or document uploads until they configure their credentials.

## User Stories

1. As an authenticated user, I want to store my Google Gemini API key, so that I can use Gemini models for chatting with my PDF documents.
2. As an authenticated user, I want to store my OpenAI API key, so that I can query my documents using OpenAI models.
3. As an authenticated user, I want to configure an OpenRouter API key and model name, so that I can access OpenRouter's aggregated LLM catalog.
4. As an authenticated user, I want to register OpenAI-Compatible custom provider endpoints (Base URL, API Key, Model Name, Display Name), so that I can use providers like Groq, Together AI, or local vLLM instances.
5. As an authenticated user, I want my API keys to be encrypted at rest in the database, so that my credentials remain protected against data leaks.
6. As an authenticated user, I want to select my active chat provider from the dashboard sidebar dropdown, so that I can switch models seamlessly during conversations.
7. As an authenticated user, I want to view my configured providers with masked API keys (e.g. `••••1234`), so that my secret keys are not exposed on screen.
8. As an authenticated user, I want to select my preferred embedding model before uploading documents, so that my document vector representations match my desired model quality and dimensions.
9. As an authenticated user, I want the system to prevent changing embedding models once I have uploaded PDF documents, so that my document search vector space remains valid and consistent.
10. As a first-time user without configured API keys, I want clear guidance and disabled chat/upload inputs directing me to the Settings page, so that I understand why the assistant is inactive.
11. As an authenticated user, I want to delete or update any of my provider configurations, so that I can revoke or update rotated API keys.

## Implementation Decisions

### Architectural Seams & Security
- **Server-Side AES-256-GCM Encryption**: API keys are encrypted in Python using a server-side symmetric key (`SETTINGS_ENCRYPTION_KEY`). Encrypted strings are stored in Supabase PostgreSQL tables; raw keys never leave the backend memory environment.
- **Row Level Security (RLS)**: Enforced on all new setting tables (`user_provider_configs`, `user_embedding_configs`) using cached tenant ownership checks `((SELECT auth.uid()) = user_id)`.
- **Database Schema**:
  - `user_provider_configs`: Multi-row per user (`id`, `user_id`, `provider`, `display_name`, `api_key_enc`, `base_url`, `model_name`, `is_default`, `created_at`, `updated_at`).
  - `user_embedding_configs`: Single-row per user (`user_id`, `provider`, `api_key_enc`, `base_url`, `model_name`, `embedding_dimensions`, `locked`, `created_at`, `updated_at`).
  - `document_chunks`: Updated column `embedding VECTOR` (unconstrained dimension) to allow per-user custom vector sizes (768, 1536, 3072, etc.).
- **LLM & Embedding Factory Dynamic Instantiation**: `LLMFactory` dynamically builds `ChatGoogleGenerativeAI`, `ChatOpenAI` (with custom `base_url`), or `OpenAIEmbeddings` using decrypted user configurations per request.

### API Contracts
- `GET /api/settings/providers`: Returns list of user's provider configs with masked keys.
- `POST /api/settings/providers`: Validates and saves a new provider config.
- `PUT /api/settings/providers/{id}`: Updates an existing provider config.
- `DELETE /api/settings/providers/{id}`: Deletes a provider config.
- `GET /api/settings/embedding`: Retrieves user's active embedding config and lock status.
- `GET /api/settings/embedding/presets`: Returns list of recommended embedding presets.
- `POST /api/settings/embedding`: Saves embedding config (rejected if documents exist).

## Testing Decisions

- **Seam Selection**: Testing will be concentrated at two primary seams:
  1. Backend Service Layer: Unit tests for `CryptoService` (encryption/decryption roundtrips, tampering detection) and `LLMFactory` dynamic initialization.
  2. FastAPI Router Endpoints: Integration tests using `pytest` and `httpx` to verify settings CRUD endpoints, key masking, validation, and HTTP 403 enforcement for missing keys.
- **Database RLS Verification**: Test queries ensuring `authenticated` role users cannot access or modify another user's provider configs.
- **Prior Art**: Follows existing backend test patterns in `backend/tests/test_auth.py` and `backend/tests/test_routers.py`.

## Out of Scope

- User billing, subscription limits, or quota tracking for operator-provided fallback keys.
- Fine-tuning hyperparameters (e.g. top_p, frequency_penalty) per individual prompt in the primary UI.
- Automatic re-embedding/re-indexing of existing PDF documents upon changing embedding providers.

## Further Notes

- Progressive disclosure in UI: Users can select embedding presets mapping directly to their already-configured chat providers, eliminating redundant API key entry.
- Hard block logic protects backend from sending invalid requests to LLM providers when users have not supplied keys.
