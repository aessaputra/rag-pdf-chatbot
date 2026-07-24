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
    <div className="min-h-screen w-full bg-canvas text-primary font-sans transition-colors duration-150">
      {/* Top Navbar Header */}
      <header className="border-b border-subtle bg-canvas">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-muted hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 rounded px-2 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
            <span className="text-subtle">/</span>
            <h1 className="text-xs font-semibold text-primary font-serif tracking-tight">
              Pengaturan
            </h1>
          </div>
          {user ? (
            <div className="text-[11px] font-mono text-muted bg-surface-card border border-subtle px-2.5 py-1 rounded-md">
              {user.email}
            </div>
          ) : null}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Global Toast Messages */}
        {successMsg ? (
          <div role="status" aria-live="polite" className="p-3 rounded-md bg-[var(--pastel-green-bg)] border border-[var(--pastel-green-text)]/20 text-[var(--pastel-green-text)] text-xs leading-normal flex items-center gap-2">
            <Check className="w-3.5 h-3.5 text-[var(--pastel-green-text)] shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        ) : null}

        {errorMsg ? (
          <div role="alert" aria-live="polite" className="p-3 rounded-md bg-[var(--pastel-red-bg)] border border-[var(--pastel-red-text)]/20 text-[var(--pastel-red-text)] text-xs leading-normal flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-[var(--pastel-red-text)] shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        ) : null}

        {/* SECTION 1: Configured Chat Providers List */}
        <section aria-label="Konfigurasi Provider Chat LLM" className="space-y-4">
          <div className="flex items-center justify-between border-b border-subtle pb-3">
            <h2 className="text-[11px] font-mono uppercase tracking-wider text-muted flex items-center gap-2">
              <Key className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
              <span>PROVIDER CHAT</span>
            </h2>
            {!isFormOpen ? (
              <button
                type="button"
                onClick={openCreateForm}
                className="minimal-button-primary px-3 py-1.5 rounded-md text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Provider</span>
              </button>
            ) : null}
          </div>

          {/* Form Card for Chat Provider */}
          {isFormOpen ? (
            <div className="p-5 rounded-md bg-surface-card border border-subtle space-y-4">
              <div className="flex items-center justify-between border-b border-subtle pb-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-primary">
                  {editingConfigId ? 'EDIT PROVIDER' : 'TAMBAH PROVIDER'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
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

              <form onSubmit={handleSaveConfig} className="space-y-4">
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
                    onClick={resetForm}
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
          ) : null}

          {/* Configured Provider Cards */}
          {isLoading ? (
            <div className="p-6 text-center text-xs font-mono text-muted">
              Memuat provider…
            </div>
          ) : configs.length === 0 ? (
            <div className="p-6 rounded-md bg-surface-card border border-subtle text-center space-y-3">
              <p className="text-xs text-muted">Belum ada AI Provider yang dikonfigurasi.</p>
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
                      {config.model_name ? <span>Model: {config.model_name}</span> : null}
                      {config.base_url ? <span className="truncate max-w-xs">URL: {config.base_url}</span> : null}
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
                      onClick={() => openEditForm(config)}
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

        {/* SECTION 2: Embedding Model Configuration & Lock Status */}
        <section aria-label="Konfigurasi Model Embedding Dokumen" className="space-y-4 pt-4 border-t border-subtle">
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
            <div role="alert" className="p-3 rounded-md bg-[var(--pastel-red-bg)] border border-[var(--pastel-red-text)]/20 text-[var(--pastel-red-text)] text-xs leading-normal">
              {embError}
            </div>
          ) : null}

          <form onSubmit={handleSaveEmbedding} className="p-5 rounded-md bg-surface-card border border-subtle space-y-4">
            {/* Preset Selector */}
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
                <option value="custom" className="bg-surface-card text-primary">Custom Model</option>
              </select>
            </div>

            {/* Custom Embedding Fields */}
            {isCustomEmbedding ? (
              <div className="p-3.5 rounded-md bg-surface-card-hover border border-subtle space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="embProvider" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
                      PROVIDER
                    </label>
                    <select
                      id="embProvider"
                      disabled={!!embeddingConfig?.locked}
                      value={embProvider}
                      onChange={(e) => setEmbProvider(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-md text-xs disabled:opacity-50"
                    >
                      <option value="gemini" className="bg-surface-card text-primary">Google Gemini</option>
                      <option value="openai" className="bg-surface-card text-primary">OpenAI</option>
                      <option value="openrouter" className="bg-surface-card text-primary">OpenRouter</option>
                      <option value="openai_compatible" className="bg-surface-card text-primary">OpenAI-Compatible</option>
                    </select>
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

                <div>
                  <label htmlFor="embModelName" className="block text-[11px] font-mono uppercase tracking-wider text-muted mb-1.5">
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
            ) : null}

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
      </main>
    </div>
  );
}
