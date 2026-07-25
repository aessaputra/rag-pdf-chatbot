# Spec: Optimasi Tipografi & Layout Chat UI

> **Reference:** Percakapan audit sitasi → temuan tipografi terlalu kecil  
> **Applied Skills:** `web-design-guidelines`, `vercel-react-best-practices`, `to-spec`  
> **Status:** Specification Complete (Ready for Implementation)

---

## Problem Statement

Sebagai pengguna yang membaca respons AI di chat RAG PDF Chatbot, tipografi yang digunakan saat ini **terlalu kecil dan tidak rapih** untuk pengalaman membaca yang nyaman. Seluruh body text chat menggunakan `text-xs` (12px), marker bullet list `text-[10px]`, tombol sitasi `text-[11px]`, dan panel sitasi menggunakan campuran `text-[10px]`/`text-xs` — semuanya di bawah standar readability yang wajar untuk konten panjang.

Audit berdasarkan **Vercel Web Interface Guidelines** mengungkapkan pelanggaran tipografi sistemik: ukuran font arbitrary di bawah 12px (`text-[10px]`, `text-[11px]`), tidak adanya `font-variant-numeric: tabular-nums` pada angka halaman, heading tanpa `text-wrap: balance`, dan truncation sitasi yang terlalu agresif (`max-w-[120px]`).

---

## Solution

Menaikkan skala tipografi secara konsisten di seluruh komponen chat, dari body text (12px → 14px), marker/label (10px → 12px), sampai citation button dan panel detail. Perubahan bersifat **murni CSS class** — tidak ada perubahan logic, state management, props, atau API contract. Empat komponen yang dimodifikasi:

1. **ChatMessageItem** — AI response body, user bubble, bullet/numbered lists, inline code, citation buttons
2. **CitationPanel** — Panel width, header, filename, page badge, section label, body content
3. **ChatWindowMessages** — Empty state descriptions, suggestion chip text
4. **ChatWindowInput** — Textarea input font size

---

## User Stories

1. As a user reading AI responses, I want body text at a comfortable 14px size, so that I can read long PDF analysis answers without straining my eyes.
2. As a user scanning bullet points in AI answers, I want list markers at a legible 12px size, so that the typographic hierarchy between body text and markers is clear.
3. As a user reading inline code in AI responses, I want code blocks at 12px, so that they are visually distinct from body text but still readable.
4. As a user clicking citation buttons, I want the page number and filename text at 12px, so that I can quickly identify which source to inspect.
5. As a user viewing the Citation Panel, I want the document content displayed at 14px, so that reading the referenced PDF excerpt is effortless.
6. As a user checking the Citation Panel header, I want the filename prominently shown at 14px, so that the document source is immediately obvious.
7. As a user scanning page numbers on citation badges, I want tabular numeric alignment, so that multi-digit page numbers like "9" and "15" visually align.
8. As a user reading AI headings within a response, I want headings balanced with `text-wrap: balance`, so that short headings don't leave awkward widows.
9. As a user typing a question, I want the chat input textarea at 14px, so that my input is easy to proofread before sending.
10. As a user landing on an empty chat state, I want descriptive text at 14px, so that the onboarding message is inviting rather than cramped.
11. As a user browsing suggestion chips in the empty state, I want chip text at 14px, so that prompt suggestions are scannable at a glance.
12. As a user on both light and dark themes, I want the typography scale to look consistent across both modes, so that there is no visual regression in either theme.

---

## Implementation Decisions

### Typographic Scale

Keputusan utama: menggunakan **Tailwind's built-in scale** daripada arbitrary values.

| Semantic Role | Before | After | Rationale |
|---|---|---|---|
| Body text (AI + User) | `text-xs` (12px) | `text-sm` (14px) | Minimum comfortable reading size |
| List markers | `text-[10px]` | `text-xs` (12px) | One step below body, still legible |
| Inline code | `text-[11px]` | `text-xs` (12px) | Match marker scale, eliminate arbitrary |
| AI heading h3 | `text-sm` (14px) | `text-base` (16px) | Proper hierarchy above body |
| AI heading h4 | `text-xs` (12px) | `text-sm` (14px) | Match body, differentiate by weight |
| Citation buttons | `text-[11px]` | `text-xs` (12px) | Eliminate arbitrary |
| Citation filename | `text-[10px]` | `text-xs` (12px) | Match button scale |
| CitationPanel body | `text-xs` (12px) | `text-sm` (14px) | Reading content |
| CitationPanel badge | `text-[10px]` | `text-xs` (12px) | Eliminate arbitrary |
| Section labels | `text-[10px]` | `text-[11px]` | Minimal bump, remains subsidiary |
| Chat input textarea | `text-xs` (12px) | `text-sm` (14px) | Match conversation body |

