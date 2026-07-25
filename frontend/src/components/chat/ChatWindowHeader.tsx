'use client';

import React from 'react';
import { FileTextIcon } from '@radix-ui/react-icons';
import { useDashboard } from '@/context/DashboardContext';

export function ChatWindowHeader() {
  const { primaryDoc, extraDocsCount, setIsDocModalOpen } = useDashboard();

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
            <span className="text-xs font-medium text-primary">
              {extraDocsCount === 0 ? '1 Dokumen Aktif' : `${extraDocsCount + 1} Dokumen Aktif`}
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="text-xs font-medium text-muted hover:text-primary transition-colors cursor-pointer"
          >
            + Tambah Konteks PDF
          </button>
        )}
      </div>
    </header>
  );
}

export default ChatWindowHeader;
