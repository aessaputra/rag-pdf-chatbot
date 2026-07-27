'use client';

import { useState, useCallback } from 'react';

import Link from 'next/link';
import { ArrowLeftIcon, CheckIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useApp } from '@/context/AppContext';
import { listProviderConfigs } from '@/lib/api';
import ProviderSettingsSection from '@/components/settings/ProviderSettingsSection';
import EmbeddingSettingsSection from '@/components/settings/EmbeddingSettingsSection';
import EnrichmentSettingsSection from '@/components/settings/EnrichmentSettingsSection';

export default function SettingsPage() {
  const { user, token, providerConfigs, embeddingConfig, setProviderConfigs, setEmbeddingConfig, isInitializing } = useApp();

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const reloadConfigs = useCallback(async () => {
    if (!token) return;
    const res = await listProviderConfigs(token);
    if (res.success && res.data) setProviderConfigs(res.data);
  }, [token, setProviderConfigs]);

  return (
    <div className="min-h-screen w-full bg-canvas text-primary font-sans">

      <header className="sticky top-0 z-30 border-b border-subtle bg-canvas/80 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 rounded py-1 -ml-1 pr-2"
            >
              <ArrowLeftIcon className="w-3.5 h-3.5" aria-hidden="true" />
              <span>App</span>
            </Link>
            <span className="text-subtle text-xs">/</span>
            <h1 className="text-xs font-medium text-primary font-sans tracking-tight">
              Pengaturan
            </h1>
          </div>
          {user ? (
            <div className="text-xs font-mono text-muted/80 tracking-wide">
              {user.email}
            </div>
          ) : null}
        </div>
      </header>


      <main className="max-w-6xl mx-auto px-4 md:px-6 py-12 lg:py-16 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">

        {(successMsg || errorMsg) && (
          <div className="md:col-span-3 space-y-3 mb-2">
            {successMsg ? (
              <div role="status" aria-live="polite" className="p-3 rounded-md bg-(--pastel-green-bg) border border-(--pastel-green-text)/20 text-(--pastel-green-text) text-xs leading-normal flex items-center gap-2">
                <CheckIcon className="w-3.5 h-3.5 text-(--pastel-green-text) shrink-0" aria-hidden="true" />
                <span>{successMsg}</span>
              </div>
            ) : null}

            {errorMsg ? (
              <div role="alert" aria-live="polite" className="p-3 rounded-md bg-(--pastel-red-bg) border border-(--pastel-red-text)/20 text-(--pastel-red-text) text-xs leading-normal flex items-center gap-2">
                <ExclamationTriangleIcon className="w-3.5 h-3.5 text-(--pastel-red-text) shrink-0" aria-hidden="true" />
                <span>{errorMsg}</span>
              </div>
            ) : null}
          </div>
        )}

        {!token || isInitializing ? (
          <div className="md:col-span-2 flex items-center justify-center p-12">
            <div className="flex items-center gap-3 text-muted text-sm font-mono animate-pulse">
              <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Memuat konfigurasi...
            </div>
          </div>
        ) : (
          <>
            <div className="md:col-span-1 h-full flex flex-col min-w-0">
              <ProviderSettingsSection
                configs={providerConfigs}
                token={token}
                onReloadConfigs={reloadConfigs}
                onSetSuccessMsg={setSuccessMsg}
                onSetErrorMsg={setErrorMsg}
              />
            </div>
            <div className="md:col-span-1 h-full flex flex-col min-w-0">
              <EmbeddingSettingsSection
                configs={providerConfigs}
                embeddingConfig={embeddingConfig}
                token={token}
                onSetEmbeddingConfig={setEmbeddingConfig}
                onSetSuccessMsg={setSuccessMsg}
                onSetErrorMsg={setErrorMsg}
              />
            </div>
            <div className="md:col-span-1 h-full flex flex-col min-w-0">
              <EnrichmentSettingsSection
                token={token}
                onSetSuccessMsg={setSuccessMsg}
                onSetErrorMsg={setErrorMsg}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
