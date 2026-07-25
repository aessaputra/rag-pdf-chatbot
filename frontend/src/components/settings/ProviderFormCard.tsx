'use client';

import React, { useEffect, useState } from 'react';
import type { ProviderType } from '@/types';
import { verifyAndFetchModels } from '@/lib/api';

const PROVIDER_OPTIONS: { type: ProviderType; label: string }[] = [
  { type: 'gemini', label: 'Google Gemini' },
  { type: 'openai', label: 'OpenAI' },
  { type: 'openrouter', label: 'OpenRouter' },
  { type: 'openai_compatible', label: 'OpenAI-Compatible' },
];

interface ProviderFormCardProps {
  readonly editingConfigId: string | null;
  readonly initialProvider?: ProviderType;
  readonly initialDisplayName?: string;
  readonly initialModelName?: string;
  readonly initialBaseUrl?: string;
  readonly initialIsDefault?: boolean;
  readonly token: string;
  readonly onSave: (payload: any, editingId: string | null) => Promise<boolean>;
  readonly onCancel: () => void;
}

export function ProviderFormCard({
  editingConfigId,
  initialProvider = 'gemini',
  initialDisplayName = '',
  initialModelName = '',
  initialBaseUrl = '',
  initialIsDefault = false,
  token,
  onSave,
  onCancel,
}: ProviderFormCardProps) {
  const [formProvider, setFormProvider] = useState<ProviderType>(initialProvider);
  const [formApiKey, setFormApiKey] = useState('');
  const [formDisplayName, setFormDisplayName] = useState(initialDisplayName);
  const [formModelName, setFormModelName] = useState(initialModelName);
  const [formBaseUrl, setFormBaseUrl] = useState(initialBaseUrl);
  const [formIsDefault, setFormIsDefault] = useState(initialIsDefault);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Dynamic model fetching state
  const [fetchedModels, setFetchedModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isCustomModel, setIsCustomModel] = useState(false);

  // Auto-fetch available models via debounced API key/config verification
  useEffect(() => {
    let isCancelled = false;

    // Trigger if API key is provided OR when editing an existing config
    const shouldFetch = (formApiKey.trim().length > 3) || Boolean(editingConfigId);

    if (!shouldFetch) {
      setFetchedModels([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoadingModels(true);
      const res = await verifyAndFetchModels(
        formProvider,
        formApiKey.trim() || undefined,
        formBaseUrl.trim() || undefined,
        editingConfigId || undefined,
        token
      );

      if (!isCancelled) {
        setIsLoadingModels(false);
        if (res.success && res.data?.models) {
          setFetchedModels(res.data.models);
          // If current model_name isn't set, default to first available model
          if (!formModelName && res.data.default_model) {
            setFormModelName(res.data.default_model);
          }
        }
      }
    }, 600);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [formProvider, formApiKey, formBaseUrl, editingConfigId, token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!editingConfigId && !formApiKey.trim()) {
      setFormError('Kunci API wajib diisi.');
      return;
    }

    if (formProvider === 'openai_compatible') {
      if (!formBaseUrl.trim()) {
        setFormError('Base URL wajib diisi untuk OpenAI-Compatible.');
        return;
      }
      if (!formModelName.trim()) {
        setFormError('Nama Model wajib diisi untuk OpenAI-Compatible.');
        return;
      }
    } else if (formProvider === 'openrouter') {
      if (!formModelName.trim()) {
        setFormError('Nama Model wajib diisi untuk OpenRouter.');
        return;
      }
    }

    setIsSubmitting(true);

    const payload: any = editingConfigId
      ? {
          display_name: formDisplayName.trim() || undefined,
          base_url: formBaseUrl.trim() || undefined,
          model_name: formModelName.trim() || undefined,
          is_default: formIsDefault,
          ...(formApiKey.trim() ? { api_key: formApiKey.trim() } : {}),
        }
      : {
          provider: formProvider,
          api_key: formApiKey.trim(),
          display_name: formDisplayName.trim() || undefined,
          base_url: formBaseUrl.trim() || undefined,
          model_name: formModelName.trim() || undefined,
          is_default: formIsDefault,
        };

    const success = await onSave(payload, editingConfigId);
    setIsSubmitting(false);

    if (!success) {
      setFormError('Gagal menyimpan konfigurasi provider.');
    }
  };

  return (
    <div className="p-5 rounded-md bg-surface-card border border-subtle space-y-4">
      <div className="flex items-center justify-between border-b border-subtle pb-3">
        <h3 className="text-xs font-mono uppercase tracking-wider text-primary">
          {editingConfigId ? 'EDIT PROVIDER' : 'TAMBAH PROVIDER'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted hover:text-primary px-2 py-1 rounded focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Batal
        </button>
      </div>

      {formError ? (
        <div role="alert" className="p-3 rounded-md bg-[var(--pastel-red-bg)] border border-[var(--pastel-red-text)]/20 text-[var(--pastel-red-text)] text-xs leading-normal">
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Selector Grid */}
        <div className="space-y-1.5">
          <label className="block text-[11px] font-mono uppercase tracking-wider text-muted">
            PILIH PROVIDER
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDER_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                disabled={!!editingConfigId}
                onClick={() => {
                  setFormProvider(opt.type);
                  setFetchedModels([]);
                  setIsCustomModel(false);
                }}
                className={`text-left px-3 py-2.5 rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  formProvider === opt.type
                    ? 'bg-surface-card-hover border-primary text-primary'
                    : 'bg-surface-card border-subtle text-muted hover:border-zinc-400'
                } ${editingConfigId ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <label htmlFor="formDisplayName" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
            LABEL
          </label>
          <input
            id="formDisplayName"
            type="text"
            autoComplete="off"
            spellCheck={false}
            placeholder="Nama opsi (opsional)"
            value={formDisplayName}
            onChange={(e) => setFormDisplayName(e.target.value)}
            className="minimal-input w-full px-3 py-2 rounded-md text-xs"
          />
        </div>

        {/* API Key */}
        <div>
          <label htmlFor="formApiKey" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
            KUNCI API
          </label>
          <input
            id="formApiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder={editingConfigId ? '••••••••' : 'Kunci API rahasia'}
            value={formApiKey}
            onChange={(e) => setFormApiKey(e.target.value)}
            className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono"
          />
        </div>

        {/* Conditional Base URL for OpenAI-Compatible */}
        {formProvider === 'openai_compatible' ? (
          <div>
            <label htmlFor="formBaseUrl" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
              BASE URL
            </label>
            <input
              id="formBaseUrl"
              type="url"
              autoComplete="off"
              spellCheck={false}
              placeholder="https://api.groq.com/openai/v1"
              value={formBaseUrl}
              onChange={(e) => setFormBaseUrl(e.target.value)}
              className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono"
            />
          </div>
        ) : null}

        {/* Dynamic Model Selection */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="formModelSelect" className="block text-[11px] font-mono uppercase tracking-wider text-muted">
              MODEL LLM
            </label>
            {isLoadingModels ? (
              <span className="text-[10px] text-amber-500 font-mono animate-pulse">
                Memuat daftar model…
              </span>
            ) : fetchedModels.length > 0 ? (
              <span className="text-[10px] text-[var(--pastel-green-text)] font-mono">
                {fetchedModels.length} model resmi tersedia
              </span>
            ) : null}
          </div>

          {fetchedModels.length > 0 && !isCustomModel ? (
            <select
              id="formModelSelect"
              value={formModelName}
              onChange={(e) => {
                if (e.target.value === '__custom__') {
                  setIsCustomModel(true);
                  setFormModelName('');
                } else {
                  setFormModelName(e.target.value);
                }
              }}
              className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono bg-surface-card text-primary border border-subtle"
            >
              <option value="" disabled>-- Pilih Model --</option>
              {fetchedModels.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
              <option value="__custom__">-- Input Slug Custom --</option>
            </select>
          ) : (
            <div className="space-y-1">
              <input
                id="formModelNameInput"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="Slug Model (contoh: diproses otomatis via Verifikasi API)"
                value={formModelName}
                onChange={(e) => setFormModelName(e.target.value)}
                className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono"
              />
              {fetchedModels.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsCustomModel(false)}
                  className="text-[10px] text-muted hover:text-primary underline"
                >
                  Kembali ke daftar model resmi
                </button>
              ) : null}
            </div>
          )}
        </div>

        {/* Is Default */}
        <div className="flex items-center gap-2 pt-1">
          <input
            id="formIsDefault"
            type="checkbox"
            checked={formIsDefault}
            onChange={(e) => setFormIsDefault(e.target.checked)}
            className="rounded border-subtle bg-surface-card text-primary focus:ring-1 focus:ring-zinc-400"
          />
          <label htmlFor="formIsDefault" className="text-xs text-secondary cursor-pointer">
            Jadikan provider default
          </label>
        </div>

        {/* Form Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md text-xs text-muted hover:text-primary"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="minimal-button-primary px-4 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5"
          >
            {isSubmitting ? <span>Menyimpan…</span> : <span>Simpan</span>}
          </button>
        </div>
      </form>
    </div>
  );
}

export default ProviderFormCard;
