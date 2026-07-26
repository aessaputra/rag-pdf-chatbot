'use client';

import React from 'react';
import { FileTextIcon, ViewVerticalIcon } from '@radix-ui/react-icons';
import { useDocument } from '@/context/DocumentContext';
import { useSidebar } from '@/context/SidebarContext';

function ChatWindowHeader() {
  const { primaryDoc, extraDocsCount, setIsDocModalOpen } = useDocument();
  const { toggle, isOpen } = useSidebar();

  return (
    <header className="h-13 border-b border-subtle bg-canvas/80 backdrop-blur-xs flex items-center justify-between px-4 md:px-6 shrink-0 z-20 select-none transition-colors duration-150">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {!isOpen && (
          <>
            <button
              type="button"
              onClick={toggle}
              className="p-3 md:p-1.5 -ml-1 text-muted hover:text-primary hover:bg-surface-card-hover rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400"
              title="Buka Sidebar"
              aria-label="Buka Sidebar"
              aria-expanded={isOpen}
            >
              <ViewVerticalIcon className="w-4 h-4" aria-hidden="true" />
            </button>
            
            <div className="w-px h-4 bg-subtle mx-1" aria-hidden="true" />
          </>
        )}

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
