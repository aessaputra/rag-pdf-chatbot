# Spec Redesain Halaman Settings (Single-Column Studio Layout)

## Problem Statement

Tampilan halaman `/dashboard/settings` saat ini memiliki beberapa kendala kualitas UI dan UX:
1. **Ketidakseragaman Visual & Palette Warna**: Penggunaan elemen warna-warni yang bervariasi (`blue-400`, `emerald-400`, `purple-400`, `amber-400`) serta kontras latar `zinc-*` yang belum konsisten dengan sistem warna Obsidian monokromatik baru dashboard (`#09090b` canvas, `#121215` card background, `#232326` subtle border).
2. **Kurangnya Sentuhan Tipografi Editorial**: Judul seksi dan header utama belum memanfaatkan arsitektur tipografi `Newsreader` (*italic serif*) untuk pengalaman visual yang hangat dan profesional.
3. **Kepatuhan Aksesibilitas & Web Interface Guidelines**:
   - Beberapa status *loading* dan *placeholder* masih memakai tiga titik mentah (`...`) alih-alih karakter elipsis resmi (`…`).
   - Ikon-ikon dekoratif belum ditandai dengan `aria-hidden="true"`.
   - Tombol-tombol aksi berbentuk ikon (seperti Edit dan Hapus) membutuhkan `aria-label` yang eksplisit.
   - Penanda fokus keyboard (`focus-visible:ring-2`) perlu ditegaskan pada seluruh kontrol interaktif.

## Solution

Mengimplementasikan **Single-Column Studio Layout (`max-w-4xl`)** untuk `/dashboard/settings` yang sepenuhnya mematuhi prinsip **Utilitarian Minimalism** & **Vercel Web Interface Guidelines**:
- **Palette**: Dark Obsidian Charcoal (`#09090b` canvas, `#121215` card background, `#18181b` input background) dengan pembatas halus `1px solid #232326`.
- **Typography**: `Geist Sans` untuk UI & formulir, `Newsreader` (*italic serif*) untuk judul header dan seksi, serta `Geist Mono` untuk Kunci API rahasia (`sk-••••••••1234`), model slug, base URL, dan dimensi vektor (`768d`).
- **Accents**: Menghapus isi warna ikon yang oversaturated, menggantikannya dengan tombol utama solid `#fafafa` (teks `#09090b`) dan *muted pastel badges* (Pale Emerald untuk Default, Pale Amber untuk Locked, Pale Zinc untuk Provider Type).

## User Stories

1. As a user, I want a clean, single-column settings page with clear section headers, so that I can manage my BYOK API keys and embedding models without visual clutter.
2. As a user, I want to add, edit, or set default AI providers using a minimal, high-contrast modal form, so that I can configure LLM models effortlessly.
3. As a user, I want masked API keys and model metadata formatted in a clear monospace font, so that I can verify my configurations easily.
4. As a user, I want clear, accessible warning indicators when the embedding model is locked due to existing documents, so that I understand why embedding options are disabled.
5. As a keyboard user, I want visible focus indicators (`focus-visible:ring-2`) and proper aria attributes on all interactive controls, so that I can navigate settings seamlessly.

## Implementation Decisions

### Modules to be Modified

1. **Settings Page Component (`frontend/src/app/dashboard/settings/page.tsx`)**:
   - Refactor UI layout into a single-column container (`max-w-4xl mx-auto`).
   - Update Header with `Newsreader` italic title and accessible back navigation.
   - Refactor Section 1 (Chat Providers BYOK) with minimal provider option cards, clean form modal, and accessible action buttons (`aria-label`, `aria-hidden`).
   - Refactor Section 2 (Embedding Model & Lock Status) with minimal preset selector, custom model inputs, and accessible lock warning banner.
   - Apply typography ellipsis `…`, non-breaking spaces for units, and proper focus rings (`focus-visible:ring-2`).

### Design System Rules

- **Colors**:
  - Background Canvas: `#09090b`
  - Cards & Panels: `#121215` / `#18181b`
  - Subtle Borders: `#232326`
  - Primary Accent Button: `#fafafa` (text `#09090b`)
  - Status Badges: Pale Emerald (`#064e3b` / `#a7f3d0`), Pale Amber (`#451a03` / `#fde68a`), Pale Zinc (`#18181b` / `#a1a1aa`)
- **Typography Font Families**:
  - `font-sans`: Geist Sans (`var(--font-geist-sans)`)
  - `font-serif`: Newsreader (`var(--font-newsreader)`)
  - `font-mono`: Geist Mono (`var(--font-geist-mono)`)

## Testing Decisions

### Seams and Test Criteria

1. **Behavioral Seams**:
   - Verify unauthenticated users are redirected to `/login`.
   - Verify creating, updating, setting default, and deleting provider configs updates the UI list properly.
   - Verify selecting an embedding preset or custom configuration updates the embedding state properly.
   - Verify locked embedding state disables preset and custom input controls when documents exist.

2. **UI & Accessibility Verification**:
   - Verify all icon buttons have explicit `aria-label` attributes.
   - Verify decorative icons have `aria-hidden="true"`.
   - Run `npm run build` in `frontend/` to verify zero TypeScript or Next.js build errors.

## Out of Scope

- Modifying backend FastAPI router logic or database encryption (BYOK AES-256 backend logic remains fully intact).
