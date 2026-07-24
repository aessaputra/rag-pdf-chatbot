# 04 — Sidebar & Chat Window RAG Scoping Integration

**What to build:** Navigation integration in the sidebar to open the Document Management modal, real-time list synchronization across components, and a concise warning alert banner in the Chat Window when no active documents are selected in the user's knowledge base.

**Blocked by:** 03 — Frontend Document Manager Modal & API Client

**Status:** done

- [x] Add navigation button `Dokumen` in `Sidebar.tsx` to trigger the `DocumentManagerModal`.
- [x] Connect document update callbacks to refresh active document state across the dashboard.
- [x] Add ultra-minimalist warning banner in `ChatWindow.tsx` when 0 active documents are selected (`"Belum ada dokumen aktif."`).
- [x] Verify end-to-end user flow from PDF upload -> toggle status -> RAG chat search filtering -> PDF preview -> hard delete.
