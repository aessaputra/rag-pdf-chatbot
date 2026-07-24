# 08 — Sidebar & Dashboard hard block UX

**What to build:** Update the sidebar provider selector to display only the user's configured providers. Add a "⚙️ Settings" navigation link. Enforce a hard block on the chat input and PDF uploader if the user has not configured any provider or embedding key, guiding them to the Settings page.

**Blocked by:** 05 — LLM Factory & RAG Service BYOK Refactor, 06 — Settings page Provider Configs UI

**Status:** ready-for-agent

- [x] Sidebar provider dropdown fetches user's configured providers from API
- [x] Dropdown options render custom provider labels and default selections
- [x] Empty state dropdown: "No provider configured" with link to Settings
- [x] Navigation link "⚙️ Settings" in Sidebar footer
- [x] Hard block UX: Chat input and PDF Upload button disabled if user lacks active provider/embedding config
- [x] Prominent callout banner on empty chat screen: "Configure your AI Provider in Settings to start chatting"
- [x] TypeScript type updates and frontend API client methods (`fetchUserProviders`, `fetchUserEmbeddingConfig`, etc.)

