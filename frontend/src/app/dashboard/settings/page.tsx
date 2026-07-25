'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import {
  getEmbeddingConfig, listProviderConfigs
} from '@/lib/api';
import type { EmbeddingConfig, ProviderConfig, UserPayload } from '@/types';
import ProviderSettingsSection from '@/components/settings/ProviderSettingsSection';
import EmbeddingSettingsSection from '@/components/settings/EmbeddingSettingsSection';

function createUserPayload(id: string, email: string | undefined): UserPayload {
  return { user_id: id, email: email || '', role: 'authenticated' };
}

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) { router.push('/login'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      if (!mounted) return;
      setUser(createUserPayload(authUser.id, authUser.email));
      setToken(session.access_token);

      const [provRes, embConfigRes] = await Promise.all([
        listProviderConfigs(session.access_token),
        getEmbeddingConfig(session.access_token),
      ]);

      if (!mounted) return;

      if (provRes.success && provRes.data) setConfigs(provRes.data);
      if (embConfigRes.success && embConfigRes.data) setEmbeddingConfig(embConfigRes.data);
    }

    init();
    return () => { mounted = false; };
  }, [supabase, router]);

  const reloadConfigs = useCallback(async () => {
    if (!token) return;
    const res = await listProviderConfigs(token);
    if (res.success && res.data) setConfigs(res.data);
  }, [token]);

  return (
    <div className="min-h-screen w-full bg-canvas text-primary font-sans transition-colors duration-150">
      {/* Top Navbar Header */}
      <header className="sticky top-0 z-30 border-b border-subtle bg-canvas/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 rounded py-1 -ml-1 pr-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
            <span className="text-subtle text-xs">/</span>
            <h1 className="text-xs font-medium text-primary font-sans tracking-tight">
              Pengaturan
            </h1>
          </div>
          {user ? (
            <div className="text-[10px] font-mono text-muted bg-surface-card border border-subtle px-2 py-1 rounded shadow-sm">
              {user.email}
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-5xl mx-auto px-6 py-12 lg:py-16 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {/* Global Toast Messages - positioned at top, spanning all columns */}
        {(successMsg || errorMsg) && (
          <div className="md:col-span-3 space-y-3 mb-2">
            {successMsg ? (
              <div role="status" aria-live="polite" className="p-3 rounded-md bg-[var(--pastel-green-bg)] border border-[var(--pastel-green-text)]/20 text-[var(--pastel-green-text)] text-xs leading-normal flex items-center gap-2 shadow-sm">
                <Check className="w-3.5 h-3.5 text-[var(--pastel-green-text)] shrink-0" aria-hidden="true" />
                <span>{successMsg}</span>
              </div>
            ) : null}

            {errorMsg ? (
              <div role="alert" aria-live="polite" className="p-3 rounded-md bg-[var(--pastel-red-bg)] border border-[var(--pastel-red-text)]/20 text-[var(--pastel-red-text)] text-xs leading-normal flex items-center gap-2 shadow-sm">
                <AlertCircle className="w-3.5 h-3.5 text-[var(--pastel-red-text)] shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            ) : null}
          </div>
        )}

        {/* SECTION 1: Chat Providers (Bento Box - 2/3 width) */}
        {token ? (
          <div className="md:col-span-2 h-full flex flex-col">
            <ProviderSettingsSection
              configs={configs}
              token={token}
              onReloadConfigs={reloadConfigs}
              onSetSuccessMsg={setSuccessMsg}
              onSetErrorMsg={setErrorMsg}
            />
          </div>
        ) : null}

        {/* SECTION 2: Embedding Models (Bento Box - 1/3 width) */}
        {token ? (
          <div className="md:col-span-1 h-full flex flex-col">
            <EmbeddingSettingsSection
              configs={configs}
              embeddingConfig={embeddingConfig}
              token={token}
              onSetEmbeddingConfig={setEmbeddingConfig}
              onSetSuccessMsg={setSuccessMsg}
              onSetErrorMsg={setErrorMsg}
            />
          </div>
        ) : null}
      </main>
    </div>
  );
}
