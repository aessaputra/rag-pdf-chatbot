'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, Check, Plus, Trash2, Edit3, Key, Server, Cpu, Sparkles,
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

      // Fetch Provider Configs, Embedding Presets, and Active Embedding Config in parallel
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

        // Check if matches preset
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
    setFormApiKey(''); // Leave blank unless rotating key
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

    // Frontend validation
    if (!editingConfigId && !formApiKey.trim()) {
      setFormError('API Key wajib diisi.');
      return;
    }

    if (formProvider === 'openai_compatible') {
      if (!formBaseUrl.trim()) {
        setFormError('Base URL wajib diisi untuk OpenAI-Compatible provider.');
        return;
      }
      if (!formModelName.trim()) {
        setFormError('Model Name wajib diisi untuk OpenAI-Compatible provider.');
        return;
      }
    } else if (formProvider === 'openrouter') {
      if (!formModelName.trim()) {
        setFormError('Model Name wajib diisi untuk OpenRouter provider.');
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

  // Preset Selection Handler
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

  // Save Embedding Config Handler
  const handleSaveEmbedding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || embeddingConfig?.locked) return;

    setEmbError(null);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (isCustomEmbedding) {
      if (!embModelName.trim()) {
        setEmbError('Model Name wajib diisi.');
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
    <div className="min-h-screen w-full bg-[#09090b] text-zinc-100 font-sans">
      {/* Top Navbar Header */}
      <header className="border-b border-[#232326] bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm text-zinc-400 hover:text-zinc-100 transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none rounded-md px-2 py-1"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <span className="text-zinc-700">/</span>
            <h1 className="text-base font-medium text-zinc-100 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Pengaturan AI Provider & Embedding (BYOK)</span>
            </h1>
          </div>
          {user && (
            <div className="text-xs font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-md">
              {user.email}
            </div>
          )}
        </div>
      </header>

      {/* Main Content Body */}
      <main className="max-w-5xl mx-auto px-6 py-10 space-y-10">
        {/* Intro Description Banner */}
        <section className="minimal-card rounded-xl p-6 space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-medium text-zinc-100">Bring Your Own Key (BYOK) & Model Config</h2>
              <p className="text-sm text-zinc-400">
                Sistem ini menggunakan enkripsi tingkat tinggi AES-256 untuk mengamankan API key Anda. Atur AI Provider untuk obrolan chat dan Model Embedding untuk pengolahan dokumen PDF.
              </p>
            </div>
          </div>
        </section>

        {/* Global Toast Messages */}
        {successMsg && (
          <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-sm flex items-center gap-3">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 rounded-lg bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-3">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* SECTION 1: Configured Chat Providers List */}
        <section className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
                <Key className="w-4 h-4 text-emerald-400" />
                <span>1. Chat Provider Configs</span>
              </h3>
              <p className="text-xs text-zinc-400">API Key untuk obrolan AI LLM (Gemini, OpenAI, OpenRouter, Custom API).</p>
            </div>
            {!isFormOpen && (
              <button
                type="button"
                onClick={openCreateForm}
                className="minimal-button-primary px-4 py-2 rounded-lg text-sm flex items-center gap-2 shadow-sm focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:outline-none"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Provider</span>
              </button>
            )}
          </div>

          {/* Form Modal / Card for Chat Provider */}
          {isFormOpen && (
            <div className="minimal-card rounded-xl p-6 border border-zinc-700/60 space-y-6">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <h4 className="text-sm font-medium text-zinc-100 flex items-center gap-2">
                  <Key className="w-4 h-4 text-emerald-400" />
                  <span>{editingConfigId ? 'Edit Konfigurasi Provider' : 'Tambah Provider Baru'}</span>
                </h4>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-zinc-400 hover:text-zinc-200 px-2 py-1 rounded-md"
                >
                  Batal
                </button>
              </div>

              {formError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleSaveConfig} className="space-y-5">
                {/* Provider Selector */}
                <div className="space-y-2">
                  <label htmlFor="formProvider" className="block text-xs font-medium text-zinc-300">
                    Pilih Provider AI <span className="text-rose-400">*</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {PROVIDER_OPTIONS.map((opt) => (
                      <button
                        key={opt.type}
                        type="button"
                        disabled={!!editingConfigId}
                        onClick={() => setFormProvider(opt.type)}
                        className={`text-left p-3 rounded-lg border text-xs transition-all ${
                          formProvider === opt.type
                            ? 'bg-zinc-800/90 border-emerald-500/70 text-zinc-100 ring-1 ring-emerald-500/50'
                            : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                        } ${editingConfigId ? 'opacity-70 cursor-not-allowed' : ''}`}
                      >
                        <div className="font-medium text-zinc-200 flex items-center gap-1.5">
                          {opt.type === 'gemini' && <Sparkles className="w-3.5 h-3.5 text-blue-400" />}
                          {opt.type === 'openai' && <Cpu className="w-3.5 h-3.5 text-emerald-400" />}
                          {opt.type === 'openrouter' && <Server className="w-3.5 h-3.5 text-purple-400" />}
                          {opt.type === 'openai_compatible' && <Server className="w-3.5 h-3.5 text-amber-400" />}
                          <span>{opt.label}</span>
                        </div>
                        <p className="mt-1 text-[11px] text-zinc-400 line-clamp-1">{opt.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Display Name */}
                <div className="space-y-1.5">
                  <label htmlFor="formDisplayName" className="block text-xs font-medium text-zinc-300">
                    Label Display Name <span className="text-zinc-500">(Opsional)</span>
                  </label>
                  <input
                    id="formDisplayName"
                    type="text"
                    autoComplete="off"
                    placeholder="Contoh: Groq Llama 3.3 / My Gemini Key"
                    value={formDisplayName}
                    onChange={(e) => setFormDisplayName(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-lg text-xs"
                  />
                </div>

                {/* API Key */}
                <div className="space-y-1.5">
                  <label htmlFor="formApiKey" className="block text-xs font-medium text-zinc-300">
                    API Key {editingConfigId ? <span className="text-zinc-500">(Biarkan kosong jika tidak ingin mengubah)</span> : <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    id="formApiKey"
                    type="password"
                    autoComplete="off"
                    placeholder={editingConfigId ? '••••••••••••••••' : 'Masukkan API key rahasia Anda'}
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                  />
                </div>

                {/* Conditional Model Name */}
                {(formProvider === 'openrouter' || formProvider === 'openai_compatible' || formProvider === 'openai') && (
                  <div className="space-y-1.5">
                    <label htmlFor="formModelName" className="block text-xs font-medium text-zinc-300">
                      Model Name Slug {formProvider !== 'openai' ? <span className="text-rose-400">*</span> : <span className="text-zinc-500">(Opsional, default: gpt-4o-mini)</span>}
                    </label>
                    <input
                      id="formModelName"
                      type="text"
                      autoComplete="off"
                      placeholder={
                        formProvider === 'openrouter'
                          ? 'Contoh: meta-llama/llama-3.3-70b-instruct'
                          : formProvider === 'openai_compatible'
                          ? 'Contoh: llama-3.3-70b-versatile'
                          : 'gpt-4o-mini'
                      }
                      value={formModelName}
                      onChange={(e) => setFormModelName(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono"
                    />
                  </div>
                )}

                {/* Conditional Base URL */}
                {formProvider === 'openai_compatible' && (
                  <div className="space-y-1.5">
                    <label htmlFor="formBaseUrl" className="block text-xs font-medium text-zinc-300">
                      Base URL Endpoint <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="formBaseUrl"
                      type="url"
                      autoComplete="off"
                      placeholder="Contoh: https://api.groq.com/openai/v1"
                      value={formBaseUrl}
                      onChange={(e) => setFormBaseUrl(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono"
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
                    className="rounded border-zinc-700 bg-zinc-900 text-emerald-500 focus:ring-emerald-500/40"
                  />
                  <label htmlFor="formIsDefault" className="text-xs text-zinc-300 cursor-pointer">
                    Jadikan provider ini sebagai default untuk obrolan chat
                  </label>
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="minimal-button-primary px-5 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                  >
                    {isSubmitting ? <span>Menyimpan…</span> : <span>Simpan Konfigurasi</span>}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Configured Provider Cards */}
          {isLoading ? (
            <div className="p-8 text-center text-xs text-zinc-500 animate-pulse">
              Memuat konfigurasi provider…
            </div>
          ) : configs.length === 0 ? (
            <div className="minimal-card rounded-xl p-8 text-center space-y-3">
              <p className="text-sm text-zinc-400">Belum ada AI Provider yang dikonfigurasi.</p>
              <p className="text-xs text-zinc-500">Tambahkan API key pertama Anda agar asisten AI dapat digunakan.</p>
              {!isFormOpen && (
                <button
                  type="button"
                  onClick={openCreateForm}
                  className="minimal-button-primary px-4 py-2 rounded-lg text-xs inline-flex items-center gap-1.5 mt-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Provider Sekarang</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {configs.map((config) => (
                <div
                  key={config.id}
                  className="minimal-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-zinc-800/80 hover:border-zinc-700/80 transition-all"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-zinc-100">
                        {config.display_name || config.provider.toUpperCase()}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                        {config.provider}
                      </span>
                      {config.is_default && (
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Default
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-400">
                      <span>Key: {config.api_key_masked}</span>
                      {config.model_name && <span>Model: {config.model_name}</span>}
                      {config.base_url && <span className="truncate max-w-xs">URL: {config.base_url}</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {!config.is_default && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(config)}
                        className="px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-800 transition-colors"
                      >
                        Set Default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => openEditForm(config)}
                      className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      title="Edit Provider"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(config.id)}
                      className="p-1.5 rounded-lg border border-zinc-800 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 transition-colors"
                      title="Hapus Provider"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* SECTION 2: Embedding Model Configuration & Lock Status */}
        <section className="space-y-4 pt-4 border-t border-zinc-800">
          <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
            <div>
              <h3 className="text-base font-medium text-zinc-100 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>2. Model Embedding Dokumen (Vector Search)</span>
              </h3>
              <p className="text-xs text-zinc-400">Model embedding yang digunakan untuk mengekstrak vektor dari dokumen PDF saat diunggah.</p>
            </div>
            {embeddingConfig?.locked && (
              <span className="text-xs font-mono px-3 py-1 rounded-md bg-amber-950/80 text-amber-300 border border-amber-800/60 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-400" /> Model Terkunci (Locked)
              </span>
            )}
          </div>

          {/* Lock Warning Banner */}
          {embeddingConfig?.locked && (
            <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800/70 text-amber-200 text-xs space-y-2">
              <div className="flex items-center gap-2 font-medium text-amber-300 text-sm">
                <Lock className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span>Model Embedding Terkunci</span>
              </div>
              <p className="leading-relaxed">
                Anda sudah memiliki dokumen PDF terunggah di basis data. Model embedding tidak dapat diubah agar tidak merusak pencarian vektor dokumen yang sudah di-index.
              </p>
              <div className="pt-1">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 text-amber-300 hover:underline font-medium text-xs"
                >
                  <span>Hapus semua dokumen di Dashboard untuk membuka kunci</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          )}

          {embError && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{embError}</span>
            </div>
          )}

          <form onSubmit={handleSaveEmbedding} className="minimal-card rounded-xl p-6 space-y-6 border border-zinc-800/80">
            {/* Preset Selector */}
            <div className="space-y-2">
              <label htmlFor="presetSelect" className="block text-xs font-medium text-zinc-300">
                Pilih Preset Model Embedding <span className="text-rose-400">*</span>
              </label>
              <select
                id="presetSelect"
                disabled={!!embeddingConfig?.locked}
                value={selectedPresetId}
                onChange={(e) => handlePresetChange(e.target.value)}
                className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-medium disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.embedding_dimensions}d) - {preset.description}
                  </option>
                ))}
                <option value="custom">-- Custom Embedding Model / Provider --</option>
              </select>
            </div>

            {/* Custom Embedding Fields */}
            {isCustomEmbedding && (
              <div className="p-4 rounded-lg bg-zinc-900/80 border border-zinc-800 space-y-4">
                <div className="text-xs font-medium text-zinc-300 pb-1 border-b border-zinc-800">
                  Konfigurasi Custom Embedding Model
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label htmlFor="embProvider" className="block text-xs font-medium text-zinc-300">
                      Provider <span className="text-rose-400">*</span>
                    </label>
                    <select
                      id="embProvider"
                      disabled={!!embeddingConfig?.locked}
                      value={embProvider}
                      onChange={(e) => setEmbProvider(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs disabled:opacity-60"
                    >
                      <option value="gemini">Google Gemini</option>
                      <option value="openai">OpenAI</option>
                      <option value="openrouter">OpenRouter</option>
                      <option value="openai_compatible">OpenAI-Compatible (Custom)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label htmlFor="embDimensions" className="block text-xs font-medium text-zinc-300">
                      Dimensi Vektor Vector Dimensions <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="embDimensions"
                      type="number"
                      disabled={!!embeddingConfig?.locked}
                      placeholder="768 / 1536 / 3072"
                      value={embDimensions}
                      onChange={(e) => setEmbDimensions(parseInt(e.target.value) || 768)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-60"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="embModelName" className="block text-xs font-medium text-zinc-300">
                    Model Name Slug <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="embModelName"
                    type="text"
                    disabled={!!embeddingConfig?.locked}
                    placeholder="Contoh: models/text-embedding-004 / text-embedding-3-small"
                    value={embModelName}
                    onChange={(e) => setEmbModelName(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-60"
                  />
                </div>

                {embProvider === 'openai_compatible' && (
                  <div className="space-y-1.5">
                    <label htmlFor="embBaseUrl" className="block text-xs font-medium text-zinc-300">
                      Base URL Endpoint <span className="text-zinc-500">(Opsional)</span>
                    </label>
                    <input
                      id="embBaseUrl"
                      type="url"
                      disabled={!!embeddingConfig?.locked}
                      placeholder="https://api.groq.com/openai/v1"
                      value={embBaseUrl}
                      onChange={(e) => setEmbBaseUrl(e.target.value)}
                      className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-60"
                    />
                  </div>
                )}

                <div className="space-y-1.5">
                  <label htmlFor="embApiKey" className="block text-xs font-medium text-zinc-300">
                    API Key Spesifik Embedding <span className="text-zinc-500">(Opsional, otomatis menggunakan key dari Chat Provider jika kosong)</span>
                  </label>
                  <input
                    id="embApiKey"
                    type="password"
                    disabled={!!embeddingConfig?.locked}
                    placeholder="Biarkan kosong untuk memakai ulang API Key Provider"
                    value={embApiKey}
                    onChange={(e) => setEmbApiKey(e.target.value)}
                    className="minimal-input w-full px-3 py-2 rounded-lg text-xs font-mono disabled:opacity-60"
                  />
                </div>
              </div>
            )}

            {/* Current Active Embedding Summary */}
            {embeddingConfig && (
              <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 text-xs flex flex-wrap items-center justify-between gap-2 text-zinc-400">
                <span>Model Aktif Saat Ini: <strong className="text-zinc-200 font-mono">{embeddingConfig.model_name}</strong></span>
                <span>Dimensi Vektor: <strong className="text-emerald-400 font-mono">{embeddingConfig.embedding_dimensions}d</strong></span>
                <span>Provider: <strong className="text-purple-400 font-mono uppercase">{embeddingConfig.provider}</strong></span>
              </div>
            )}

            {/* Save Button */}
            {!embeddingConfig?.locked && (
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingEmbedding}
                  className="minimal-button-primary px-5 py-2 rounded-lg text-xs font-medium flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingEmbedding ? 'Menyimpan…' : 'Simpan Model Embedding'}</span>
                </button>
              </div>
            )}
          </form>
        </section>
      </main>
    </div>
  );
}
