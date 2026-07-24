# Design Specification: Settings Utilitarian Minimalist Redesign

**Date**: 2026-07-24  
**Topic**: Settings Page Redesign (`frontend/src/app/dashboard/settings/page.tsx`)  
**Design Paradigm**: Premium Utilitarian Minimalism & Zero-Clutter UX (`/minimalist-ui`, `/redesign-existing-projects`, `/web-design-guidelines`)

---

## 1. Overview & Goal

Redesign the Settings page (`/dashboard/settings`) of the RAG PDF Chatbot application to adhere to strict utilitarian minimalism and eliminate all UX copy clutter, redundant intro banners, provider description paragraphs, and verbose warning text.

### Core Objectives:
1. **Zero UX Copy Clutter**: Eliminate long security intro banners, remove paragraph descriptions under provider choices, use sharp monospace uppercase labels (`PROVIDER CHAT`, `MODEL EMBEDDING`, `PILIH PROVIDER`, `LABEL`, `KUNCI API`, `SLUG MODEL`, `BASE URL`).
2. **Utilitarian Flat Layout**: Constrain width to `max-w-3xl`, clean `#121215` cards with `1px solid #232326` borders, crisp 2x2 grid for provider selection without text noise.
3. **Preserve All Functionality**: Maintain exact functionality for Provider Configs CRUD (Gemini, OpenAI, OpenRouter, OpenAI-Compatible), AES-256 encrypted storage via backend API, set default provider, list/save embedding presets, and embedding model locking (`locked = true`).

---

## 2. Component Refactoring Breakdown

### A. Topbar & Header
- **Breadcrumb**: `Dashboard` / `Pengaturan` (`font-serif text-sm font-semibold`).
- **User Email**: Monospace badge `user.email` on the right side.

### B. Section 1: Provider Chat (LLM)
- **Section Header**: Monospace `PROVIDER CHAT`. Remove subtitle verbiage.
- **Provider Selector (2x2 Grid)**: 4 clean button options (`Google Gemini`, `OpenAI`, `OpenRouter`, `OpenAI-Compatible`) with single-line labels and zero paragraph descriptions.
- **Form Fields**: Monospace uppercase labels (`LABEL`, `KUNCI API`, `SLUG MODEL`, `BASE URL`).
- **Configured Providers List**: Card with provider name, provider type badge, default status badge, masked API key, model slug, base URL, and direct action buttons (`Set Default`, `Edit`, `Hapus`).

### C. Section 2: Model Embedding
- **Section Header**: Monospace `MODEL EMBEDDING`.
- **Locked Banner**: Single line `Model embedding terkunci karena dokumen PDF sudah terunggah.` + link `Buka Dashboard →`.
- **Preset Dropdown**: Clean select dropdown of embedding presets or Custom option.
- **Save Action**: Button `Simpan Embedding`.

---

## 3. Verification Plan

1. **Automated Verification**:
   - Run `npm run build` in `frontend/` to ensure strict TypeScript and Next.js App Router build passes cleanly.
2. **Manual Verification**:
   - Test adding, editing, setting default, and deleting provider configs.
   - Test selecting embedding presets and saving embedding config.
   - Verify embedding lock banner when documents exist.
