'use client';

import React from 'react';
import { FileTextIcon, LightningBoltIcon } from '@radix-ui/react-icons';
import { useDashboard } from '@/context/DashboardContext';

export function ChatWindowHeader() {
  const { primaryDoc, extraDocsCount, setIsDocModalOpen, provider, providerConfigs } = useDashboard();

  const activeConfig = providerConfigs.find((c) => c.is_default) || providerConfigs[0];
  const activeModelName = activeConfig?.model_name || 'Model Default Provider';
  const activeProviderLabel = activeConfig?.display_name || activeConfig?.provider?.toUpperCase() || provider?.toUpperCase() || 'PILIH PROVIDER';

  return (
    <header className="h-13 border-b border-subtle bg-canvas/80 backdrop-blur-xs flex items-center justify-between px-6 shrink-0 z-20 select-none">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileTextIcon className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
        {primaryDoc ? (
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="flex items-center gap-2 min-w-0 text-left hover:opacity-80 transition-opacity cursor-pointer group"
            title="Klik untuk mengelola dokumen"
          >
            <span className="text-xs font-semibold font-serif text-primary truncate max-w-[320px]">
              {primaryDoc.filename}
            </span>
            {extraDocsCount > 0 && (
              <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-surface-card-hover text-muted border border-subtle shrink-0">
                +{extraDocsCount} Berkas
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="text-xs font-medium text-amber-500 font-serif hover:underline cursor-pointer"
          >
            Belum Ada Sumber PDF
          </button>
        )}
      </div>

      {/* Active LLM Provider & Model Badge */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-card border border-subtle text-[11px] font-mono text-muted shrink-0">
        <LightningBoltIcon className="w-3 h-3 text-[var(--pastel-green-text)] shrink-0" aria-hidden="true" />
        <span className="font-medium text-primary">{activeProviderLabel}</span>
        <span className="text-zinc-500">•</span>
        <span className="text-muted truncate max-w-[180px]">{activeModelName}</span>
      </div>
    </header>
  );
}

export default ChatWindowHeader;
