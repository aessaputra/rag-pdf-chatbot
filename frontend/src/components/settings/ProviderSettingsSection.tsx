'use client';

import React, { useState } from 'react';
import { Edit3, Key, Plus, Trash2 } from 'lucide-react';
import { createProviderConfig, deleteProviderConfig, updateProviderConfig } from '@/lib/api';
import type { ProviderConfig } from '@/types';
import ProviderFormCard from './ProviderFormCard';

interface ProviderSettingsSectionProps {
  readonly configs: ProviderConfig[];
  readonly token: string;
  readonly onReloadConfigs: () => Promise<void>;
  readonly onSetSuccessMsg: (msg: string | null) => void;
  readonly onSetErrorMsg: (msg: string | null) => void;
}

export function ProviderSettingsSection({
  configs,
  token,
  onReloadConfigs,
  onSetSuccessMsg,
  onSetErrorMsg,
}: ProviderSettingsSectionProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ProviderConfig | null>(null);

  const handleOpenCreate = () => {
    setEditingConfig(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (config: ProviderConfig) => {
    setEditingConfig(config);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingConfig(null);
  };

  const handleSave = async (payload: any, editingId: string | null): Promise<boolean> => {
    onSetErrorMsg(null);
    onSetSuccessMsg(null);

    try {
      if (editingId) {
        const res = await updateProviderConfig(editingId, payload, token);
        if (!res.success) {
          onSetErrorMsg(res.error || 'Gagal memperbarui provider.');
          return false;
        }
        onSetSuccessMsg('Provider berhasil diperbarui.');
      } else {
        const res = await createProviderConfig(payload, token);
        if (!res.success) {
          onSetErrorMsg(res.error || 'Gagal menambahkan provider.');
          return false;
        }
        onSetSuccessMsg('Provider berhasil ditambahkan.');
      }

      await onReloadConfigs();
      handleCloseForm();
      return true;
    } catch (err: any) {
      onSetErrorMsg(err.message || 'Terjadi kesalahan sistem.');
      return false;
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus konfigurasi provider ini?')) return;

    onSetErrorMsg(null);
    onSetSuccessMsg(null);

    const res = await deleteProviderConfig(id, token);
    if (res.success) {
      onSetSuccessMsg('Provider berhasil dihapus.');
      await onReloadConfigs();
    } else {
      onSetErrorMsg(res.error || 'Gagal menghapus provider.');
    }
  };

  const handleSetDefault = async (config: ProviderConfig) => {
    if (config.is_default) return;

    onSetErrorMsg(null);
    onSetSuccessMsg(null);

    const res = await updateProviderConfig(config.id, { is_default: true }, token);
    if (res.success) {
      onSetSuccessMsg('Provider default diubah.');
      await onReloadConfigs();
    } else {
      onSetErrorMsg(res.error || 'Gagal mengubah provider default.');
    }
  };

  return (
    <section aria-label="Konfigurasi Provider Chat LLM" className="space-y-4">
      <div className="flex items-center justify-between border-b border-subtle pb-3">
        <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted flex items-center gap-2">
          <Key className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
          <span>PROVIDER CHAT</span>
        </h2>
        {!isFormOpen ? (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="minimal-button-primary px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tambah Provider</span>
          </button>
        ) : null}
      </div>

      {isFormOpen ? (
        <ProviderFormCard
          editingConfigId={editingConfig?.id || null}
          initialProvider={editingConfig?.provider}
          initialDisplayName={editingConfig?.display_name || ''}
          initialModelName={editingConfig?.model_name || ''}
          initialBaseUrl={editingConfig?.base_url || ''}
          initialIsDefault={editingConfig?.is_default || false}
          token={token}
          onSave={handleSave}
          onCancel={handleCloseForm}
        />
      ) : null}

      {configs.length === 0 ? (
        <div className="p-6 rounded-md bg-surface-card border border-subtle text-center space-y-3">
          <p className="text-xs text-muted">Belum ada AI Provider yang dikonfigurasi.</p>
          {!isFormOpen ? (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="minimal-button-primary px-3.5 py-1.5 rounded-md text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Tambah Provider</span>
            </button>
          ) : null}
        </div>
      ) : (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.id}
              className="p-3.5 rounded-md bg-surface-card border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-400 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-primary">
                    {config.display_name || config.provider.toUpperCase()}
                  </span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface-card-hover text-muted border border-subtle">
                    {config.provider}
                  </span>
                  {config.is_default ? (
                    <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[var(--pastel-green-bg)] text-[var(--pastel-green-text)] border border-[var(--pastel-green-text)]/20">
                      DEFAULT
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted">
                  <span>Kunci: {config.api_key_masked}</span>
                  <span>
                    Model: {config.model_name || (config.provider === 'gemini' ? 'gemini-2.5-flash' : config.provider === 'openai' ? 'gpt-4o-mini' : config.provider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'default')}
                  </span>
                  {config.base_url ? (
                    <span className="truncate max-w-xs">URL: {config.base_url}</span>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {!config.is_default ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(config)}
                    className="px-2.5 py-1 rounded-md border border-subtle text-[11px] text-muted hover:text-primary hover:bg-surface-card-hover transition-colors"
                  >
                    Set Default
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => handleOpenEdit(config)}
                  aria-label={`Edit ${config.display_name || config.provider}`}
                  title="Edit Provider"
                  className="p-1.5 rounded-md border border-subtle text-muted hover:text-primary hover:bg-surface-card-hover transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(config.id)}
                  aria-label={`Hapus ${config.display_name || config.provider}`}
                  title="Hapus Provider"
                  className="p-1.5 rounded-md border border-subtle text-muted hover:text-rose-500 hover:bg-[var(--pastel-red-bg)] transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProviderSettingsSection;
