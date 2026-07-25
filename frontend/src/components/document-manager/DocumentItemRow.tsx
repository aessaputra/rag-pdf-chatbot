'use client';

import React, { useState } from 'react';
import { FileTextIcon, UpdateIcon, ExternalLinkIcon, TrashIcon } from '@radix-ui/react-icons';
import type { DocumentItem } from '@/types';

interface DocumentItemRowProps {
  doc: DocumentItem;
  isBusy: boolean;
  onToggleActive: (doc: DocumentItem) => Promise<void>;
  onPreview: (docId: string) => Promise<void>;
  onDelete: (docId: string) => Promise<void>;
}

export function DocumentItemRow({ doc, isBusy, onToggleActive, onPreview, onDelete }: DocumentItemRowProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isActive = doc.is_active ?? true;
  const isProcessing = doc.status === 'processing';
  const isFailed = doc.status === 'failed';

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDelete = async () => {
    await onDelete(doc.id);
    setDeletingId(null);
  };

  return (
    <div className="flex items-center justify-between p-3.5 bg-surface-card border border-subtle rounded-lg hover:border-zinc-400 transition-colors">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <FileTextIcon className="w-4 h-4 text-muted shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-primary truncate" title={doc.filename}>
              {doc.filename}
            </span>
            {isProcessing ? (
              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                <UpdateIcon className="w-2.5 h-2.5 animate-spin" />
                PROSES
              </span>
            ) : isFailed ? (
              <span className="bg-rose-500/10 text-rose-500 border border-rose-500/20 text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                GAGAL
              </span>
            ) : isActive ? (
              <span className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                AKTIF
              </span>
            ) : (
              <span className="bg-surface-card-hover text-muted border border-subtle text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                OFF
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted">
            <span>{formatFileSize(doc.file_size)}</span>
            {doc.total_pages && <span>• {doc.total_pages} hal</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 ml-3">
        <button
          onClick={() => onToggleActive(doc)}
          disabled={isBusy || isProcessing}
          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
            isActive ? 'bg-emerald-500' : 'bg-surface-card-hover border border-subtle'
          } ${isBusy || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          title={isActive ? 'Nonaktifkan RAG' : 'Aktifkan RAG'}
        >
          <span
            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
              isActive ? 'translate-x-4' : 'translate-x-0'
            }`}
          />
        </button>

        <button
          onClick={() => onPreview(doc.id)}
          disabled={isBusy}
          className="p-1.5 text-muted hover:text-primary hover:bg-surface-card-hover rounded-md transition-colors cursor-pointer"
          title="Preview PDF"
        >
          <ExternalLinkIcon className="w-3.5 h-3.5" />
        </button>

        {deletingId === doc.id ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={isBusy}
              className="px-2 py-0.5 text-[10px] font-medium text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-colors cursor-pointer"
            >
              Hapus
            </button>
            <button
              onClick={() => setDeletingId(null)}
              className="px-1.5 py-0.5 text-[10px] text-muted hover:text-primary cursor-pointer"
            >
              Batal
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDeletingId(doc.id)}
            disabled={isBusy}
            className="p-1.5 text-muted hover:text-rose-500 hover:bg-surface-card-hover rounded-md transition-colors cursor-pointer"
            title="Hapus Dokumen"
          >
            <TrashIcon className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
