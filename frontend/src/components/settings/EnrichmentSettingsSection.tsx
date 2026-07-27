'use client';

import React, { useEffect, useState } from 'react';
import { LightningBoltIcon } from '@radix-ui/react-icons';
import { getEnrichmentConfig, saveEnrichmentConfig } from '@/lib/api';
import type { EnrichmentConfig, EnrichmentPreset } from '@/types';

interface EnrichmentSettingsSectionProps {
  readonly token: string;
  readonly onSetSuccessMsg: (msg: string | null) => void;
  readonly onSetErrorMsg: (msg: string | null) => void;
}

const PRESETS: { value: EnrichmentPreset; label: string; description: string }[] = [
  { value: 'off', label: 'Off', description: 'Tidak membuat question chunk tambahan.' },
  { value: 'standard', label: 'Standard', description: 'Hingga 75 paragraf terbaik per dokumen.' },
  { value: 'high', label: 'High', description: 'Hingga 150 paragraf untuk retrieval lebih kaya.' },
  { value: 'full', label: 'Full', description: 'Semua paragraf. Biaya dan waktu proses bisa tinggi.' },
];

function EnrichmentSettingsSection({ token, onSetSuccessMsg, onSetErrorMsg }: EnrichmentSettingsSectionProps) {
  const [config, setConfig] = useState<EnrichmentConfig | null>(null);
  const [preset, setPreset] = useState<EnrichmentPreset>('standard');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadConfig() {
      const res = await getEnrichmentConfig(token);
      if (!mounted) return;
      if (res.success) {
        setConfig(res.data);
        setPreset(res.data.preset);
      } else {
        onSetErrorMsg(res.error);
      }
    }

    loadConfig();

    return () => {
      mounted = false;
    };
  }, [token, onSetErrorMsg]);

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSetErrorMsg(null);
    onSetSuccessMsg(null);
    setIsSaving(true);

    const res = await saveEnrichmentConfig({ preset }, token);
    setIsSaving(false);

    if (!res.success) {
      onSetErrorMsg(res.error);
      return;
    }

    setConfig(res.data);
    onSetSuccessMsg('Preset enrichment berhasil disimpan.');
  };

  return (
    <section aria-label="Konfigurasi Enrichment Dokumen" className="p-6 rounded-xl bg-surface-card border border-subtle h-full flex flex-col space-y-6">
      <div className="flex items-center justify-between border-b border-subtle pb-4">
        <h2 className="text-sm font-serif tracking-tight text-primary flex items-center gap-2">
          <LightningBoltIcon className="w-4 h-4 text-muted" aria-hidden="true" />
          <span>Enrichment</span>
        </h2>
        {config ? (
          <span className="text-xs font-mono text-muted">
            cap {config.max_enriched_paragraphs === 999999 ? 'full' : config.max_enriched_paragraphs}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSave} className="space-y-4 flex-1 flex flex-col">
        <div className="space-y-2">
          {PRESETS.map((option) => (
            <label key={option.value} className="flex gap-3 p-3 rounded-lg bg-canvas border border-subtle hover:border-zinc-400 transition-colors cursor-pointer">
              <input
                type="radio"
                name="enrichmentPreset"
                value={option.value}
                checked={preset === option.value}
                onChange={() => setPreset(option.value)}
                className="mt-0.5"
              />
              <span className="space-y-1">
                <span className="block text-xs font-medium text-primary">{option.label}</span>
                <span className="block text-xs text-muted leading-normal">{option.description}</span>
              </span>
            </label>
          ))}
        </div>

        {preset === 'full' ? (
          <div role="alert" className="p-3 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-500 text-xs leading-normal">
            Full enrichment dapat memakai lebih banyak token BYOK dan memperlambat upload.
          </div>
        ) : null}

        <div className="flex-1" />

        <div className="flex justify-end pt-4 border-t border-subtle mt-auto">
          <button
            type="submit"
            disabled={isSaving}
            className="minimal-button-primary px-4 py-2 rounded-md text-xs font-medium cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {isSaving ? 'Menyimpan…' : 'Simpan'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default EnrichmentSettingsSection;
