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
    <section aria-label="Konfigurasi Provider Chat LLM" className="p-6 rounded-xl bg-surface-card border border-subtle h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <h2 className="text-sm font-serif tracking-tight text-primary flex items-center gap-2">
          <Key className="w-4 h-4 text-muted" aria-hidden="true" />
          <span>Provider Chat</span>
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
        <div className="fixed inset-0 z-50 flex justify-end">
          <div 
            className="fixed inset-0 bg-black/5 backdrop-blur-[2px] transition-opacity cursor-pointer"
            onClick={handleCloseForm}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md bg-canvas h-full border-l border-subtle shadow-2xl overflow-y-auto z-10 animate-in slide-in-from-right duration-300">
            <div className="p-8">
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
            </div>
          </div>
        </div>
      ) : null}

      {configs.length === 0 ? (
        <div className="p-6 rounded-lg bg-canvas border border-subtle text-center space-y-3 flex-1 flex flex-col items-center justify-center">
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
        <div className="space-y-3 flex-1">
          {configs.map((config) => (
            <div
              key={config.id}
              className="p-4 rounded-lg bg-canvas border border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-zinc-400 transition-colors"
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
                    <span className="text-[10px] font-serif italic text-muted">
                      (Default)
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-muted">
                  <span>Kunci: {config.api_key_masked}</span>
                  <span>
                    Model: {config.model_name || 'Model Default Provider'}
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
