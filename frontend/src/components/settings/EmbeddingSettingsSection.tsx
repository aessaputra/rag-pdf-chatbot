'use client';

import React, { useEffect, useState, useDeferredValue } from 'react';
import Link from 'next/link';
import { LayersIcon, LockClosedIcon } from '@radix-ui/react-icons';
import useSWR from 'swr';
import { saveEmbeddingConfig, verifyAndFetchModels } from '@/lib/api';
import type { EmbeddingConfig, ProviderConfig } from '@/types';

interface EmbeddingSettingsSectionProps {
  readonly configs: ProviderConfig[];
  readonly embeddingConfig: EmbeddingConfig | null;
  readonly token: string;
  readonly onSetEmbeddingConfig: (config: EmbeddingConfig) => void;
  readonly onSetSuccessMsg: (msg: string | null) => void;
  readonly onSetErrorMsg: (msg: string | null) => void;
}

export function EmbeddingSettingsSection({
  configs,
  embeddingConfig,
  token,
  onSetEmbeddingConfig,
  onSetSuccessMsg,
  onSetErrorMsg,
}: EmbeddingSettingsSectionProps) {
  const [embProvider, setEmbProvider] = useState<string>('gemini');
  const [embModelName, setEmbModelName] = useState<string>('');
  const [embDimensions, setEmbDimensions] = useState<number>(768);
  const [embBaseUrl, setEmbBaseUrl] = useState<string>('');
  const [embError, setEmbError] = useState<string | null>(null);
  const [isSavingEmbedding, setIsSavingEmbedding] = useState(false);
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);

  useEffect(() => {
    if (embeddingConfig) {
      setEmbProvider(embeddingConfig.provider);
      setEmbModelName(embeddingConfig.model_name);
      setEmbDimensions(embeddingConfig.embedding_dimensions);
      setEmbBaseUrl(embeddingConfig.base_url || '');
    }
  }, [embeddingConfig]);

  const deferredBaseUrl = useDeferredValue(embBaseUrl.trim());
  const targetConfigId = configs.find((c) => c.provider === embProvider)?.id;

  const fetcherKey = embeddingConfig?.locked || !targetConfigId
    ? null 
    : ['verifyAndFetchModels', embProvider, deferredBaseUrl, targetConfigId, token, 'embedding'];

  const fetcher = async ([, prov, url, cid, tok, type]: any) => {
    return verifyAndFetchModels(prov, undefined, url || undefined, cid || undefined, tok, type);
  };

  const { data: res, isLoading: isLoadingEmbModels } = useSWR(fetcherKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const fetchedEmbModels = res?.data?.models || [];
  const fetchError = res?.error || res?.data?.error || null;

  useEffect(() => {
    if (res?.success && res.data?.models && res.data.models.length > 0) {
      if (!embModelName && res.data.default_model) {
        setEmbModelName(res.data.default_model);
      }
      if (res.data.probed_dimension) {
        setEmbDimensions(res.data.probed_dimension);
      }
    }
  }, [res, embModelName]);

  const handleSaveEmbedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (embeddingConfig?.locked) return;

    setEmbError(null);
    onSetErrorMsg(null);
    onSetSuccessMsg(null);

    if (!embModelName.trim()) {
      setEmbError('Nama model embedding wajib diisi.');
      return;
    }
    if (!embDimensions || embDimensions < 64) {
      setEmbError('Dimensi vektor minimal 64.');
      return;
    }

    setIsSavingEmbedding(true);

    try {
      const payload = {
        provider: embProvider,
        model_name: embModelName.trim(),
        embedding_dimensions: embDimensions,
        base_url: embBaseUrl.trim() || undefined,
      };

      const res = await saveEmbeddingConfig(payload, token);
      if (!res.success) {
        setEmbError(res.error || 'Gagal menyimpan konfigurasi embedding.');
        return;
      }

      onSetEmbeddingConfig(res.data);
      onSetSuccessMsg('Model embedding berhasil disimpan.');
    } catch (err: any) {
      setEmbError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSavingEmbedding(false);
    }
  };

  const options = [...fetchedEmbModels];
  if (embModelName && !options.includes(embModelName) && embModelName !== '__custom__') {
    options.unshift(embModelName);
  }

  return (
    <section
      aria-label="Konfigurasi Model Embedding Dokumen"
      className="p-6 rounded-xl bg-surface-card border border-subtle h-full flex flex-col space-y-6"
    >
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <h2 className="text-sm font-serif tracking-tight text-primary flex items-center gap-2">
          <LayersIcon className="w-4 h-4 text-muted" aria-hidden="true" />
          <span>Embedding</span>
        </h2>
        {embeddingConfig?.locked ? (
          <span className="text-xs font-serif text-muted flex items-center gap-1.5" aria-hidden="true">
            <LockClosedIcon className="w-3.5 h-3.5" /> Terkunci
          </span>
        ) : null}
      </div>

      {/* Lock Warning Banner */}
      {embeddingConfig?.locked ? (
        <p className="text-xs text-muted flex items-center justify-between">
          <span>Model terkunci karena PDF terunggah.</span>
          <Link href="/dashboard" className="text-primary hover:underline font-mono">
            Dashboard &rarr;
          </Link>
        </p>
      ) : null}

      {embError ? (
        <div
          role="alert"
          className="p-3 rounded-md bg-[var(--pastel-red-bg)] border border-[var(--pastel-red-text)]/20 text-[var(--pastel-red-text)] text-xs leading-normal"
        >
          {embError}
        </div>
      ) : null}

      <form onSubmit={handleSaveEmbedding} className="flex-1 space-y-5 flex flex-col">
        {/* Provider Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="embProvider" className="block text-[10px] font-mono uppercase tracking-wider text-muted">
              PROVIDER
            </label>
            {!targetConfigId && !embeddingConfig?.locked ? (
              <span className="text-[9px] font-mono text-[var(--pastel-red-text)]">
                Belum dikonfigurasi di Chat
              </span>
            ) : null}
          </div>
          <select
            id="embProvider"
            disabled={!!embeddingConfig?.locked}
            value={embProvider}
            onChange={(e) => {
              const newProv = e.target.value;
              setEmbProvider(newProv);
              setEmbModelName('');
              setIsCustomModelInput(false);
            }}
            className="minimal-input w-full px-3 py-2 rounded-md text-xs cursor-pointer disabled:opacity-50"
          >
            <option value="gemini" className="bg-surface-card text-primary">Google Gemini</option>
            <option value="openai" className="bg-surface-card text-primary">OpenAI</option>
            <option value="openrouter" className="bg-surface-card text-primary">OpenRouter</option>
            <option value="openai_compatible" className="bg-surface-card text-primary">OpenAI-Compatible</option>
          </select>
        </div>

        {/* Dynamic Model & Dimension Config */}
        <div className="p-3.5 rounded-md bg-surface-card-hover border border-subtle space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="embModelSelect" className="block text-[10px] font-mono uppercase tracking-wider text-muted">
                  MODEL
                </label>
                {isLoadingEmbModels ? (
                  <span className="text-[10px] font-mono text-muted animate-pulse">
                    Loading…
                  </span>
                ) : !targetConfigId ? (
                  <span className="text-[10px] font-mono text-zinc-500/50">
                    Menunggu API Key...
                  </span>
                ) : fetchError ? (
                  <span className="text-[10px] font-mono text-[var(--pastel-red-text)]" title={fetchError}>
                    Error
                  </span>
                ) : null}
              </div>

              {!isCustomModelInput ? (
                <select
                  id="embModelSelect"
                  disabled={!!embeddingConfig?.locked || !targetConfigId}
                  value={embModelName}
                  onChange={(e) => {
                    if (e.target.value === '__custom__') {
                      setIsCustomModelInput(true);
                      setEmbModelName('');
                    } else {
                      setEmbModelName(e.target.value);
                    }
                  }}
                  className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono cursor-pointer disabled:opacity-50"
                >
                  <option value="" disabled>pilih model...</option>
                  {options.map((m) => (
                    <option key={m} value={m} className="bg-surface-card text-primary">
                      {m}
                    </option>
                  ))}
                  <option value="__custom__" className="bg-surface-card text-primary">input custom...</option>
                </select>
              ) : (
                <div className="space-y-1">
                  <input
                    id="embModelNameInput"
                    type="text"
                    disabled={!!embeddingConfig?.locked || !targetConfigId}
                    placeholder="slug model embedding"
                    value={embModelName}
                    onChange={(e) => setEmbModelName(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setIsCustomModelInput(false)}
                    className="text-[10px] text-muted hover:text-primary underline cursor-pointer font-mono"
                  >
                    pilih dari daftar
                  </button>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="embDimensions" className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">
                DIMENSI
              </label>
              <input
                id="embDimensions"
                type="number"
                disabled={!!embeddingConfig?.locked}
                placeholder="768"
                value={embDimensions}
                onChange={(e) => setEmbDimensions(parseInt(e.target.value) || 768)}
                className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono disabled:opacity-50"
              />
            </div>
          </div>

          {embProvider === 'openai_compatible' ? (
            <div>
              <label htmlFor="embBaseUrl" className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">
                BASE URL
              </label>
              <input
                id="embBaseUrl"
                type="url"
                disabled={!!embeddingConfig?.locked}
                placeholder="https://api.groq.com/openai/v1"
                value={embBaseUrl}
                onChange={(e) => setEmbBaseUrl(e.target.value)}
                className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono disabled:opacity-50"
              />
            </div>
          ) : null}
        </div>

        <div className="flex-1" />

        {/* Form Submit */}
        <div className="flex justify-end pt-4 border-t border-subtle mt-auto">
          <button
            type="submit"
            disabled={!!embeddingConfig?.locked || isSavingEmbedding}
            className="minimal-button-primary px-4 py-2 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSavingEmbedding ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Menyimpan…</span>
              </>
            ) : (
              <span>Simpan</span>
            )}
          </button>
        </div>
      </form>
    </section>
  );
}

export default EmbeddingSettingsSection;
