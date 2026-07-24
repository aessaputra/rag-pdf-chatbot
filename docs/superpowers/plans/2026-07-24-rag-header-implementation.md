# RAG Context Header & Document-First Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace generic header copy (`Chat RAG`) with an active document context header (`📄 [Filename.pdf] • [AKTIF]`) following `/minimalist-ui` and `/web-design-guidelines`.

**Architecture:** Update `ChatWindow.tsx` and `DashboardPage` (`page.tsx`) to pass active document metadata, rendering clean, editorial typography for active PDF filenames and minimalistic status pills.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Lucide React.

## Global Constraints

- Design System: `bg-canvas`, `border-subtle`, `text-primary`, `text-muted`, `bg-emerald-500/10 text-emerald-500`.
- Typography: Editorial serif (`font-serif`) for active PDF filename header, monospace (`font-mono text-[11px]`) for status pill badges.
- Strict Micro-Copy: No "Chat RAG", no "1 Dokumen Aktif Terpilih", no emojis.

---

### Task 1: Update ChatWindow Props & Header Implementation

**Files:**
- Modify: `frontend/src/components/ChatWindow.tsx:18-30`
- Modify: `frontend/src/app/dashboard/page.tsx:250-265`

**Interfaces:**
- Consumes: `documents: DocumentItem[]` passed from `page.tsx`
- Produces: RAG context header displaying active PDF filename (`📄 SINTA 3 - AES SAPUTRA.pdf`) or active doc count

- [ ] **Step 1: Update ChatWindowProps interface in ChatWindow.tsx**

```tsx
interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  hasCredentials?: boolean;
  activeDocumentCount?: number;
  documents?: DocumentItem[];
  provider?: string;
  providerConfigs?: ProviderConfig[];
  onProviderChange?: (provider: string) => void;
  onSendMessage: (query: string) => Promise<void>;
  onSelectCitation: (citation: Citation) => void;
  onOpenDocumentModal?: () => void;
}
```

- [ ] **Step 2: Implement Document-First RAG Header in ChatWindow.tsx**

```tsx
  const activeDocs = (documents || []).filter((d) => (d.is_active ?? true) && d.status === 'ready');
  const primaryDoc = activeDocs[0];
  const extraCount = activeDocs.length - 1;
```

- [ ] **Step 3: Update ChatWindow invocation in dashboard page.tsx**

Pass `documents={documents}` to `<ChatWindow>` component.

- [ ] **Step 4: Verify Next.js build**

Run: `npm run build` in `frontend/`
Expected: `✓ Compiled successfully`

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/ChatWindow.tsx frontend/src/app/dashboard/page.tsx
git commit -m "feat(frontend): implement document-first RAG context header"
```
