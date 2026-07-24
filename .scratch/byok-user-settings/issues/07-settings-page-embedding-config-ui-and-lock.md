# 07 — Settings page Embedding Config UI & Lock

**What to build:** The Embedding Model configuration section on the Settings page (`/dashboard/settings`). Employs progressive disclosure: a simple single dropdown mapping to configured chat providers and recommended presets. Includes an expandable section for custom embedding models. Displays an explicit warning banner if embedding settings are locked due to existing documents.

**Blocked by:** 04 — Embedding Configs CRUD API & Presets, 06 — Settings page Provider Configs UI

**Status:** ready-for-agent

- [x] Embedding Model dropdown displaying recommended presets associated with the user's active provider configs
- [x] Auto-population of dimensions and model names when selecting presets
- [x] Expandable advanced section for Custom Embedding Model (`model_name`, `base_url`, `api_key`, `dimensions`)
- [x] Lock warning banner: "Embedding model is locked because you have uploaded PDF documents."
- [x] Read-only / disabled state for form controls when `locked == true`
- [x] Action link to Document Manager if user needs to delete documents to change embedding model

