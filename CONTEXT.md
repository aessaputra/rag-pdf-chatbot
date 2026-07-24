# RAG PDF Chatbot

A full-stack Retrieval-Augmented Generation system where users upload PDF documents, ask questions, and receive LLM-generated answers with page-level citations.

## Language

**Provider:**
A named LLM service that the system can call for chat completions or embeddings. The four supported providers are Gemini, OpenAI, OpenRouter, and OpenAI-Compatible.
_Avoid_: model, service, backend

**Provider Config:**
A user-owned record that stores the credentials and settings needed to call a single Provider. One user may have many Provider Configs.
_Avoid_: settings, preferences, API key entry

**BYOK (Bring Your Own Key):**
The access model where each user supplies their own API keys for LLM providers. The system operator does not subsidise LLM costs.
_Avoid_: shared key, operator key, free tier

**OpenAI-Compatible:**
A Provider whose API conforms to the OpenAI Chat Completions contract (`/v1/chat/completions`). Requires a custom `base_url`, `api_key`, and `model_name`. Examples: Groq, Together AI, vLLM, LM Studio.
_Avoid_: custom provider, generic provider

**Embedding Config:**
A user-owned record that stores which embedding model, provider, and vector dimensions the user has chosen. Locked after the first PDF upload.
_Avoid_: vector settings, embedding preferences

**Embedding Lock:**
The constraint that prevents a user from changing their Embedding Config after their first document has been ingested. Changing the embedding model would make existing vectors incomparable.
_Avoid_: freeze, immutable

**Provider Selector:**
The sidebar dropdown that lets the user pick which of their configured providers to use for the current chat. Only shows providers with a valid Provider Config.
_Avoid_: model picker, AI chooser

**Encryption Key:**
The server-side AES-256 symmetric key (`SETTINGS_ENCRYPTION_KEY`) used to encrypt and decrypt user API keys at rest. Stored as a backend environment variable, never in the database.
_Avoid_: secret, master key