### Spacing & Proportion Adjustments

- AI bubble padding: `p-4` → `p-5` (proportional to larger text)
- AI avatar icon: `w-6 h-6` → `w-7 h-7` (proportional)
- Citation button padding: `py-1 px-2.5` → `py-1.5 px-3` (more hit target)
- Citation filename truncation: `max-w-[120px]` → `max-w-[160px]` (less aggressive)
- Paragraph spacing: `space-y-2` → `space-y-2.5` (more breathing room)
- Bullet vertical margin: `my-0.5` → `my-1`

### Web Interface Guidelines Compliance

- Tambah `[font-variant-numeric:tabular-nums]` pada page number di citation buttons dan CitationPanel badge
- Tambah `[text-wrap:balance]` pada AI response headings (h3, h4)
- CitationPanel width: `w-[320px]` → `w-[360px]` (accommodate larger text)

### Modules Modified

- `ChatMessageItem` — FormattedMessage sub-component, user bubble, citation strip
- `CitationPanel` — Layout width, all text elements
- `ChatWindowMessages` — Empty states, suggestion chips
- `ChatWindowInput` — Textarea

### Architectural Constraints

- **No logic changes** — All modifications are Tailwind class string replacements
- **No prop changes** — Component interfaces remain identical
- **No new dependencies** — Uses existing Tailwind classes only
- **Memo stability preserved** — `React.memo` comparison functions unchanged

---

## Testing Decisions

### What Makes a Good Test

Karena ini perubahan visual murni (CSS class strings), tidak ada perubahan perilaku yang bisa diuji secara unit. Test yang tepat adalah:

1. **TypeScript type-check + build** — Memastikan class string replacements tidak merusak JSX structure
2. **Visual verification** — Memastikan font scale, spacing, dan alignment benar di browser

### Automated Verification

- `npm run build` di `frontend/` — TypeScript compilation memverifikasi tidak ada syntax error dari class string edits
- Backend tests tidak terpengaruh (`python -m pytest tests/` tetap pass, tanpa perubahan backend)

### Prior Art

Proyek ini tidak memiliki frontend unit tests (tidak ada test runner seperti Vitest/Jest di `package.json`). Verifikasi frontend dilakukan via `npm run build` sesuai pola yang sudah ditetapkan di `AGENTS.md`:

> **Frontend Verification**: `cd frontend && npm run build` — TypeScript type-check + Next.js production build

---

## Out of Scope

- **Responsive breakpoints** — Tidak mengubah layout pada viewport mobile/tablet (perlu spec terpisah)
- **Font family changes** — Tetap menggunakan font stack yang ada (`font-sans`, `font-serif`, `font-mono`)
- **Color palette changes** — Tidak mengubah color tokens (`text-primary`, `text-muted`, `text-secondary`)
- **Animation/transition changes** — Tidak mengubah timing atau easing
- **New components** — Tidak membuat komponen baru
- **Markdown renderer upgrade** — `FormattedMessage` tetap lightweight inline parser (tidak upgrade ke remark/rehype)
- **Backend changes** — Tidak ada perubahan backend apapun

---

## Further Notes

- Perubahan ini tidak memiliki risiko regresi fungsional karena hanya memodifikasi CSS class strings
- Semua 4 file yang diubah ada di `frontend/src/components/chat/` — scope sangat terbatas
- CitationPanel width change dari 320px → 360px perlu diverifikasi tidak menyebabkan overflow pada viewport ~1280px
- Jika setelah implementasi ternyata `text-sm` (14px) terasa terlalu besar di desktop, bisa dipertimbangkan `text-[13px]` sebagai kompromi — tapi ini di luar scope spec ini
