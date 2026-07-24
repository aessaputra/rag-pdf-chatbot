# Redesign Settings Utilitarian Minimalist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign `frontend/src/app/dashboard/settings/page.tsx` into a zero-clutter, utilitarian minimalist page following `/minimalist-ui`, `/redesign-existing-projects`, and `/web-design-guidelines`.

**Architecture:** Refactor `SettingsPage` UI markup and UX copy. Strip out long security intro banners, paragraph descriptions under provider choices, and verbose warning text while preserving all API integration logic (`listProviderConfigs`, `createProviderConfig`, `updateProviderConfig`, `deleteProviderConfig`, `listEmbeddingPresets`, `getEmbeddingConfig`, `saveEmbeddingConfig`).

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React icons, `@supabase/ssr`.

## Global Constraints

- **Language & UX Copy**: Indonesian, super direct, monospace uppercase labels (`PROVIDER CHAT`, `MODEL EMBEDDING`, `PILIH PROVIDER`, `LABEL`, `KUNCI API`, `SLUG MODEL`, `BASE URL`). Zero marketing fluff or redundant banners.
- **Utilitarian Layout**: Container width `max-w-3xl`, surface `#121215`, borders `border-[#232326]`, dark canvas `#09090b`.
- **Performance**: Strict TypeScript types, explicit ternary conditional rendering (`rendering-conditional-render`), zero inline component definitions (`rerender-no-inline-components`), early exits (`js-early-exit`).

---

### Task 1: Refactor `SettingsPage` UI & UX Copy in `frontend/src/app/dashboard/settings/page.tsx`

**Files:**
- Modify: `frontend/src/app/dashboard/settings/page.tsx:1-810`

**Interfaces:**
- Consumes: `@/lib/api`, `@/types`, `@/lib/supabaseClient`
- Produces: Minimalist `SettingsPage` component with zero UX copy clutter.

- [ ] **Step 1: Update `PROVIDER_OPTIONS` and refactor `SettingsPage` component**

Replace the contents of `frontend/src/app/dashboard/settings/page.tsx` with the zero-clutter minimalist implementation:

