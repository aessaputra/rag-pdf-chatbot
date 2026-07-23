# Ticket-07 Specification: Premium Next.js UI Chat Interface & Citation Panel

> **Reference Ticket:** [TICKET-07] (from `docs/TICKETS.md`)  
> **Applied Skills:** `to-spec`, `nextjs-best-practices`, `frontend-design`, `tailwind-design-system`, `typescript-advanced-types`, `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengguna terotentikasi, kita membutuhkan antarmuka dashboard obrolan RAG PDF yang kaya fitur (*feature-rich*), indah, dan responsif. Antarmuka ini harus mendukung unggah dokumen PDF drag-and-drop, pengiriman pertanyaan AI dengan keluaran *token streaming* realtime, serta panel penampil sitasi referensi nomor halaman PDF yang interaktif.

Tanpa arsitektur UI yang terstruktur rapi, penanganan SSE streaming client-side yang tangguh, dan desain *glassmorphic dashboard*, antarmuka obrolan akan terasa lambat, membingungkan, dan sulit menyajikan informasi referensi halaman dokumen.

---

## Solution

Membuat modul API Client `frontend/src/lib/api.ts`, komponen UI modular, dan halaman dashboard `frontend/src/app/dashboard/page.tsx`:
1. **API Client & SSE Stream Reader (`frontend/src/lib/api.ts`)**:
   - Fungsi `streamChat()` yang membaca aliran `event: citations` dan `event: token` dari endpoint `/api/chat/stream` FastAPI.
   - Fungsi REST API client untuk `uploadDocument()`, `listDocuments()`, `deleteDocument()`, dan `listSessions()`.
2. **Sidebar Navigation (`frontend/src/components/Sidebar.tsx`)**:
   - Panel navigasi kiri yang menampilkan daftar sesi percakapan, tombol "Chat Baru", dan tombol Logout.
3. **Document Manager (`frontend/src/components/DocumentManager.tsx`)**:
   - Area unggah PDF *Drag-and-Drop* dengan indikator progress dan daftar dokumen yang dapat dihapus.
4. **Chat Window (`frontend/src/components/ChatWindow.tsx`)**:
   - Window percakapan dengan efek pengetikan streaming realtime, penanda badge sitasi (`[Doc - Halaman X]`), dan auto-scroll otomatis.
5. **Citation Panel (`frontend/src/components/CitationPanel.tsx`)**:
   - Panel/Drawer kanan yang terbuka saat badge sitasi diklik, menampilkan kutipan teks lengkap, nama file PDF, dan nomor halaman secara persisi.
6. **Dashboard Page Integration (`frontend/src/app/dashboard/page.tsx`)**:
   - Pengelola *State* pusat yang menghubungkan Sidebar, Document Manager, Chat Window, dan Citation Panel.

---

## User Stories

1. As an authenticated user, I want to drag and drop PDF files into the Document Manager, so that they are instantly uploaded and processed into vector embeddings.
2. As a user asking questions, I want to see response tokens appear in real time on the Chat Window, so that I don't have to wait for long completion delays.
3. As a researcher, I want to click on citation badges attached to AI answers, so that the Citation Panel opens to show me the exact page number and text snippet from the PDF.

---

## Implementation Decisions

### 1. SSE Stream Client Protocol (`frontend/src/lib/api.ts`)

```typescript
import type { Citation } from '@/types';

export async function fetchSSEStream(
  url: string,
  token: string,
  body: object,
  onCitations: (citations: Citation[]) => void,
  onToken: (tokenText: string) => void,
  onComplete: () => void
): Promise<void> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    throw new Error(`HTTP Error ${response.status}`);
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    const lines = chunk.split('\n\n');

    for (const line of lines) {
      if (line.startsWith('event: citations')) {
        const jsonStr = line.replace('event: citations\ndata: ', '').trim();
        if (jsonStr) {
          try {
            const citations = JSON.parse(jsonStr);
            onCitations(citations);
          } catch (e) {
            console.error('Failed to parse citations SSE frame', e);
          }
        }
      } else if (line.startsWith('event: token')) {
        const jsonStr = line.replace('event: token\ndata: ', '').trim();
        if (jsonStr) {
          try {
            const data = JSON.parse(jsonStr);
            if (data.token) onToken(data.token);
          } catch (e) {
            console.error('Failed to parse token SSE frame', e);
          }
        }
      }
    }
  }

  onComplete();
}
```

### 2. Layout & Component Architecture

```
frontend/src/
├── components/
│   ├── Sidebar.tsx
│   ├── DocumentManager.tsx
│   ├── ChatWindow.tsx
│   └── CitationPanel.tsx
├── app/
│   └── dashboard/
│       └── page.tsx
```

- **State Management**:
  - `activeCitations: Citation[]`: List of citations for the active answer.
  - `selectedCitation: Citation | null`: Selected citation open in the Citation Panel drawer.
  - `activeSessionId: string | null`: Current active chat session.
  - `documents: DocumentItem[]`: Currently uploaded PDF documents.

---

## Testing Decisions

- **Tested Seam**: `fetchSSEStream` protocol parsing & Dashboard component state composition.
- **Good Test Criteria**:
  - Verify `fetchSSEStream` extracts citations event frame correctly before tokens.
  - Verify clicking a citation badge sets `selectedCitation` state and opens the Citation Panel.
- **Verification Command**: `npm run build` inside `frontend/` directory.

---

## Out of Scope

- Multi-tenant enterprise team management (out of scope for MVP).
- Rich-text PDF annotation editing (out of scope for MVP).

---

## Further Notes

Menghubungkan badge sitasi langsung ke Citation Panel kanan menciptakan alur kerja analisis dokumen yang sangat intuitif (*fluid UX*).
