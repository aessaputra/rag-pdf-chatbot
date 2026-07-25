'use client';

import React from 'react';
import { FileText } from 'lucide-react';
import { useDashboard } from '@/context/DashboardContext';

export function ChatWindowHeader() {
  const { primaryDoc, extraDocsCount, setIsDocModalOpen } = useDashboard();

  return (
    <header className="h-13 border-b border-subtle bg-canvas/80 backdrop-blur-xs flex items-center justify-between px-6 shrink-0 z-20 select-none">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <FileText className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
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
    </header>
  );
}

export default ChatWindowHeader;
