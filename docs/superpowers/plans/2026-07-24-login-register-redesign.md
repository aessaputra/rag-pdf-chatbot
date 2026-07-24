# Redesign Login & Register Utilitarian Minimalist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `frontend/src/app/login/page.tsx` into an ultra-minimalist, cardless, zero-clutter authentication page following `/minimalist-ui`, `/redesign-existing-projects`, `/web-design-guidelines`, `/supabase`, and `/vercel-react-best-practices`.

**Architecture:** Refactor `LoginPage` component into a single-column, cardless document-style layout (`max-w-sm`). Strip decorative badges, subtitles, input icons, and footers. Maintain Supabase Auth client logic, memoizing the client instance and using strict TypeScript typing with Vercel React performance patterns.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, `@supabase/ssr`, `@supabase/supabase-js`.

## Global Constraints

- **Language & UX Copy**: Indonesian, super direct, single-word headers (`Masuk` / `Daftar`, `EMAIL`, `KATA SANDI`). Zero marketing fluff or unnecessary badges.
- **Cardless Layout**: No outer container card box, no drop shadows. Form content centered on dark canvas (`#09090b`).
- **No Input Icons**: Pure text inputs with subtle 1px border (`#232326`) and crisp focus ring (`#52525b`).
- **Conditional Rendering**: Explicit ternary operators (`authState.status === 'error' ? ... : null`).
- **Performance**: `js-early-exit` on missing email/password, `useMemo` for Supabase client creation.

---

### Task 1: Refactor `LoginPage` UI & UX Copy in `frontend/src/app/login/page.tsx`

**Files:**
- Modify: `frontend/src/app/login/page.tsx:1-220`

**Interfaces:**
- Consumes: `@/lib/supabaseClient`, `@/types` (`AuthState`)
- Produces: Redesigned `LoginPage` component with cardless minimalist design and zero UX copy clutter.

- [ ] **Step 1: Update `LoginPage` component code in `frontend/src/app/login/page.tsx`**

Replace the contents of `frontend/src/app/login/page.tsx` with the zero-clutter cardless utilitarian implementation:

```tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { AuthState } from '@/types';

function toUserFriendlyError(message: string): string {
  if (message.includes('Failed to fetch')) {
    return 'Gagal terhubung ke server otentikasi. Periksa koneksi internet Anda.';
  }
  return message;
}

export default function LoginPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authState, setAuthState] = useState<AuthState>({ status: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Early exit pattern (js-early-exit)
    if (!email || !password) return;

    setAuthState({ status: 'loading' });

    try {
      const authAction = mode === 'signup'
        ? supabase.auth.signUp({ email, password })
        : supabase.auth.signInWithPassword({ email, password });

      const { data, error } = await authAction;
      if (error) throw error;

      if (data.user) {
        setAuthState({
          status: 'success',
          user: { user_id: data.user.id, email: data.user.email || email, role: 'authenticated' },
        });

        if (mode === 'signup') {
          setTimeout(() => router.push('/dashboard'), 1000);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setAuthState({
        status: 'error',
        message: toUserFriendlyError(err.message || 'Otentikasi gagal.'),
      });
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setAuthState({ status: 'idle' });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#09090b] text-[#f4f4f5]">
      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(39,39,42,0.25),transparent_70%)] pointer-events-none z-0" />

      {/* Cardless Form Container */}
      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Header & Mode Switcher */}
        <div className="flex items-baseline justify-between border-b border-[#232326] pb-4">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-white">
            {mode === 'signin' ? 'Masuk' : 'Daftar'}
          </h1>

          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`transition-colors duration-150 cursor-pointer ${
                mode === 'signin' ? 'text-white font-medium underline underline-offset-4' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Masuk
            </button>
            <span className="text-zinc-700">&bull;</span>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`transition-colors duration-150 cursor-pointer ${
                mode === 'signup' ? 'text-white font-medium underline underline-offset-4' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              Daftar
            </button>
          </div>
        </div>

        {/* Status Alerts using Muted Pastels (rendering-conditional-render) */}
        {authState.status === 'error' ? (
          <div className="p-3 rounded-md bg-[#2a1618] border border-[#451a1d] text-[#f87171] text-xs leading-normal">
            {authState.message}
          </div>
        ) : null}

        {authState.status === 'success' ? (
          <div className="p-3 rounded-md bg-[#132719] border border-[#1a3d24] text-[#4ade80] text-xs leading-normal">
            {mode === 'signup'
              ? 'Pendaftaran berhasil. Mengalihkan...'
              : 'Otentikasi berhasil. Mengalihkan...'}
          </div>
        ) : null}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="auth-email" className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">
              EMAIL
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-3 py-2.5 rounded-md minimal-input text-xs"
            />
          </div>

          <div>
            <label htmlFor="auth-password" className="block font-mono text-[11px] uppercase tracking-wider text-zinc-400 mb-1.5">
              KATA SANDI
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-3 py-2.5 rounded-md minimal-input text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={authState.status === 'loading'}
            className="w-full mt-2 py-2.5 px-4 rounded-md minimal-button-primary text-xs flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authState.status === 'loading' ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                Memproses...
              </span>
            ) : (
              <span>{mode === 'signin' ? 'Masuk' : 'Daftar'}</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run frontend type checking & build verification**

Run command:
`cd frontend && npm run build`

Expected Output: Clean Next.js 15 build with 0 TypeScript compilation errors and successful route generation for `/login`.

- [ ] **Step 3: Commit changes to Git**

Run command:
`git add frontend/src/app/login/page.tsx docs/superpowers/specs/2026-07-24-login-register-redesign-design.md docs/superpowers/plans/2026-07-24-login-register-redesign.md`
`git commit -m "feat(auth): redesign login & register page into cardless utilitarian minimalist UI"`
