'use client';

import React, { useState } from 'react';
import { Pencil2Icon, LockClosedIcon, PlusIcon, TrashIcon } from '@radix-ui/react-icons';
import { createProviderConfig, deleteProviderConfig, updateProviderConfig } from '@/lib/api';
import type { ProviderConfig } from '@/types';
import ProviderFormCard from './ProviderFormCard';

const getProviderLabel = (type: string) => {
  const map: Record<string, string> = {
    openai: 'OpenAI',
    gemini: 'Google Gemini',
    openrouter: 'OpenRouter',
    openai_compatible: 'OpenAI-Compatible'
  };
  return map[type] || type.charAt(0).toUpperCase() + type.slice(1);
};

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
          <LockClosedIcon className="w-4 h-4 text-muted" aria-hidden="true" />
          <span>Provider Chat</span>
        </h2>
        {!isFormOpen ? (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="minimal-button-primary px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Tambah Provider</span>
          </button>
        ) : null}
      </div>

      {isFormOpen ? (
        <>
          <div 
            className="fixed inset-0 z-40 h-screen w-screen bg-black/5 backdrop-blur-sm transition-opacity cursor-pointer"
            onClick={handleCloseForm}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 right-0 z-50 h-screen w-full max-w-md bg-canvas border-l border-subtle shadow-2xl overflow-y-auto animate-in slide-in-from-right duration-300">
            <div className="p-6 sm:p-8 h-full flex flex-col">
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
        </>
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
              <PlusIcon className="w-3.5 h-3.5" aria-hidden="true" />
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
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-xs text-primary">
                    {config.display_name || getProviderLabel(config.provider)}
                  </span>
                  {config.is_default ? (
                    <span className="text-xs font-serif italic text-muted">
                      (Default)
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-muted">
                  <span>{config.api_key_masked}</span>
                  <span className="text-zinc-500/40">•</span>
                  <span>{config.model_name || 'default'}</span>
                  {config.base_url && (
                    <>
                      <span className="text-zinc-500/40">•</span>
                      <span className="truncate max-w-xs">{config.base_url}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                {!config.is_default ? (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(config)}
                    className="px-2.5 py-1 rounded-md border border-subtle text-xs text-muted hover:text-primary hover:bg-surface-card-hover transition-colors"
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
                  <Pencil2Icon className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(config.id)}
                  aria-label={`Hapus ${config.display_name || config.provider}`}
                  title="Hapus Provider"
                  className="p-1.5 rounded-md border border-subtle text-muted hover:text-rose-500 hover:bg-(--pastel-red-bg) transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" aria-hidden="true" />
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
