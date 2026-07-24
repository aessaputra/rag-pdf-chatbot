# Design Spec: RAG Context Header & Document-First Navigation

## Executive Summary
Replaces the generic, confusing header (`Chat RAG • 1 Dokumen Aktif`) with a professional, document-first RAG context header adhering strictly to `/minimalist-ui` and `/web-design-guidelines`.

---

## 1. Problem Statement
The previous header displayed generic technical jargon (`Chat RAG`) and an isolated, unanchored badge (`1 Dokumen Aktif`). This obscured the actual PDF filename being queried, creating cognitive ambiguity for the user regarding which document was active in the LLM's context.

---

## 2. Design Solution (Combination of Approach 1 & 3)

### 2.1 Layout & Visual Structure
- **Container:** `h-13 border-b border-subtle bg-canvas/80 backdrop-blur-xs flex items-center justify-between px-5 select-none z-20`
- **Left Side (Document Anchor):**
  - **Single Active PDF:** Renders the actual PDF filename in editorial serif typography (`text-xs font-semibold font-serif text-primary truncate max-w-[280px]`) accompanied by a subtle file icon.
  - **Multiple Active PDFs (2+):** Renders the primary filename + a clean count chip (e.g., `📄 SINTA 3 - AES SAPUTRA.pdf` + `[+1 Berkas]`).
  - **Zero Active PDFs:** Renders `Belum Ada Sumber PDF` in muted amber palette.
- **Right Side (Interactive Status Pill):**
  - Clicking either the document title or the status pill triggers the `DocumentManagerModal`.
  - Pill Badge: Styled with muted emerald pastel tint (`bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-mono text-[11px]`).

### 2.2 Professional Micro-Copy Rules
| State | Old Copy | New Minimalist UX Copy |
|---|---|---|
| 1 Active PDF | `Chat RAG` + `1 Dokumen Aktif` | `📄 [Filename.pdf]` + `[AKTIF]` |
| N Active PDFs | `Chat RAG` + `N Dokumen Aktif` | `📄 [Filename.pdf]` + `[+N Berkas]` |
| 0 Active PDFs | `Chat RAG` + `0 Dokumen Aktif` | `⚠️ Belum Ada Sumber PDF` + `[+ Tambah]` |

---

## 3. Data & Prop Interface Changes

### `ChatWindowProps`
- `activeDocumentCount?: number`
- `activeDocuments?: DocumentItem[]` (Passed from parent to retrieve exact filename of active document)
- `onOpenDocumentModal?: () => void`

---

## 4. Verification & Testing
- Verify Next.js frontend builds cleanly (`npm run build`).
- Verify Light & Dark mode rendering using project design tokens (`bg-canvas`, `border-subtle`, `text-primary`).
- Verify container responsiveness across screen sizes.
