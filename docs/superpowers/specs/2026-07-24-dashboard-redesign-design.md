# Design Specification: Dashboard Utilitarian Minimalist Redesign

**Date**: 2026-07-24  
**Topic**: Dashboard Page & Components Redesign (`Sidebar`, `DocumentManager`, `ChatWindow`, `CitationPanel`)  
**Design Paradigm**: Premium Utilitarian Minimalism & Zero-Clutter UX (`/minimalist-ui`, `/redesign-existing-projects`, `/web-design-guidelines`)

---

## 1. Overview & Goal

Redesign the Dashboard components of the RAG PDF Chatbot application to adhere to strict utilitarian minimalism and eliminate all UX copy clutter, redundant badges, marketing slogans, and unnecessary verbiage across the entire dashboard user interface.

### Core Objectives:
1. **Zero UX Copy Clutter**: Remove marketing slogans, empty-state verbiage paragraphs, unnecessary badges (`v1.0`), redundant status tags (`Terautentikasi`), and verbose helper text.
2. **Utilitarian Flat Layout**: High-contrast editorial display typography, monospace labels (`font-mono uppercase tracking-wider`), ultra-thin 1px borders (`border-[#232326]`), and macro-whitespace.
3. **Preserve All Functionality**: Maintain exact functionality for document upload/deletion, SSE streaming chat, provider selection, citation viewing, and authentication checks.

---

## 2. Component Refactoring Breakdown

### A. Sidebar (`Sidebar.tsx`)
- **Header**: Remove `v1.0` badge. Keep crisp `RAG PDF` brand text with small icon.
- **New Chat**: Clean button labeled `Baru` or `Percakapan Baru`.
- **Provider Selector**: Label `PROVIDER AI` (monospace uppercase). Unconfigured fallback state shows clean text link `Atur kunci API di Settings →`.
- **Footer**: Link `Pengaturan` (removed `AI & BYOK` suffix). User email display in `font-mono` with direct sign-out icon button (removed `Terautentikasi` green dot badge).

### B. Document Manager (`DocumentManager.tsx`)
- **Header**: Monospace `BERKAS PDF ({count})`.
- **Upload Zone**: Simplified copy `Unggah PDF` with subtext `Maks 25 MB`. Remove decorative iconography noise.
- **File List**: File item with `font-medium text-xs` filename, `font-mono text-[9px]` file size, and delete button visible on hover/focus.

### C. Chat Window (`ChatWindow.tsx`)
- **Empty State (No Credentials)**:
  - Title: `Konfigurasi Kunci API` (font-serif text-lg)
  - Subtitle: `Atur provider AI di Pengaturan untuk memulai.`
  - Button: `Pengaturan`
- **Empty State (Credentials Present, No Messages)**:
  - Title: `Tanyakan tentang dokumen Anda.` (font-serif text-2xl/3xl, zero paragraph fluff!).
  - Shortcut info: Removed.
- **Message Bubbles**: User message (`bg-[#18181b] border-[#27272a]`), Assistant message (`bg-[#121215] border-[#232326]`).
- **Citation Badges**: Label `SUMBER` (monospace uppercase) + pill button `{filename} • Hal {page}`.
- **Prompt Input Bar**: Centered `max-w-2xl`, placeholder `Tanyakan sesuatu…`, send button `bg-[#fafafa] text-[#09090b]`.

### D. Citation Panel (`CitationPanel.tsx`)
- **Header**: Monospace `DETAIL SITASI` with close button `X`.
- **Metadata Boxes**: Monospace labels `DOKUMEN` and `HALAMAN`.
- **Excerpt Box**: Monospace label `KONTEKS` with text area `bg-[#121215] border-[#232326] font-mono text-xs text-zinc-300`.

---

## 3. Verification Plan

1. **Automated Verification**:
   - Run `npm run build` in `frontend/` to ensure strict TypeScript and Next.js App Router build passes cleanly.
2. **Manual Verification**:
   - Verify layout responsiveness across Desktop & Mobile views.
   - Test PDF upload and document deletion.
   - Test SSE streaming response rendering and citation popup panel.
