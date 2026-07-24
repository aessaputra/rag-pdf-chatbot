'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import type { AuthState } from '@/types';

function toUserFriendlyError(message: string): string {
  if (message.includes('Failed to fetch')) {
    return 'Gagal terhubung ke Supabase Cloud. Periksa koneksi internet atau matikan ekstensi AdBlock/CORS.';
  }
  return message;
}

// Hoisted static component to prevent re-creation on render (rerender-no-inline-components)
interface AuthTabButtonProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function AuthTabButton({ active, onClick, children }: AuthTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full py-2 px-3 text-xs font-medium rounded-md transition-all duration-150 ${
        active
          ? 'bg-[#27272a] text-[#fafafa] shadow-sm'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#18181b]'
      }`}
    >
      {children}
    </button>
  );
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
        message: toUserFriendlyError(err.message || 'Terjadi kesalahan otentikasi.'),
      });
    }
  };

  const switchMode = (newMode: 'signin' | 'signup') => {
    setMode(newMode);
    setAuthState({ status: 'idle' });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-[#09090b] text-[#f4f4f5]">
      {/* Structural ambient light - subtle, low-opacity warm gradient (minimalist-ui directive) */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(39,39,42,0.35),transparent_70%)] pointer-events-none z-0" />

      <div className="w-full max-w-md minimal-card p-6 sm:p-8 rounded-xl relative z-10">
        {/* Header with Editorial Typography */}
        <div className="flex flex-col items-start mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 rounded border border-[#27272a] bg-[#18181b] text-zinc-400">
              v1.0 &bull; Supabase RLS
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl font-semibold tracking-tight text-white leading-tight">
            {mode === 'signin' ? 'Masuk ke akun Anda' : 'Buat akun baru'}
          </h1>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            {mode === 'signin'
              ? 'Kelola dokumen PDF & percakapan tanya-jawab berbasis AI.'
              : 'Daftar untuk mengakses asisten dokumen PDF cerdas.'}
          </p>
        </div>

        {/* Segmented Mode Switcher */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-lg bg-[#18181b] border border-[#27272a]">
          <AuthTabButton active={mode === 'signin'} onClick={() => switchMode('signin')}>
            Masuk Akun
          </AuthTabButton>
          <AuthTabButton active={mode === 'signup'} onClick={() => switchMode('signup')}>
            Daftar Baru
          </AuthTabButton>
        </div>

        {/* Status Alerts using Muted Pastels (minimalist-ui directive & explicit ternary rendering) */}
        {authState.status === 'error' ? (
          <div className="mb-5 p-3.5 rounded-lg bg-[#2a1618] border border-[#451a1d] text-[#f87171] text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-[#f87171] shrink-0 mt-0.5" />
            <div className="leading-normal font-sans">{authState.message}</div>
          </div>
        ) : null}

        {authState.status === 'success' ? (
          <div className="mb-5 p-3.5 rounded-lg bg-[#132719] border border-[#1a3d24] text-[#4ade80] text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
            <div className="leading-normal font-sans">
              {mode === 'signup'
                ? 'Pendaftaran akun berhasil. Mengalihkan ke Dashboard...'
                : 'Otentikasi berhasil. Mengalihkan ke Dashboard...'}
            </div>
          </div>
        ) : null}

        {/* Authentication Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-300 mb-1.5">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg minimal-input text-xs"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-300">
                Kata Sandi
              </label>
              <span className="font-mono text-[10px] text-zinc-500">Min. 6 karakter</span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-lg minimal-input text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={authState.status === 'loading'}
            className="w-full mt-2 py-2.5 px-4 rounded-lg minimal-button-primary text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authState.status === 'loading' ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
                Memproses...
              </span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Masuk Sekarang' : 'Daftar Akun'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>

        {/* Footer info & shortcut micro-UI */}
        <div className="mt-6 pt-4 border-t border-[#232326] flex items-center justify-between text-[11px] text-zinc-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Terproteksi Supabase Auth</span>
          </div>
          <div className="flex items-center gap-1">
            <span>Tekan</span>
            <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a] text-zinc-400">
              Enter ↵
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}