```tsx
'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Check, Plus, Trash2, Edit3, Key,
  AlertCircle, Lock, Layers
} from 'lucide-react';
import { createClient } from '@/lib/supabaseClient';
import {
  createProviderConfig, deleteProviderConfig, getEmbeddingConfig, listEmbeddingPresets,
  listProviderConfigs, saveEmbeddingConfig, updateProviderConfig
} from '@/lib/api';
import type { EmbeddingConfig, EmbeddingPreset, ProviderConfig, ProviderType, UserPayload } from '@/types';

function createUserPayload(id: string, email: string | undefined): UserPayload {
  return { user_id: id, email: email || '', role: 'authenticated' };
}

const PROVIDER_OPTIONS: { type: ProviderType; label: string }[] = [
  { type: 'gemini', label: 'Google Gemini' },
  { type: 'openai', label: 'OpenAI' },
  { type: 'openrouter', label: 'OpenRouter' },
  { type: 'openai_compatible', label: 'OpenAI-Compatible' },
];

export default function SettingsPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [configs, setConfigs] = useState<ProviderConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Provider Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null);
  const [formProvider, setFormProvider] = useState<ProviderType>('gemini');
  const [formApiKey, setFormApiKey] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formModelName, setFormModelName] = useState('');
  const [formBaseUrl, setFormBaseUrl] = useState('');
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Embedding Config State
  const [presets, setPresets] = useState<EmbeddingPreset[]>([]);
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('gemini-768');
  const [isCustomEmbedding, setIsCustomEmbedding] = useState(false);
  const [embProvider, setEmbProvider] = useState<string>('gemini');
  const [embModelName, setEmbModelName] = useState<string>('models/gemini-embedding-001');
  const [embDimensions, setEmbDimensions] = useState<number>(768);
  const [embBaseUrl, setEmbBaseUrl] = useState<string>('');
  const [embApiKey, setEmbApiKey] = useState<string>('');
  const [embError, setEmbError] = useState<string | null>(null);
  const [isSavingEmbedding, setIsSavingEmbedding] = useState(false);

  // Load Auth, Provider Configs & Embedding Configs
  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) { router.push('/login'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      if (!mounted) return;
      setUser(createUserPayload(authUser.id, authUser.email));
      setToken(session.access_token);

      const [provRes, presetRes, embConfigRes] = await Promise.all([
        listProviderConfigs(session.access_token),
        listEmbeddingPresets(),
        getEmbeddingConfig(session.access_token),
      ]);

      if (!mounted) return;

      if (provRes.success && provRes.data) setConfigs(provRes.data);
      if (presetRes.success && presetRes.data) setPresets(presetRes.data);
      if (embConfigRes.success && embConfigRes.data) {
        const conf = embConfigRes.data;
        setEmbeddingConfig(conf);
        setEmbProvider(conf.provider);
        setEmbModelName(conf.model_name);
        setEmbDimensions(conf.embedding_dimensions);
        setEmbBaseUrl(conf.base_url || '');

        const matchedPreset = presetRes.data?.find(
          (p) => p.model_name === conf.model_name && p.embedding_dimensions === conf.embedding_dimensions
        );
        if (matchedPreset) {
          setSelectedPresetId(matchedPreset.id);
          setIsCustomEmbedding(false);
        } else {
          setSelectedPresetId('custom');
          setIsCustomEmbedding(true);
        }
      }

      setIsLoading(false);
    }

    init();
    return () => { mounted = false; };
  }, [supabase, router]);

  const reloadConfigs = useCallback(async (accessToken: string) => {
    const res = await listProviderConfigs(accessToken);
    if (res.success && res.data) {
      setConfigs(res.data);
    }
  }, []);

  const resetForm = useCallback(() => {
    setEditingConfigId(null);
    setFormProvider('gemini');
    setFormApiKey('');
    setFormDisplayName('');
    setFormModelName('');
    setFormBaseUrl('');
    setFormIsDefault(false);
    setFormError(null);
    setIsFormOpen(false);
  }, []);

  const openCreateForm = useCallback(() => {
    resetForm();
    setIsFormOpen(true);
  }, [resetForm]);

  const openEditForm = useCallback((config: ProviderConfig) => {
    setEditingConfigId(config.id);
    setFormProvider(config.provider);
    setFormApiKey('');
    setFormDisplayName(config.display_name || '');
    setFormModelName(config.model_name || '');
    setFormBaseUrl(config.base_url || '');
    setFormIsDefault(config.is_default);
    setFormError(null);
    setIsFormOpen(true);
  }, []);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setFormError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

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

    try {
      if (editingConfigId) {
        const payload: any = {
          display_name: formDisplayName.trim() || undefined,
          base_url: formBaseUrl.trim() || undefined,
          model_name: formModelName.trim() || undefined,
          is_default: formIsDefault,
        };
        if (formApiKey.trim()) {
          payload.api_key = formApiKey.trim();
        }

        const res = await updateProviderConfig(editingConfigId, payload, token);
        if (!res.success) {
          setFormError(res.error || 'Gagal memperbarui provider.');
          return;
        }
        setSuccessMsg('Provider berhasil diperbarui.');
      } else {
        const payload = {
          provider: formProvider,
          api_key: formApiKey.trim(),
          display_name: formDisplayName.trim() || undefined,
          base_url: formBaseUrl.trim() || undefined,
          model_name: formModelName.trim() || undefined,
          is_default: formIsDefault,
        };

        const res = await createProviderConfig(payload, token);
        if (!res.success) {
          setFormError(res.error || 'Gagal menambahkan provider.');
          return;
        }
        setSuccessMsg('Provider berhasil ditambahkan.');
      }

      await reloadConfigs(token);
      resetForm();
    } catch (err: any) {
      setFormError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    if (!confirm('Hapus konfigurasi provider ini?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await deleteProviderConfig(id, token);
    if (res.success) {
      setSuccessMsg('Provider berhasil dihapus.');
      await reloadConfigs(token);
    } else {
      setErrorMsg(res.error || 'Gagal menghapus provider.');
    }
  };

  const handleSetDefault = async (config: ProviderConfig) => {
    if (!token || config.is_default) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await updateProviderConfig(config.id, { is_default: true }, token);
    if (res.success) {
      setSuccessMsg(`Provider default diubah.`);
      await reloadConfigs(token);
    } else {
      setErrorMsg(res.error || 'Gagal mengubah provider default.');
    }
  };

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

  const handleSaveEmbedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || embeddingConfig?.locked) return;

    setEmbError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isCustomEmbedding) {
      if (!embModelName.trim()) {
        setEmbError('Nama Model wajib diisi.');
        return;
      }
      if (!embDimensions || embDimensions < 64) {
        setEmbError('Dimensi Vektor minimal 64.');
        return;
      }
    }

    setIsSavingEmbedding(true);

    try {
      const payload = {
        provider: embProvider,
        model_name: embModelName.trim(),
        embedding_dimensions: embDimensions,
        base_url: embBaseUrl.trim() || undefined,
        api_key: embApiKey.trim() || undefined,
      };

      const res = await saveEmbeddingConfig(payload, token);
      if (!res.success) {
        setEmbError(res.error || 'Gagal menyimpan konfigurasi embedding.');
        return;
      }

      setEmbeddingConfig(res.data);
      setSuccessMsg('Model embedding berhasil disimpan.');
    } catch (err: any) {
      setEmbError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSavingEmbedding(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans">
      {/* Top Navbar Header */}
      <header className="border-b border-[#232326] bg-[#09090b]">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b] rounded px-2 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
            <span className="text-[#232326]">/</span>
            <h1 className="text-xs font-semibold text-white font-serif tracking-tight">
              Pengaturan
            </h1>
          </div>
          {user ? (
            <div className="text-[11px] font-mono text-zinc-400 bg-[#121215] border border-[#232326] px-2.5 py-1 rounded-md">
              {user.email}
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Global Toast Messages */}
        {successMsg ? (
          <div role="status" aria-live="polite" className="p-3 rounded-md bg-[#132719] border border-[#1a3d24] text-[#4ade80] text-xs leading-normal flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[#4ade80] shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        ) : null}

        {errorMsg ? (
          <div role="alert" aria-live="polite" className="p-3 rounded-md bg-[#2a1618] border border-[#451a1d] text-[#f87171] text-xs leading-normal flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[#f87171] shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* SECTION 1: Configured Chat Providers List */}
        <section aria-label="Konfigurasi Provider Chat LLM" className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#232326] pb-3">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              <span>PROVIDER CHAT</span>
            </h2>
            {!isFormOpen ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="minimal-button-primary px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#52525b]"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Provider</span>
              </button>
            ) : null}
          </div>

          {/* Form Card for Chat Provider */}
          {isFormOpen ? (
            <div className="p-5 rounded-md bg-[#121215] border border-[#232326] space-y-4">
              <div className="flex items-center justify-between border-b border-[#232326] pb-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-white">
                  {editingConfigId ? 'EDIT PROVIDER' : 'TAMBAH PROVIDER'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded focus-visible:ring-2 focus-visible:ring-[#52525b]"
                >
                  Batal
                </button>
              </div>

              {formError ? (
                <div role="alert" className="p-3 rounded-md bg-[#2a1618] border border-[#451a1d] text-[#f87171] text-xs leading-normal">
                  {formError}
                </div>
              ) : null}

              <form onSubmit={handleSaveConfig} className="space-y-4">
                {/* Provider Selector Grid */}
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                    PILIH PROVIDER
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        disabled={!!editingConfigId}
                        onClick={() => setFormProvider(opt.type)}
                        className={`text-left px-3 py-2.5 rounded-md border text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b] ${
                          formProvider === opt.type
                            ? 'bg-[#18181b] border-white text-white'
                            : 'bg-[#121215] border-[#232326] text-zinc-400 hover:border-zinc-700'
                        } ${editingConfigId ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div>
                  <label htmlFor="formDisplayName" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
                  <label htmlFor="formApiKey" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
                    <label htmlFor="formModelName" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
                    <label htmlFor="formBaseUrl" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
                    className="rounded border-[#27272a] bg-[#18181b] text-white focus:ring-1 focus:ring-[#52525b]"
                  />
                  <label htmlFor="formIsDefault" className="text-xs text-zinc-300 cursor-pointer">
                    Jadikan provider default
                  </label>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#232326]">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3 py-1.5 rounded-md text-xs text-zinc-400 hover:text-white"
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
          ) : null}

          {/* Configured Provider Cards */}
          {isLoading ? (
            <div className="p-6 text-center text-xs font-mono text-zinc-600">
              Memuat provider…
            </div>
          ) : configs.length === 0 ? (
            <div className="p-6 rounded-md bg-[#121215] border border-[#232326] text-center space-y-3">
              <p className="text-xs text-zinc-400">Belum ada AI Provider yang dikonfigurasi.</p>
              {!isFormOpen ? (
                <button
                  type="button"
                  onClick={openCreateForm}
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
                  className="p-3.5 rounded-md bg-[#121215] border border-[#232326] flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#27272a] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-white">
                        {config.display_name || config.provider.toUpperCase()}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#18181b] text-zinc-400 border border-[#27272a]">
                        {config.provider}
                      </span>
                      {config.is_default ? (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#132719] text-[#4ade80] border border-[#1a3d24]">
                          DEFAULT
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-zinc-500">
                      <span>Kunci: {config.api_key_masked}</span>
                      {config.model_name ? <span>Model: {config.model_name}</span> : null}
                      {config.base_url ? <span className="truncate max-w-xs">URL: {config.base_url}</span> : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!config.is_default ? (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(config)}
                        className="px-2.5 py-1 rounded-md border border-[#232326] text-[11px] text-zinc-400 hover:text-white hover:bg-[#18181b] transition-colors"
                      >
                        Set Default
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => openEditForm(config)}
                      aria-label={`Edit ${config.display_name || config.provider}`}
                      title="Edit Provider"
                      className="p-1.5 rounded-md border border-[#232326] text-zinc-400 hover:text-white hover:bg-[#18181b] transition-colors"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(config.id)}
                      aria-label={`Hapus ${config.display_name || config.provider}`}
                      title="Hapus Provider"
                      className="p-1.5 rounded-md border border-[#232326] text-zinc-400 hover:text-rose-400 hover:bg-[#2a1618] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: Embedding Model Configuration & Lock Status */}
        <section aria-label="Konfigurasi Model Embedding Dokumen" className="space-y-4 pt-4 border-t border-[#232326]">
          <div className="flex items-center justify-between border-b border-[#232326] pb-3">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-zinc-400" aria-hidden="true" />
              <span>MODEL EMBEDDING</span>
            </h2>
            {embeddingConfig?.locked ? (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#451a03]/40 text-[#fde68a] border border-[#78350f]/60 flex items-center gap-1">
                <Lock className="w-3 h-3 text-[#fde68a]" aria-hidden="true" /> Terkunci
              </span>
            ) : null}
          </div>

          {/* Lock Warning Banner */}
          {embeddingConfig?.locked ? (
            <div className="p-3 rounded-md bg-[#121215] border border-[#232326] text-xs flex items-center justify-between text-zinc-400">
              <span>Model embedding terkunci karena dokumen PDF sudah terunggah.</span>
              <Link href="/dashboard" className="text-xs text-white hover:underline shrink-0 ml-2 font-mono">
                Dashboard &rarr;
              </Link>
            </div>
          ) : null}

          {embError ? (
            <div role="alert" className="p-3 rounded-md bg-[#2a1618] border border-[#451a1d] text-[#f87171] text-xs leading-normal">
              {embError}
            </div>
          ) : null}

          <form onSubmit={handleSaveEmbedding} className="p-5 rounded-md bg-[#121215] border border-[#232326] space-y-4">
            {/* Preset Selector */}
            <div>
              <label htmlFor="presetSelect" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
                  <option key={preset.id} value={preset.id} className="bg-[#121215] text-white">
                    {preset.name} ({preset.embedding_dimensions}d) - {preset.description}
                  </option>
                ))}
                <option value="custom" className="bg-[#121215] text-white">Custom Model</option>
              </select>
            </div>

            {/* Custom Embedding Fields */}
            {isCustomEmbedding ? (
              <div className="p-3.5 rounded-md bg-[#18181b] border border-[#27272a] space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="embProvider" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                      PROVIDER
                    </label>
                    <select
                      id="embProvider"
                      disabled={!!embeddingConfig?.locked}
                      value={embProvider}
                      onChange={(e) => setEmbProvider(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-md text-xs disabled:opacity-50"
                    >
                      <option value="gemini" className="bg-[#121215] text-white">Google Gemini</option>
                      <option value="openai" className="bg-[#121215] text-white">OpenAI</option>
                      <option value="openrouter" className="bg-[#121215] text-white">OpenRouter</option>
                      <option value="openai_compatible" className="bg-[#121215] text-white">OpenAI-Compatible</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="embDimensions" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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

                <div>
                  <label htmlFor="embModelName" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
                    SLUG MODEL
                  </label>
                  <input
                    id="embModelName"
                    type="text"
                    disabled={!!embeddingConfig?.locked}
                    placeholder="models/text-embedding-004"
                    value={embModelName}
                    onChange={(e) => setEmbModelName(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-md text-xs font-mono disabled:opacity-50"
                  />
                </div>

                {embProvider === 'openai_compatible' ? (
                  <div>
                    <label htmlFor="embBaseUrl" className="block text-[11px] font-mono uppercase tracking-wider text-zinc-400 mb-1.5">
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
            ) : null}

            {/* Form Submit */}
            <div className="flex justify-end pt-2 border-t border-[#232326]">
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
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Run frontend type checking & build verification**

Run command:
`cd frontend && npm run build`

Expected Output: Clean Next.js 15 build with 0 TypeScript errors.

- [ ] **Step 3: Commit changes to Git**

Run command:
`git add frontend/src/app/dashboard/settings/page.tsx docs/superpowers/specs/2026-07-24-settings-redesign-design.md docs/superpowers/plans/2026-07-24-settings-redesign.md`
`git commit -m "feat(settings): redesign settings page into utilitarian minimalist UI with zero UX copy clutter"`
