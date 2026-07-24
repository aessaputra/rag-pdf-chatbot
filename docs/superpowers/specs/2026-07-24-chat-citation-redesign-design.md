# Design Specification: Chat Window & Citation Panel Editorial Redesign

**Date**: 2026-07-24  
**Topic**: Chat Window (`frontend/src/components/ChatWindow.tsx`) & Citation Panel (`frontend/src/components/CitationPanel.tsx`) Redesign  
**Design Paradigm**: Ultra-Minimalist Editorial RAG Interface (`/minimalist-ui`, `/redesign-existing-projects`, `/web-design-guidelines`)

---

## 1. Overview & Goal

Redesign the Chat Window and Citation Drawer Panel into a world-class, ultra-minimalist editorial interface inspired by Perplexity AI, Claude, and Cursor AI.

### Core Objectives:
1. **Cardless AI Responses (`ChatWindow.tsx`)**: Remove heavy container cards around AI answers. Stream AI responses directly on the dark canvas (`#09090b`) with refined reading typography (`leading-relaxed text-[#f4f4f5]`).
2. **Compact Non-Redundant Citation Badges (`ChatWindow.tsx`)**: Replace bulky 2x2 grid blocks containing truncated document titles (`Tema Etika Profesi P... • Hal 3`) with clean, compact page badges (`Hal 2`, `Hal 3`, `Hal 4`).
3. **Flat Metadata & Sanitized Context (`CitationPanel.tsx`)**: Eliminate sub-cards for `DOKUMEN` and `HALAMAN` in the citation drawer. Sanitize PDF extraction bullet artifacts (`[]` / PUA unicode glyphs) into clean bullet dots `•`. Present context excerpt as an elegant editorial quote block (`border-l-2 border-[#52525b] pl-3`).

---

## 2. Component Refactoring Breakdown

### A. `ChatWindow.tsx`
- **User Messages**: Sleek top-right aligned message bubble (`bg-[#18181b] border border-[#27272a] text-white rounded-xl px-4 py-2.5 max-w-lg`).
- **AI Messages**: Cardless editorial text block on canvas (`bg-transparent border-0 p-0 text-[#f4f4f5] leading-relaxed max-w-2xl`).
- **Citation Badges Row**:
  - Header: Monospace `SUMBER` (`text-[10px] text-zinc-500 font-mono uppercase tracking-wider`).
  - Badges: Compact pill buttons (`Hal {c.page_number}` or `{c.filename} • Hal {c.page_number}` if multiple files are selected).

### B. `CitationPanel.tsx`
- **Header**: Monospace `DETAIL SITASI` with close icon button.
- **Metadata Section**: Unified document header without sub-cards (`text-xs font-semibold text-white` document title + `HALAMAN {page_number}` badge).
- **Context Excerpt**:
  - Glyph Sanitization: `content.replace(/[\uE000-\uF8FF\u25A0-\u25FF]/g, '•')`.
  - Styling: Editorial quote block (`border-l-2 border-[#52525b] pl-3.5 py-1 text-zinc-300 text-xs leading-relaxed font-sans`).

---

## 3. Verification Plan

1. **Automated Verification**:
   - Run `npm run build` in `frontend/` to ensure TypeScript compilation and Next.js App Router build pass with 0 errors.
2. **Manual Verification**:
   - Verify cardless streaming chat responses in browser/container.
   - Verify citation badges and detail drawer rendering without broken `[]` glyphs.
