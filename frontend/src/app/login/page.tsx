'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import type { AuthState } from '@/types';
import { ThemeToggle } from '@/components/ThemeToggle';

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

    if (!email || !password) return;

    setAuthState({ status: 'loading' });

    try {
      const authAction =
        mode === 'signup'
          ? supabase.auth.signUp({ email, password })
          : supabase.auth.signInWithPassword({ email, password });

      const { data, error } = await authAction;
      if (error) throw error;

      if (data.user) {
        setAuthState({
          status: 'success',
          user: { user_id: data.user.id, email: data.user.email || email, role: 'authenticated' },
        });
        router.push('/');
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
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas text-primary transition-colors duration-150 relative">
      {/* Top Right Header Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,var(--border-subtle),transparent_70%)] pointer-events-none z-0 opacity-40" />

      {/* Cardless Form Container */}
      <div className="w-full max-w-sm relative z-10 space-y-6">
        {/* Header & Mode Switcher */}
        <div className="flex items-baseline justify-between border-b border-subtle pb-4">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-primary">
            {mode === 'signin' ? 'Masuk' : 'Daftar'}
          </h1>

          <div className="flex items-center gap-3 text-xs font-mono">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`transition-colors duration-150 cursor-pointer ${
                mode === 'signin'
                  ? 'text-primary font-medium underline underline-offset-4'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Masuk
            </button>
            <span className="text-muted">&bull;</span>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`transition-colors duration-150 cursor-pointer ${
                mode === 'signup'
                  ? 'text-primary font-medium underline underline-offset-4'
                  : 'text-muted hover:text-secondary'
              }`}
            >
              Daftar
            </button>
          </div>
        </div>

        {/* Status Alerts using Muted Pastels */}
        {authState.status === 'error' ? (
          <div className="p-3 rounded-md bg-(--pastel-red-bg) border border-(--pastel-red-text)/20 text-(--pastel-red-text) text-xs leading-normal">
            {authState.message}
          </div>
        ) : null}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on">
          <div>
            <label
              htmlFor="auth-email"
              className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5"
            >
              EMAIL
            </label>
            <input
              id="auth-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
              className="w-full px-3 py-2.5 rounded-md minimal-input text-xs"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5"
            >
              KATA SANDI
            </label>
            <input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Memproses…
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
