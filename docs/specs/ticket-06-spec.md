# Ticket-06 Specification: Frontend Next.js 15 Setup & Supabase Auth Client

> **Reference Ticket:** [TICKET-06] (from `docs/TICKETS.md`)  
> **Applied Skills:** `to-spec`, `nextjs-best-practices`, `nextjs-supabase-auth`, `frontend-design`, `tailwind-design-system`, `typescript-advanced-types`, `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengguna, kita membutuhkan antarmuka web modern yang responsif, estetis, dan aman untuk melakukan login atau pendaftaran akun sebelum dapat mengakses dashboard RAG PDF Chatbot.

Tanpa konfigurasi frontend Next.js 15 yang tepat, integrasi Supabase Auth Client (`@supabase/ssr`), type safety TypeScript mutakhir (*Discriminated Unions* & *Strict Null Checks*), dan desain UI berkelas tinggi (*glassmorphism dark mode*), pengalaman pengguna akan terasa kaku, tidak menarik, dan rentan terhadap runtime type error.

---

## Solution

Menginisialisasi proyek frontend `frontend/` menggunakan **Next.js 15 (App Router)**, **React 19**, **TypeScript**, **Tailwind CSS v4**, dan **`@supabase/ssr`**:

1. **Package Setup (`frontend/package.json`)**: Mengonfigurasi dependensi Next.js 15, `@supabase/ssr`, `@supabase/supabase-js`, Lucide React, dan Tailwind CSS v4.
2. **TypeScript Advanced Types (`frontend/src/types/index.ts`)**:
   - Menyiapkan *Discriminated Unions* untuk `AuthState` (`{ status: 'idle' } | { status: 'loading' } | { status: 'success'; user: User } | { status: 'error'; message: string }`).
   - Generic API response wrappers (`ApiResponse<T>`) tanpa pengunaan `any`.
3. **Supabase Browser Client (`frontend/src/lib/supabaseClient.ts`)**: Membuat helper Supabase Client yang aman untuk browser client-side.
4. **Design System & Global Styling (`frontend/src/app/globals.css` & `layout.tsx`)**:
   - Tema _Modern Dark Mode_ dengan palet warna curated (Slate 950, Indigo 600, Cyan 500).
   - Efek _Glassmorphism_ (`backdrop-blur-md`, `bg-slate-900/60`, `border-slate-800`).
   - Tipografi modern berbasis Google Font (Inter) & ikonisasi Lucide React.
5. **Login / Register Page (`frontend/src/app/login/page.tsx`)**:
   - Form otentikasi interaktif dengan tab beralih antara "Masuk Akun" dan "Daftar Baru".
   - Penanganan _state loading_, pesan error interaktif, dan navigasi otomatis ke `/dashboard` saat login sukses.

---

## User Stories

1. As a new user, I want to create an account with my email and password on a sleek, modern signup screen, so that I can secure my PDF documents.
2. As a returning user, I want to log in using my credentials, so that my Supabase JWT session is stored and sent to protected FastAPI backend routes.
3. As a user on a mobile or desktop screen, I want a responsive, glassmorphic UI with clear feedback states, so that the experience feels premium and responsive.

---

## Implementation Decisions

### 1. Vercel & Next.js 15 Composition Patterns

- **App Router Architecture**: Leverage `app/layout.tsx` for global fonts and providers, keeping server/client boundary explicit.
- **Client Component Boundary**: Mark `frontend/src/app/login/page.tsx` with `'use client'` to handle form events, tab toggles, and client-side Supabase authentication methods.
- **Supabase SSR / Browser Client**: Initialize client using `createBrowserClient` from `@supabase/ssr` to ensure session cookie management.

### 2. Design System & Aesthetics Guidelines

- **Background**: Dark background gradient (`from-slate-950 via-indigo-950/20 to-slate-950`).
- **Cards & Surfaces**: Glassmorphism cards with `backdrop-blur-md bg-slate-900/80 border border-slate-800/80 shadow-2xl rounded-2xl`.
- **Inputs & Buttons**:
  - Focus state: `focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500`.
  - Primary Action Button: Vibrant indigo-to-cyan gradient (`bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500`).
- **Feedback States**: Error banners with red-tinted glassmorphism (`bg-rose-500/10 border-rose-500/30 text-rose-300`).

### 3. File Structure Blueprint

```
frontend/
├── src/
│   ├── app/
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   ├── page.tsx (Redirects to /dashboard or /login)
│   │   └── login/
│   │       └── page.tsx
│   ├── lib/
│   │   └── supabaseClient.ts
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
└── .env.example
```

#### `frontend/src/lib/supabaseClient.ts`

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

---

## Testing Decisions

- **Tested Seam**: Client-side form submission & Supabase Auth Client initialization.
- **Good Test Criteria**:
  - Verify `createClient()` initializes without throwing missing environment errors.
  - Verify login page renders form inputs for email and password cleanly.
  - Verify switching tabs toggles between Login and Register mode.
- **Verification Command**: `npm run build` inside `frontend/` directory.

---

## Out of Scope

- Dashboard Chat UI & PDF File Manager (handled in TICKET-07).
- Server-side OAuth Provider Callback handling (Email/Password authentication is the primary MVP flow).

---

## Further Notes

Penerapan _glassmorphism_ dan gradien indigo-cyan memberikan tampilan kelas atas (_state-of-the-art UI_) yang meningkatkan kepercayaan pengguna saat pertama kali masuk ke sistem.
