# 06 — Settings page Provider Configs UI

**What to build:** A dedicated Settings page at `/dashboard/settings` built following `minimalist-ui` and `web-design-guidelines`. Provides intuitive management of Chat Provider Configs (Gemini, OpenAI, OpenRouter, OpenAI-Compatible). Users can add multiple providers, edit keys, set a default provider, and delete configurations.

**Blocked by:** 03 — Provider Configs CRUD API

**Status:** ready-for-agent

- [x] Page layout at `frontend/src/app/dashboard/settings/page.tsx` adhering to dark theme design tokens (`--bg-canvas`, `minimal-card`, `minimal-input`)
- [x] Provider list view showing configured providers with masked keys (`••••1234`), display names, and provider badges
- [x] Provider creation/edit form with dynamic fields based on provider type:
  - Gemini / OpenAI: API Key field only
  - OpenRouter: API Key + Model Name
  - OpenAI-Compatible: Base URL + API Key + Model Name + Display Name
- [x] Accessible form design (labels, inline validation, focus states, password paste enabled, `autocomplete="off"`)
- [x] Set as Default button for chat providers
- [x] Toast notifications for save/delete actions

