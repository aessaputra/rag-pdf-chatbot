'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, FileText, Lock, Mail, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import type { AuthState } from '@/types';

function toUserFriendlyError(message: string): string {
  if (message.includes('Failed to fetch')) {
    return 'Gagal terhubung ke Supabase Cloud. Periksa koneksi internet atau matikan ekstensi AdBlock/CORS.';
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

  const tabClass = (active: boolean) =>
    `py-2 text-xs font-semibold rounded-lg transition-all ${
      active
        ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white shadow-md'
        : 'text-slate-400 hover:text-slate-200'
    }`;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-600/15 blur-3xl rounded-full pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 shadow-lg shadow-indigo-500/30 mb-4">
            <FileText className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            RAG PDF Chatbot <Sparkles className="w-5 h-5 text-cyan-400" />
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {mode === 'signin'
              ? 'Masuk untuk mengelola dokumen PDF & percakapan AI Anda'
              : 'Daftar akun baru untuk mulai tanya jawab dokumen PDF'}
          </p>
        </div>

        <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-slate-900/80 border border-slate-800">
          <button type="button" onClick={() => switchMode('signin')} className={tabClass(mode === 'signin')}>
            Masuk Akun
          </button>
          <button type="button" onClick={() => switchMode('signup')} className={tabClass(mode === 'signup')}>
            Daftar Baru
          </button>
        </div>

        {authState.status === 'error' && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{authState.message}</div>
          </div>
        )}

        {authState.status === 'success' && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-start gap-3 animate-in fade-in duration-200">
            <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              {mode === 'signup'
                ? 'Pendaftaran akun berhasil! Mengalihkan ke Dashboard...'
                : 'Otentikasi berhasil! Mengalihkan ke Dashboard...'}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Alamat Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">Kata Sandi</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-xs"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={authState.status === 'loading'}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-semibold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {authState.status === 'loading' ? (
              <span>Memproses Otentikasi...</span>
            ) : (
              <>
                <span>{mode === 'signin' ? 'Masuk Sekarang' : 'Daftar Akun Baru'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-8 text-center border-t border-slate-800/80 pt-4">
          <p className="text-[11px] text-slate-400">
            Dilindungi oleh Supabase Auth & Row Level Security (RLS)
          </p>
        </div>
      </div>
    </div>
  );
}
