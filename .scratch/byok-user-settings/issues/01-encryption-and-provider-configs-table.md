# 01 — Encryption foundation + Provider Configs table

**What to build:** The system can securely store and retrieve user-owned API keys. A new `user_provider_configs` table exists in Supabase with full RLS (users can only access their own rows). A backend `CryptoService` encrypts API keys with AES-256 before insert and decrypts on read. A new `SETTINGS_ENCRYPTION_KEY` env var is added to backend config. A roundtrip test proves encrypt → decrypt returns the original key, and an RLS test proves cross-user access is denied.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Migration creates `user_provider_configs` table with columns: `id` (UUID PK), `user_id` (FK → auth.users, ON DELETE CASCADE), `provider` (TEXT, CHECK constraint for known values), `display_name` (TEXT, nullable), `api_key_enc` (TEXT, NOT NULL), `base_url` (TEXT, nullable), `model_name` (TEXT, nullable), `is_default` (BOOLEAN), `created_at`, `updated_at`
- [x] Index on `user_id` for RLS performance
- [x] RLS enabled: SELECT, INSERT, UPDATE, DELETE policies using `(SELECT auth.uid()) = user_id` pattern; UPDATE uses both USING and WITH CHECK
- [x] GRANT to `authenticated` role
- [x] `CryptoService` class with `encrypt(plaintext) → ciphertext` and `decrypt(ciphertext) → plaintext` using AES-256-GCM
- [x] `SETTINGS_ENCRYPTION_KEY` added to backend Settings model with env var
- [x] Unit test: encrypt → decrypt roundtrip succeeds
- [x] Unit test: tampered ciphertext raises error

