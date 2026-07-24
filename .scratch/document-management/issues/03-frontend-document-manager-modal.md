# 03 — Frontend Document Manager Modal & API Client

**What to build:** An ultra-minimalist Next.js Document Management Modal component (`DocumentManagerModal.tsx`) with drag-and-drop PDF upload zone, micro-badge status indicators (`AKTIF` vs `OFF`), toggle switches, PDF signed-url preview triggers, delete confirmation prompts, and API client helper methods.

**Blocked by:** 02 — Backend Storage Service & Document REST API Endpoints

**Status:** done

- [x] Add `toggleDocumentActive` and `getDocumentPreviewUrl` helper methods to frontend API client (`api.ts`).
- [x] Extend `DocumentItem` and `DocumentPreviewResponse` interfaces in `types/index.ts`.
- [x] Build `DocumentManagerModal.tsx` following `minimalist-ui` guidelines (warm monochrome palette, crisp 1px borders, no emojis, concise micro-copy).
- [x] Support drag-and-drop PDF uploads with real-time processing indicators.
- [x] Support status toggling (`AKTIF` vs `OFF`), signed URL preview in new tab, and permanent hard delete.
