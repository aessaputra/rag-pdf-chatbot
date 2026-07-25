'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Lock } from 'lucide-react';
import { saveEmbeddingConfig, verifyAndFetchModels } from '@/lib/api';
import type { EmbeddingConfig } from '@/types';

interface EmbeddingSettingsSectionProps {
  readonly embeddingConfig: EmbeddingConfig | null;
  readonly token: string;
  readonly onSetEmbeddingConfig: (config: EmbeddingConfig) => void;
  readonly onSetSuccessMsg: (msg: string | null) => void;
  readonly onSetErrorMsg: (msg: string | null) => void;
}

export function EmbeddingSettingsSection({
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

  // Dynamic live embedding model fetching state
  const [fetchedEmbModels, setFetchedEmbModels] = useState<string[]>([]);
  const [isLoadingEmbModels, setIsLoadingEmbModels] = useState(false);
  const [isCustomModelInput, setIsCustomModelInput] = useState(false);

  useEffect(() => {
    if (embeddingConfig) {
      setEmbProvider(embeddingConfig.provider);
      setEmbModelName(embeddingConfig.model_name);
      setEmbDimensions(embeddingConfig.embedding_dimensions);
      setEmbBaseUrl(embeddingConfig.base_url || '');
    }
  }, [embeddingConfig]);

  // Fetch live embedding models directly from Provider API endpoint
  useEffect(() => {
    let isCancelled = false;

    if (embeddingConfig?.locked) return;

    async function loadEmbModels() {
      setIsLoadingEmbModels(true);
      const res = await verifyAndFetchModels(
        embProvider,
        undefined,
        embBaseUrl.trim() || undefined,
        undefined,
        token,
        'embedding'
      );

      if (!isCancelled) {
        setIsLoadingEmbModels(false);
        if (res.success && res.data?.models && res.data.models.length > 0) {
          setFetchedEmbModels(res.data.models);
          if (!embModelName && res.data.default_model) {
            setEmbModelName(res.data.default_model);
          }
          if (res.data.probed_dimension) {
            setEmbDimensions(res.data.probed_dimension);
          }
        }
      }
    }

    loadEmbModels();

    return () => {
      isCancelled = true;
    };
  }, [embProvider, embBaseUrl, token, embeddingConfig?.locked]);

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
      className="space-y-4 pt-4 border-t border-subtle"
    >
      <div className="flex items-center justify-between border-b border-subtle pb-3">
        <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span>EMBEDDING</span>
        </h2>
        {embeddingConfig?.locked ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)] border border-[var(--pastel-yellow-text)]/20 flex items-center gap-1">
            <Lock className="w-3 h-3 text-[var(--pastel-yellow-text)]" aria-hidden="true" /> TERKUNCI
          </span>
        ) : null}
      </div>

      {/* Lock Warning Banner */}
      {embeddingConfig?.locked ? (
        <div className="p-3 rounded-md bg-surface-card border border-subtle text-xs flex items-center justify-between text-muted">
          <span>Model embedding terkunci karena dokumen PDF terunggah.</span>
          <Link href="/dashboard" className="text-xs text-primary hover:underline shrink-0 ml-2 font-mono">
            Dashboard &rarr;
          </Link>
        </div>
      ) : null}

      {embError ? (
        <div
          role="alert"
          className="p-3 rounded-md bg-[var(--pastel-red-bg)] border border-[var(--pastel-red-text)]/20 text-[var(--pastel-red-text)] text-xs leading-normal"
        >
          {embError}
        </div>
      ) : null}

      <form onSubmit={handleSaveEmbedding} className="p-5 rounded-md bg-surface-card border border-subtle space-y-4">
        {/* Provider Selection */}
        <div>
          <label htmlFor="embProvider" className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">
            PROVIDER
          </label>
          <select
            id="embProvider"
            disabled={!!embeddingConfig?.locked}
            value={embProvider}
            onChange={(e) => {
              setEmbProvider(e.target.value);
              setFetchedEmbModels([]);
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

        {/* Dynamic Live Model & Dimension Config */}
        <div className="p-3.5 rounded-md bg-surface-card-hover border border-subtle space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="embModelSelect" className="block text-[10px] font-mono uppercase tracking-wider text-muted">
                  MODEL
                </label>
                {isLoadingEmbModels ? (
                  <span className="text-[10px] text-amber-500 font-mono animate-pulse">
                    Memuat…
                  </span>
                ) : fetchedEmbModels.length > 0 ? (
                  <span className="text-[10px] text-[var(--pastel-green-text)] font-mono font-medium">
                    ● LIVE ({fetchedEmbModels.length})
                  </span>
                ) : null}
              </div>

              {!isCustomModelInput ? (
                <select
                  id="embModelSelect"
                  disabled={!!embeddingConfig?.locked}
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
                  {options.length === 0 ? (
                    <option value="" disabled>
                      {isLoadingEmbModels ? 'Memuat model…' : 'Pilih Model…'}
                    </option>
                  ) : (
                    <option value="" disabled>Pilih Model…</option>
                  )}

                  {options.map((m) => (
                    <option key={m} value={m} className="bg-surface-card text-primary">
                      {m}
                    </option>
                  ))}
                  <option value="__custom__" className="bg-surface-card text-primary">Input Custom…</option>
                </select>
              ) : (
                <div className="space-y-1">
                  <input
                    id="embModelNameInput"
                    type="text"
                    disabled={!!embeddingConfig?.locked}
                    placeholder="Slug model embedding"
                    value={embModelName}
                    onChange={(e) => setEmbModelName(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono disabled:opacity-50"
                  />
                  {fetchedEmbModels.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setIsCustomModelInput(false)}
                      className="text-[10px] text-muted hover:text-primary underline cursor-pointer font-mono"
                    >
                      Pilih dari daftar
                    </button>
                  ) : null}
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

        {/* Form Submit */}
        <div className="flex justify-end pt-2 border-t border-subtle">
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
