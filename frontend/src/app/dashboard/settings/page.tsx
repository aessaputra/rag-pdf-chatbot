'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Check, Plus, Trash2, Edit3, Key, Server, Sparkles,
  ShieldCheck, AlertCircle, Lock, Layers, Save, ExternalLink
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

const PROVIDER_OPTIONS: { type: ProviderType; label: string; description: string }[] = [
  { type: 'gemini', label: 'Google Gemini', description: 'Model Gemini 2.5 Flash / Pro dari Google AI' },
  { type: 'openai', label: 'OpenAI', description: 'Model GPT-4o, GPT-4o-mini dari OpenAI' },
  { type: 'openrouter', label: 'OpenRouter', description: 'Katalog agregator LLM (Claude, Llama, Mistral, dll)' },
  { type: 'openai_compatible', label: 'OpenAI-Compatible (Custom)', description: 'Provider custom (Groq, Together AI, vLLM, LM Studio)' },
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
        setFormError('Base URL wajib diisi untuk OpenAI-Compatible provider.');
        return;
      }
      if (!formModelName.trim()) {
        setFormError('Nama Model wajib diisi untuk OpenAI-Compatible provider.');
        return;
      }
    } else if (formProvider === 'openrouter') {
      if (!formModelName.trim()) {
        setFormError('Nama Model wajib diisi untuk OpenRouter provider.');
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
        setSuccessMsg('Konfigurasi provider berhasil diperbarui.');
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
        setSuccessMsg('Provider baru berhasil ditambahkan.');
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
    if (!confirm('Apakah Anda yakin ingin menghapus konfigurasi provider ini?')) return;

    setErrorMsg(null);
    setSuccessMsg(null);

    const res = await deleteProviderConfig(id, token);
    if (res.success) {
      setSuccessMsg('Konfigurasi provider berhasil dihapus.');
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
      setSuccessMsg(`'${config.display_name || config.provider}' dijadikan sebagai provider default.`);
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
        setEmbError('Dimensi Vektor harus lebih besar dari 64.');
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
      setSuccessMsg('Konfigurasi model embedding berhasil disimpan.');
    } catch (err: any) {
      setEmbError(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setIsSavingEmbedding(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#09090b] text-[#f4f4f5] font-sans selection:bg-[#27272a] selection:text-[#fafafa]">
      {/* Top Navbar Header */}
      <header className="border-b border-[#232326] bg-[#09090b]/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-[#f4f4f5] transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b] rounded-md px-2 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Dashboard</span>
            </Link>
            <span className="text-[#232326]">/</span>
            <h1 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
              <span>Pengaturan AI Provider &amp; Model Embedding</span>
            </h1>
          </div>
          {user && (
            <div className="text-[11px] font-mono text-[#a1a1aa] bg-[#121215] border border-[#232326] px-2.5 py-1 rounded-md">
              {user.email}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Intro Security Info Banner */}
        <section aria-label="Informasi Keamanan BYOK" className="minimal-card rounded-xl p-5 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#18181b] border border-[#27272a] text-[#f4f4f5]">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#f4f4f5]">Keamanan Kunci API (Bring Your Own Key)</h2>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                Kunci API Anda dienkripsi menggunakan standar enkripsi AES-256 di sisi server. Atur AI Provider untuk percakapan obrolan dan Model Embedding untuk pengolahan berkas PDF.
              </p>
            </div>
          </div>
        </section>

        {/* Global Toast Messages */}
        {successMsg && (
          <div role="status" aria-live="polite" className="p-3.5 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-emerald-300 text-xs flex items-center gap-2.5">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div role="alert" aria-live="polite" className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-800/40 text-rose-300 text-xs flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: Configured Chat Providers List */}
        <section aria-label="Konfigurasi Provider Chat LLM" className="space-y-4">
          <div className="flex items-center justify-between border-b border-[#232326] pb-3">
            <div>
              <h3 className="text-base font-serif italic text-[#f4f4f5] flex items-center gap-2">
                <Key className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
                <span>1. Konfigurasi Provider Chat (LLM)</span>
              </h3>
              <p className="text-xs text-[#a1a1aa]">Kunci API untuk obrolan AI (Google Gemini, OpenAI, OpenRouter, Custom API).</p>
            </div>
            {!isFormOpen && (
              <button
                type="button"
                onClick={openCreateForm}
                className="minimal-button-primary px-3.5 py-1.5 rounded-lg text-xs flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#52525b]"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Tambah Provider</span>
              </button>
            )}
          </div>

          {/* Form Card for Chat Provider */}
          {isFormOpen && (
            <div className="minimal-card rounded-xl p-5 border border-[#27272a] space-y-5">
              <div className="flex items-center justify-between border-b border-[#232326] pb-3">
                <h4 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-2">
                  <Key className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
                  <span>{editingConfigId ? 'Edit Konfigurasi Provider' : 'Tambah Provider Baru'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-[#a1a1aa] hover:text-[#f4f4f5] px-2 py-1 rounded-md focus-visible:ring-2 focus-visible:ring-[#52525b]"
                >
                  Batal
                </button>
              </div>

              {formError && (
                <div role="alert" className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-4">
                {/* Provider Selector */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#f4f4f5]">
                    Pilih Provider AI <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        disabled={!!editingConfigId}
                        onClick={() => setFormProvider(opt.type)}
                        className={`text-left p-3 rounded-lg border text-xs transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b] ${
                          formProvider === opt.type
                            ? 'bg-[#18181b] border-[#fafafa] text-[#f4f4f5]'
                            : 'bg-[#121215] border-[#232326] text-[#a1a1aa] hover:border-[#27272a]'
                        } ${editingConfigId ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-[#f4f4f5] flex items-center gap-1.5">
                          <Server className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" />
                          <span>{opt.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-[#a1a1aa] line-clamp-1">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1">
                  <label htmlFor="formDisplayName" className="block text-xs font-medium text-[#f4f4f5]">
                    Label Display Name <span className="text-[#a1a1aa]">(Opsional)</span>
                  </label>
                  <input
                    id="formDisplayName"
                    type="text"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="Contoh: Groq Llama 3.3 / My Gemini Key"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-lg text-xs focus-visible:ring-2 focus-visible:ring-[#52525b]"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-1">
                  <label htmlFor="formApiKey" className="block text-xs font-medium text-[#f4f4f5]">
                    Kunci API Rahasia {editingConfigId ? <span className="text-[#a1a1aa]">(Biarkan kosong jika tidak ingin mengubah)</span> : <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    id="formApiKey"
                    type="password"
                    autoComplete="off"
                    spellCheck={false}
                    placeholder={editingConfigId ? '••••••••••••••••' : 'Masukkan Kunci API rahasia Anda'}
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono focus-visible:ring-2 focus-visible:ring-[#52525b]"
                  />
                </div>

                {/* Conditional Model Name */}
                {(formProvider === 'openrouter' || formProvider === 'openai_compatible' || formProvider === 'openai') && (
                  <div className="space-y-1">
                    <label htmlFor="formModelName" className="block text-xs font-medium text-[#f4f4f5]">
                      Nama Model Slug {formProvider !== 'openai' ? <span className="text-rose-400">*</span> : <span className="text-[#a1a1aa]">(Opsional, default: gpt-4o-mini)</span>}
                    </label>
                    <input
                      id="formModelName"
                      type="text"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={
                        formProvider === 'openrouter'
                          ? 'Contoh: meta-llama/llama-3.3-70b-instruct'
                          : formProvider === 'openai_compatible'
                          ? 'Contoh: llama-3.3-70b-versatile'
                          : 'gpt-4o-mini'
                      }
                      value={formModelName}
                      onChange={(e) => setFormModelName(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono focus-visible:ring-2 focus-visible:ring-[#52525b]"
                    />
                  </div>
                )}

                {/* Conditional Base URL */}
                {formProvider === 'openai_compatible' && (
                  <div className="space-y-1">
                    <label htmlFor="formBaseUrl" className="block text-xs font-medium text-[#f4f4f5]">
                      Base URL Endpoint <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="formBaseUrl"
                      type="url"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Contoh: https://api.groq.com/openai/v1"
                      value={formBaseUrl}
                      onChange={(e) => setFormBaseUrl(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono focus-visible:ring-2 focus-visible:ring-[#52525b]"
                    />
                  </div>
                )}

                {/* Is Default */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    id="formIsDefault"
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="rounded border-[#27272a] bg-[#18181b] text-[#fafafa] focus:ring-1 focus:ring-[#52525b]"
                  />
                  <label htmlFor="formIsDefault" className="text-xs text-[#f4f4f5] cursor-pointer">
                    Jadikan provider ini sebagai default untuk obrolan chat
                  </label>
                </div>

                {/* Form Action Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#232326]">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-3.5 py-1.5 rounded-lg text-xs text-[#a1a1aa] hover:text-[#f4f4f5] focus-visible:ring-2 focus-visible:ring-[#52525b]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="minimal-button-primary px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#52525b]"
                  >
                    {isSubmitting ? <span>Menyimpan…</span> : <span>Simpan Konfigurasi</span>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Configured Provider Cards */}
          {isLoading ? (
            <div className="p-8 text-center text-xs text-[#71717a] animate-pulse">
              Memuat konfigurasi provider…
            </div>
          ) : configs.length === 0 ? (
            <div className="minimal-card rounded-xl p-8 text-center space-y-3">
              <p className="text-xs text-[#a1a1aa]">Belum ada AI Provider yang dikonfigurasi.</p>
              {!isFormOpen && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="minimal-button-primary px-3.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#52525b]"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Tambah Provider Pertama</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="minimal-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#27272a] transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-xs text-[#f4f4f5]">
                        {config.display_name || config.provider.toUpperCase()}
                      </span>
                      <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#18181b] text-[#a1a1aa] border border-[#27272a]">
                        {config.provider}
                      </span>
                      {config.is_default && (
                        <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#064e3b]/40 text-[#a7f3d0] border border-[#064e3b]/60 flex items-center gap-1">
                          <Check className="w-3 h-3 text-[#a7f3d0]" aria-hidden="true" /> Default
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#a1a1aa]">
                      <span>Kunci: {config.api_key_masked}</span>
                      {config.model_name && <span>Model: {config.model_name}</span>}
                      {config.base_url && <span className="truncate max-w-xs">URL: {config.base_url}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!config.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(config)}
                        className="px-2.5 py-1 rounded-lg border border-[#232326] text-[11px] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b]"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditForm(config)}
                      aria-label={`Edit provider ${config.display_name || config.provider}`}
                      title="Edit Provider"
                      className="p-1.5 rounded-lg border border-[#232326] text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b]"
                    >
                      <Edit3 className="w-3.5 h-3.5" aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(config.id)}
                      aria-label={`Hapus provider ${config.display_name || config.provider}`}
                      title="Hapus Provider"
                      className="p-1.5 rounded-lg border border-[#232326] text-[#a1a1aa] hover:text-rose-400 hover:bg-rose-950/20 transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b]"
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
            <div>
              <h3 className="text-base font-serif italic text-[#f4f4f5] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#a1a1aa]" aria-hidden="true" />
                <span>2. Model Embedding Dokumen (Vector Search)</span>
              </h3>
              <p className="text-xs text-[#a1a1aa]">Model embedding yang digunakan untuk mengekstrak vektor dari dokumen PDF.</p>
            </div>
            {embeddingConfig?.locked && (
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-md bg-[#451a03]/40 text-[#fde68a] border border-[#78350f]/60 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#fde68a]" aria-hidden="true" /> Terkunci (Locked)
              </span>
            )}
          </div>

          {/* Lock Warning Banner */}
          {embeddingConfig?.locked && (
            <div className="p-4 rounded-xl bg-[#451a03]/20 border border-[#78350f]/50 text-[#fde68a] text-xs space-y-1.5">
              <div className="flex items-center gap-2 font-medium text-sm text-[#fde68a]">
                <Lock className="w-4 h-4 text-[#fde68a] shrink-0" aria-hidden="true" />
                <span>Model Embedding Terkunci</span>
              </div>
              <p className="leading-relaxed text-[11px] text-[#fde68a]/90">
                Anda sudah memiliki dokumen PDF terunggah di basis data. Model embedding tidak dapat diubah agar tidak merusak pencarian vektor dokumen yang sudah di-index.
              </p>
              <div className="pt-1">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-[#fde68a] hover:underline font-medium text-xs focus-visible:ring-2 focus-visible:ring-[#52525b] rounded"
                >
                  <span>Hapus semua dokumen di Dashboard untuk membuka kunci →</span>
                </Link>
              </div>
            </div>
          )}

          {embError && (
            <div role="alert" className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" aria-hidden="true" />
              <span>{embError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEmbedding} className="minimal-card rounded-xl p-5 space-y-5">
            {/* Preset Selector */}
            <div className="space-y-1.5">
              <label htmlFor="presetSelect" className="block text-xs font-medium text-[#f4f4f5]">
                Pilih Preset Model Embedding <span className="text-rose-400">*</span>
              </label>
              <select
                id="presetSelect"
                disabled={!!embeddingConfig?.locked}
                value={selectedPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#52525b]"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id} className="bg-[#121215] text-[#f4f4f5]">
                    {preset.name} ({preset.embedding_dimensions}d) - {preset.description}
                  </option>
                ))}
                <option value="custom" className="bg-[#121215] text-[#f4f4f5]">-- Custom Embedding Model / Provider --</option>
              </select>
            </div>

            {/* Custom Embedding Fields */}
            {isCustomEmbedding && (
              <div className="p-4 rounded-lg bg-[#18181b] border border-[#27272a] space-y-4">
                <div className="text-xs font-medium text-[#f4f4f5] pb-1 border-b border-[#232326]">
                  Konfigurasi Custom Embedding Model
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="embProvider" className="block text-xs font-medium text-[#f4f4f5]">
                      Provider <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="embProvider"
                      disabled={!!embeddingConfig?.locked}
                      value={embProvider}
                      onChange={(e) => setEmbProvider(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#52525b]"
                    >
                      <option value="gemini" className="bg-[#121215] text-[#f4f4f5]">Google Gemini</option>
                      <option value="openai" className="bg-[#121215] text-[#f4f4f5]">OpenAI</option>
                      <option value="openrouter" className="bg-[#121215] text-[#f4f4f5]">OpenRouter</option>
                      <option value="openai_compatible" className="bg-[#121215] text-[#f4f4f5]">OpenAI-Compatible (Custom)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="embDimensions" className="block text-xs font-medium text-[#f4f4f5]">
                      Dimensi Vektor (Vector Dimensions) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="embDimensions"
                      type="number"
                      disabled={!!embeddingConfig?.locked}
                      placeholder="768 / 1536 / 3072"
                      value={embDimensions}
                      onChange={(e) => setEmbDimensions(parseInt(e.target.value) || 768)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#52525b]"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="embModelName" className="block text-xs font-medium text-[#f4f4f5]">
                    Nama Model Slug <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="embModelName"
                    type="text"
                    disabled={!!embeddingConfig?.locked}
                    placeholder="Contoh: models/text-embedding-004 / text-embedding-3-small"
                    value={embModelName}
                    onChange={(e) => setEmbModelName(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#52525b]"
                  />
                </div>

                {embProvider === 'openai_compatible' && (
                  <div className="space-y-1">
                    <label htmlFor="embBaseUrl" className="block text-xs font-medium text-[#f4f4f5]">
                      Base URL Endpoint <span className="text-[#a1a1aa]">(Opsional)</span>
                    </label>
                    <input
                      id="embBaseUrl"
                      type="url"
                      disabled={!!embeddingConfig?.locked}
                      placeholder="https://api.groq.com/openai/v1"
                      value={embBaseUrl}
                      onChange={(e) => setEmbBaseUrl(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[#52525b]"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Form Submit */}
            <div className="flex justify-end pt-2 border-t border-[#232326]">
              <button
                type="submit"
                disabled={!!embeddingConfig?.locked || isSavingEmbedding}
                className="minimal-button-primary px-4 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#52525b]"
              >
                {isSavingEmbedding ? <span>Menyimpan…</span> : <span>Simpan Konfigurasi Embedding</span>}
              </button>
            </div>
          </form>
        </section>
      </main>
    </div>
  );
}
