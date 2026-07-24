# Spec Redesain Dashboard (Option A: Combined Studio Sidebar)

## Problem Statement

Tampilan dashboard saat ini (`/dashboard`) memiliki beberapa masalah visual dan UX:
1. **Inefisiensi Tata Letak Multi-Panel**: Menampilkan 4 panel terpisah secara sejajar (Sidebar Navigasi, Document Manager, Chat Window, Citation Panel) yang memakan terlalu banyak ruang horizontal pada layar standar (1366px - 1440px), menyebabkan area percakapan chat menjadi sempit dan padat.
2. **Visual Inconsistency & AI Clichés**: Penggunaan gradien warna yang oversaturated (indigo-to-cyan), batas putus-putus (*dashed borders*) yang kontras, serta ikon melingkar dengan gaya generik yang belum mencerminkan antarmuka *utilitarian minimalist & editorial UI*.
3. **Kurangnya Hirarki Tipografi & Aksesibilitas**: Kurangnya variasi tipografi antara judul editorial, teks obrolan, dan data numerik/metadata, serta perlunya penegasan *focus ring* untuk navigasi keyboard.

## Solution

Mengimplementasikan **Option A: Combined Studio Sidebar**, yaitu menyatukan navigasi utama dan pengelola dokumen PDF ke dalam **Satu Panel Kiri Terintegrasi (280px)**, memberikan porsi utama layar (*flex-1*) untuk **Chat Workspace**, serta menampilkan **Citation Panel (320px)** secara kondisional sebagai *slide-over panel* dari sebelah kanan.

Seluruh antarmuka dirombak mengikuti prinsip **Utilitarian Minimalism**:
- **Palette**: Dark Obsidian Warm Charcoal (`#09090b` canvas, `#121215` / `#18181b` surface card) dengan pembatas halus `1px solid #232326`.
- **Typography**: `Geist Sans` untuk UI/Body, `Newsreader` (*serif italic*) untuk judul editorial dan *empty state*, serta `Geist Mono` untuk nomor halaman, ukuran file, dan metadata.
- **Accents**: Menghapus gradien warna terang/oversaturated, menggantikannya dengan tombol solid `#fafafa` (teks `#09090b`) dan *muted pastel badges* (Emerald, Amber, Charcoal).

## User Stories

1. As a user, I want a unified left sidebar containing both navigation and document management, so that I have a clean, wide workspace for reading and asking questions.
2. As a user, I want to see the active AI provider and model selector directly in the sidebar, so that I know which model is processing my queries.
3. As a user, I want to drag and drop PDF files into a sleek, minimal upload zone, so that I can quickly ingest documents for RAG search.
4. As a user, I want to view my uploaded PDF files with clean typography and precise file size metadata, so that I can easily manage my uploaded documents.
5. As a user, I want an uncluttered chat window with an editorial welcome header and keyboard shortcut hints when starting a new chat, so that the application feels modern and intuitive.
6. As a user, I want chat messages to be displayed with high-contrast readable typography and desaturated citation badges, so that I can quickly reference source pages without visual distraction.
7. As a user, I want to click on a citation badge and have a smooth slide-over panel open from the right, so that I can inspect the exact context snippet and page number.
8. As a user, I want clear, un-intrusive warning banners when API keys or embedding models are missing, so that I am guided to settings without broken app states.
9. As a keyboard user, I want visible focus indicators (`focus-visible:ring-2`) on all interactive buttons and inputs, so that I can navigate the entire dashboard efficiently using standard accessibility patterns.

## Implementation Decisions

### Modules to be Modified

1. **Dashboard Main Route (`frontend/src/app/dashboard/page.tsx`)**:
   - Manages global state (documents, messages, streaming status, active provider, selected citation).
   - Parallel fetching of documents, provider configs, and embedding status (`Promise.all`) to avoid async waterfalls.
   - Houses the new 3-panel layout structure (Unified Sidebar, Chat Workspace, Conditional Slide-Over Citation Panel).

2. **Sidebar Component (`frontend/src/components/Sidebar.tsx`)**:
   - Refactored into a **Combined Studio Sidebar (280px)**.
   - Integrates Branding Header, New Chat Button, AI Provider Selector, PDF Document List & Upload Zone, User Account Footer, and Settings Navigation.

3. **Document Manager Component (`frontend/src/components/DocumentManager.tsx`)**:
   - Redesigned into a minimal embedded component inside the Studio Sidebar.
   - Clean drag-and-drop zone with `1px dashed #27272a`, file item lists with `font-mono` size tags, hover-to-delete action.

4. **Chat Window Component (`frontend/src/components/ChatWindow.tsx`)**:
   - Minimalist chat workspace occupying `flex-1`.
   - Editorial empty state with `Newsreader` italic header and `<kbd>` shortcut badges.
   - High-contrast user and AI chat bubbles with clean citation badges.
   - Sticky bottom prompt input bar (`minimal-input`) with accessible send button.

5. **Citation Panel Component (`frontend/src/components/CitationPanel.tsx`)**:
   - Slide-over panel (320px) positioned on the right with smooth entrance animation (`slide-in-from-right`).
   - Clean metadata display and monospace context excerpt reader (`Geist Mono`).

6. **Global Styling & Design System (`frontend/src/app/globals.css`)**:
   - Definition of minimalist CSS variables and utilities (`.minimal-card`, `.minimal-input`, `.minimal-button-primary`).
   - Custom scrollbar styling for dark monochrome background.

### Design System & Theme Rules

- **Colors**:
  - Background Canvas: `#09090b`
  - Cards & Panels: `#121215` / `#18181b`
  - Subtle Borders: `#232326`
  - Text Primary: `#f4f4f5`
  - Text Muted: `#a1a1aa`
  - Primary Accent (Button): `#fafafa` (text `#09090b`)
  - Status Pills: Muted Pastels (Emerald `#064e3b`, Amber `#451a03`, Zinc `#27272a`)
- **Typography Font Families**:
  - `font-sans`: Geist Sans (`var(--font-geist-sans)`)
  - `font-serif`: Newsreader (`var(--font-newsreader)`)
  - `font-mono`: Geist Mono (`var(--font-geist-mono)`)

## Testing Decisions

### Seams and Test Criteria

1. **Behavioral Seams**:
   - Verify dashboard initialization without authentication redirects to `/login`.
   - Verify parallel API fetching loads provider configs, documents, and embedding lock status simultaneously.
   - Verify uploading a PDF updates the document list immediately.
   - Verify clicking a citation badge opens the `CitationPanel` with exact page number and text snippet.
   - Verify streaming SSE responses append tokens smoothly without re-rendering unnecessary components.

2. **UI & Accessibility Verification**:
   - Verify tab navigation highlights interactive elements with `focus-visible:ring-2`.
   - Verify layout responsiveness on screens 1280px and wider.
   - Run `npm run build` in `frontend/` to verify TypeScript types and zero build errors.

## Out of Scope

- Modifying backend FastAPI endpoints or Supabase RLS policies (the backend API contract remains fully intact).
- Redesigning external authentication flows outside `/dashboard` and `/dashboard/settings`.

## Further Notes

- All changes will be executed incrementally without breaking current BYOK encryption, streaming SSE logic, or document embedding lock behavior.
