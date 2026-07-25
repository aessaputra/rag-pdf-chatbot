'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Layers, Lock } from 'lucide-react';
import { saveEmbeddingConfig, verifyAndFetchModels } from '@/lib/api';
import type { EmbeddingConfig, EmbeddingPreset } from '@/types';

interface EmbeddingSettingsSectionProps {
  readonly embeddingConfig: EmbeddingConfig | null;
  readonly presets: EmbeddingPreset[];
  readonly token: string;
  readonly onSetEmbeddingConfig: (config: EmbeddingConfig) => void;
  readonly onSetSuccessMsg: (msg: string | null) => void;
  readonly onSetErrorMsg: (msg: string | null) => void;
}

export function EmbeddingSettingsSection({
  embeddingConfig,
  presets,
  token,
  onSetEmbeddingConfig,
  onSetSuccessMsg,
  onSetErrorMsg,
}: EmbeddingSettingsSectionProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gemini-embedding-001');
  const [isCustomEmbedding, setIsCustomEmbedding] = useState(false);
  const [embProvider, setEmbProvider] = useState<string>('gemini');
  const [embModelName, setEmbModelName] = useState<string>('models/gemini-embedding-001');
  const [embDimensions, setEmbDimensions] = useState<number>(768);
  const [embBaseUrl, setEmbBaseUrl] = useState<string>('');
  const [embError, setEmbError] = useState<string | null>(null);
  const [isSavingEmbedding, setIsSavingEmbedding] = useState(false);

  // Dynamic live embedding model fetching state
  const [fetchedEmbModels, setFetchedEmbModels] = useState<string[]>([]);
  const [isLoadingEmbModels, setIsLoadingEmbModels] = useState(false);

  useEffect(() => {
    if (embeddingConfig) {
      setEmbProvider(embeddingConfig.provider);
      setEmbModelName(embeddingConfig.model_name);
      setEmbDimensions(embeddingConfig.embedding_dimensions);
      setEmbBaseUrl(embeddingConfig.base_url || '');

      const matchedPreset = presets.find(
        (p) =>
          p.model_name === embeddingConfig.model_name &&
          p.embedding_dimensions === embeddingConfig.embedding_dimensions
      );
      if (matchedPreset) {
        setSelectedPresetId(matchedPreset.id);
        setIsCustomEmbedding(false);
      } else {
        setSelectedPresetId('custom');
        setIsCustomEmbedding(true);
      }
    }
  }, [embeddingConfig, presets]);

  // Fetch live embedding models when provider or custom mode changes
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
        if (res.success && res.data?.models) {
          setFetchedEmbModels(res.data.models);
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

  const handlePresetChange = (presetId: string) => {
    setSelectedPresetId(presetId);
    setEmbError(null);

    if (presetId === 'custom') {
      setIsCustomEmbedding(true);
      return;
    }

    setIsCustomEmbedding(false);
    const preset = presets.find((p) => p.id === presetId);
    if (preset) {
      setEmbProvider(preset.provider);
      setEmbModelName(preset.model_name);
      setEmbDimensions(preset.embedding_dimensions);
    }
  };

  const handleModelSelectionChange = (modelName: string) => {
    setEmbModelName(modelName);

    if (modelName.includes('large')) {
      setEmbDimensions(3072);
    } else if (modelName.includes('small') || modelName.includes('ada')) {
      setEmbDimensions(1536);
    } else if (modelName.includes('gemini')) {
      setEmbDimensions(768);
    }
  };

  const handleSaveEmbedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (embeddingConfig?.locked) return;

    setEmbError(null);
    onSetErrorMsg(null);
    onSetSuccessMsg(null);

    if (!embModelName.trim()) {
      setEmbError('Nama Model Embedding wajib diisi.');
      return;
    }
    if (!embDimensions || embDimensions < 64) {
      setEmbError('Dimensi Vektor minimal 64.');
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

  return (
    <section
      aria-label="Konfigurasi Model Embedding Dokumen"
      className="space-y-4 pt-4 border-t border-subtle"
    >
      <div className="flex items-center justify-between border-b border-subtle pb-3">
        <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span>MODEL EMBEDDING</span>
        </h2>
        {embeddingConfig?.locked ? (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[var(--pastel-yellow-bg)] text-[var(--pastel-yellow-text)] border border-[var(--pastel-yellow-text)]/20 flex items-center gap-1">
            <Lock className="w-3 h-3 text-[var(--pastel-yellow-text)]" aria-hidden="true" /> Terkunci
          </span>
        ) : null}
      </div>

      {/* Lock Warning Banner */}
      {embeddingConfig?.locked ? (
        <div className="p-3 rounded-md bg-surface-card border border-subtle text-xs flex items-center justify-between text-muted">
          <span>Model embedding terkunci karena dokumen PDF sudah terunggah.</span>
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
        {/* Preset & Provider Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="presetSelect" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
              PRESET EMBEDDING
            </label>
            <select
              id="presetSelect"
              disabled={!!embeddingConfig?.locked}
              value={selectedPresetId}
              onChange={(e) => handlePresetChange(e.target.value)}
              className="minimal-input w-full px-3 py-2 rounded-md text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id} className="bg-surface-card text-primary">
                  {preset.name}
                </option>
              ))}
              <option value="custom" className="bg-surface-card text-primary">
                Custom / Dynamic Live Fetch
              </option>
            </select>
          </div>

          <div>
            <label htmlFor="embProvider" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
              PROVIDER
            </label>
            <select
              id="embProvider"
              disabled={!!embeddingConfig?.locked}
              value={embProvider}
              onChange={(e) => {
                setEmbProvider(e.target.value);
                setFetchedEmbModels([]);
              }}
              className="minimal-input w-full px-3 py-2 rounded-md text-xs disabled:opacity-50"
            >
              <option value="gemini" className="bg-surface-card text-primary">Google Gemini</option>
              <option value="openai" className="bg-surface-card text-primary">OpenAI</option>
              <option value="openrouter" className="bg-surface-card text-primary">OpenRouter</option>
              <option value="openai_compatible" className="bg-surface-card text-primary">OpenAI-Compatible</option>
            </select>
          </div>
        </div>

        {/* Dynamic Model & Dimension Config */}
        <div className="p-3.5 rounded-md bg-surface-card-hover border border-subtle space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="embModelSelect" className="block text-[11px] font-mono uppercase tracking-wider text-muted">
                  MODEL EMBEDDING
                </label>
                {isLoadingEmbModels ? (
                  <span className="text-[10px] text-amber-500 font-mono animate-pulse">
                    Memuat model…
                  </span>
                ) : fetchedEmbModels.length > 0 ? (
                  <span className="text-[10px] text-[var(--pastel-green-text)] font-mono">
                    {fetchedEmbModels.length} model resmi
                  </span>
                ) : null}
              </div>

              {fetchedEmbModels.length > 0 && !isCustomEmbedding ? (
                <select
                  id="embModelSelect"
                  disabled={!!embeddingConfig?.locked}
                  value={embModelName}
                  onChange={(e) => handleModelSelectionChange(e.target.value)}
                  className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono disabled:opacity-50"
                >
                  {fetchedEmbModels.map((m) => (
                    <option key={m} value={m} className="bg-surface-card text-primary">
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="embModelNameInput"
                  type="text"
                  disabled={!!embeddingConfig?.locked}
                  placeholder="models/gemini-embedding-001"
                  value={embModelName}
                  onChange={(e) => handleModelSelectionChange(e.target.value)}
                  className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono disabled:opacity-50"
                />
              )}
            </div>

            <div>
              <label htmlFor="embDimensions" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                DIMENSI VEKTOR
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
              <label htmlFor="embBaseUrl" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
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
            className="minimal-button-primary px-4 py-1.5 rounded-md text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isSavingEmbedding ? <span>Menyimpan…</span> : <span>Simpan Embedding</span>}
          </button>
        </div>
      </form>
    </section>
  );
}

export default EmbeddingSettingsSection;
