'use client';

import React, { useEffect, useState, useDeferredValue } from 'react';
import useSWR from 'swr';
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
  const [isCustomModel, setIsCustomModel] = useState(false);

  const deferredApiKey = useDeferredValue(formApiKey.trim());
  const deferredBaseUrl = useDeferredValue(formBaseUrl.trim());

  const fetcherKey = ['verifyAndFetchModels', formProvider, deferredApiKey, deferredBaseUrl, editingConfigId, token, 'chat'];

  const fetcher = async ([, prov, key, url, cid, tok, type]: any) => {
    return verifyAndFetchModels(prov, key || undefined, url || undefined, cid || undefined, tok, type);
  };

  const { data: res, isLoading: isLoadingModels } = useSWR(fetcherKey, fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 60000,
  });

  const fetchedModels = res?.success && res.data?.models ? res.data.models : [];
  const fetchError = res?.error || res?.data?.error || null;

  useEffect(() => {
    if (res?.success && res.data?.models && res.data.models.length > 0) {
      setFormModelName((current) => current ? current : (res.data.default_model || ''));
    }
  }, [res]);

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
        setFormError('Nama model wajib diisi untuk OpenAI-Compatible.');
        return;
      }
    } else if (formProvider === 'openrouter') {
      if (!formModelName.trim()) {
        setFormError('Nama model wajib diisi untuk OpenRouter.');
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

  // Build model options dynamically from API response
  const options = [...fetchedModels];
  if (formModelName && !options.includes(formModelName) && formModelName !== '__custom__') {
    options.unshift(formModelName);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <h3 className="text-sm font-serif tracking-tight text-primary">
          {editingConfigId ? 'EDIT PROVIDER' : 'TAMBAH PROVIDER'}
        </h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted hover:text-primary transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400 rounded px-1.5 py-0.5"
        >
          Batal
        </button>
      </div>

      {formError ? (
        <div
          role="alert"
          className="p-3 rounded-md bg-(--pastel-red-bg) border border-(--pastel-red-text)/20 text-(--pastel-red-text) text-xs leading-normal"
        >
          {formError}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Provider Selector */}
        <div>
          <label className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">
            PROVIDER
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PROVIDER_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                type="button"
                disabled={!!editingConfigId}
                onClick={() => {
                  setFormProvider(opt.type);
                  setFormModelName('');
                  setIsCustomModel(false);
                }}
                className={`text-left px-3 py-2 rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                  formProvider === opt.type
                    ? 'bg-surface-card-hover border-primary text-primary'
                    : 'bg-surface-card border-subtle text-secondary hover:text-primary hover:bg-surface-card-hover/50'
                } ${editingConfigId ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Display Name */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="formDisplayName" className="block text-[10px] font-mono uppercase tracking-wider text-muted">
              LABEL
            </label>
            <span className="text-[9px] font-mono text-muted/50">
              opsional
            </span>
          </div>
          <input
            id="formDisplayName"
            type="text"
            placeholder="nama tampilan..."
            value={formDisplayName}
            onChange={(e) => setFormDisplayName(e.target.value)}
            className="minimal-input w-full px-3 py-2 rounded-md text-xs font-sans"
          />
        </div>

        {/* API Key */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="formApiKey" className="block text-[10px] font-mono uppercase tracking-wider text-muted">
              KUNCI API
            </label>
            <span className="text-[9px] font-mono text-muted/50">
              {editingConfigId ? 'tersimpan' : 'wajib'}
            </span>
          </div>
          <input
            id="formApiKey"
            type="password"
            autoComplete="new-password"
            placeholder={editingConfigId ? '••••••••' : 'kunci api...'}
            value={formApiKey}
            onChange={(e) => setFormApiKey(e.target.value)}
            className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono"
          />
        </div>

        {/* Conditional Base URL for OpenAI-Compatible */}
        {formProvider === 'openai_compatible' ? (
          <div>
            <label htmlFor="formBaseUrl" className="block text-[10px] font-mono uppercase tracking-wider text-muted mb-1.5">
              BASE URL
            </label>
            <input
              id="formBaseUrl"
              type="url"
              placeholder="https://api.groq.com/openai/v1"
              value={formBaseUrl}
              onChange={(e) => setFormBaseUrl(e.target.value)}
              className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono"
            />
          </div>
        ) : null}

        {/* 100% Dynamic Live Model Selector */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="formModelSelect" className="block text-[10px] font-mono uppercase tracking-wider text-muted">
              MODEL
            </label>
            {isLoadingModels ? (
              <span className="text-[10px] font-mono text-muted animate-pulse">
                Loading…
              </span>
            ) : fetchError ? (
              <span className="text-[10px] font-mono text-(--pastel-red-text)" title={fetchError}>
                Error
              </span>
            ) : null}
          </div>

          {!isCustomModel ? (
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
              className={`minimal-input w-full px-3 py-2 rounded-md text-xs font-mono bg-surface-card cursor-pointer focus-visible:ring-2 ${
                fetchError 
                  ? 'border-(--pastel-red-bg) text-(--pastel-red-text) focus-visible:ring-(--pastel-red-text)/30' 
                  : 'border-subtle text-primary focus-visible:ring-zinc-400'
              }`}
            >
              {options.length === 0 ? (
                <option value="" disabled>
                  {isLoadingModels
                    ? 'memuat model...'
                    : fetchError
                    ? fetchError
                    : 'pilih model...'}
                </option>
              ) : (
                <option value="" disabled>pilih model...</option>
              )}

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
                id="formModelNameInput"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder="slug model"
                value={formModelName}
                onChange={(e) => setFormModelName(e.target.value)}
                className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setIsCustomModel(false)}
                className="text-[10px] text-muted hover:text-primary underline cursor-pointer font-mono"
              >
                pilih dari daftar
              </button>
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
            className="rounded border-subtle bg-surface-card text-primary focus:ring-1 focus:ring-zinc-400 cursor-pointer"
          />
          <label htmlFor="formIsDefault" className="text-xs text-secondary cursor-pointer select-none">
            Default
          </label>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-subtle">
          <button
            type="button"
            onClick={onCancel}
            className="px-3.5 py-1.5 rounded-md border border-subtle text-xs text-muted hover:text-primary hover:bg-surface-card-hover transition-colors cursor-pointer"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="minimal-button-primary px-4 py-1.5 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
          >
            {isSubmitting ? (
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
    </div>
  );
}

export default ProviderFormCard;
