'use client';

import React, { useState } from 'react';
import type { ProviderType } from '@/types';

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
                onClick={() => setFormProvider(opt.type)}
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

        {/* Conditional Model Name */}
        {(formProvider === 'openrouter' || formProvider === 'openai_compatible' || formProvider === 'openai') ? (
          <div>
            <label htmlFor="formModelName" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
              SLUG MODEL
            </label>
            <input
              id="formModelName"
              type="text"
              autoComplete="off"
              spellCheck={false}
              placeholder={
                formProvider === 'openrouter'
                  ? 'meta-llama/llama-3.3-70b-instruct'
                  : formProvider === 'openai_compatible'
                  ? 'llama-3.3-70b-versatile'
                  : 'gpt-4o-mini'
              }
              value={formModelName}
              onChange={(e) => setFormModelName(e.target.value)}
              className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono"
            />
          </div>
        ) : null}

        {/* Conditional Base URL */}
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
