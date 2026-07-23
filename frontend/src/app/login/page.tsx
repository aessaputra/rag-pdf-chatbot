'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, FileText, Lock, Mail, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import type { AuthState } from '@/types';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authState, setAuthState] = useState<AuthState>({ status: 'idle' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setAuthState({ status: 'loading' });

    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          setAuthState({
            status: 'success',
            user: {
              user_id: data.user.id,
              email: data.user.email || email,
              role: 'authenticated',
            },
          });
          setTimeout(() => router.push('/dashboard'), 1000);
        }
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;
        if (data.user) {
          setAuthState({
            status: 'success',
            user: {
              user_id: data.user.id,
              email: data.user.email || email,
              role: 'authenticated',
            },
          });
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setAuthState({
        status: 'error',
        message: err.message || 'Terjadi kesalahan otentikasi. Silakan coba lagi.',
      });
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Background Glow Badges */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-cyan-600/15 blur-3xl rounded-full pointer-events-none" />

      {/* Main Glassmorphism Auth Card */}
      <div className="w-full max-w-md glass-panel p-8 rounded-2xl relative z-10">
        {/* Header Branding */}
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

        {/* Tab Switcher */}
        <div className="grid grid-cols-2 p-1 mb-6 rounded-xl bg-slate-900/80 border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setAuthState({ status: 'idle' });
            }}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Masuk Akun
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setAuthState({ status: 'idle' });
            }}
            className={`py-2 text-sm font-medium rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Daftar Baru
          </button>
        </div>

        {/* Error Feedback Banner */}
        {authState.status === 'error' && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>{authState.message}</div>
          </div>
        )}

        {/* Success Feedback Banner */}
        {authState.status === 'success' && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3 text-emerald-300 text-sm">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>Otentikasi berhasil! Mengalihkan ke dashboard...</div>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Alamat Email
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nama@email.com"
                className="w-full glass-input pl-11 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 uppercase tracking-wider mb-2">
              Kata Sandi
            </label>
            <div className="relative">
              <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full glass-input pl-11 pr-4 py-3 rounded-xl text-sm"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={authState.status === 'loading'}
            className="w-full mt-6 py-3.5 px-4 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {authState.status === 'loading' ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'signin' ? 'Masuk Sekarang' : 'Buat Akun Baru'}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer note */}
        <div className="mt-8 text-center text-xs text-slate-500">
          Dilindungi oleh Supabase Auth & Row Level Security (RLS)
        </div>
      </div>
    </div>
  );
}
