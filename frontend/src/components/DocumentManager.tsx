'use client';

import { FileCheck, Plus, Trash2 } from 'lucide-react';
import type { DocumentItem } from '@/types';

interface DocumentManagerProps {
  documents: DocumentItem[];
  onUpload?: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenModal?: () => void;
}

export default function DocumentManager({
  documents,
  onDelete,
  onOpenModal,
}: DocumentManagerProps) {
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section aria-label="Pengelola Dokumen PDF" className="flex-1 flex flex-col min-h-0 space-y-2">
      {/* Section Header with Modal Trigger */}
      <div className="flex items-center justify-between px-1">
        <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
          BERKAS PDF ({documents.length})
        </span>
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="text-[10px] font-mono text-muted hover:text-primary transition-colors underline cursor-pointer flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            <span>Kelola</span>
          </button>
        )}
      </div>

      {/* Compact Document List in Sidebar */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {documents.length === 0 ? (
          <div className="text-center py-4 text-muted text-xs font-mono">
            {onOpenModal ? (
              <button
                type="button"
                onClick={onOpenModal}
                className="text-xs text-muted hover:text-primary transition-colors cursor-pointer"
              >
                + Tambah Dokumen
              </button>
            ) : (
              'Kosong'
            )}
          </div>
        ) : (
          documents.map((doc) => {
            const isActive = doc.is_active ?? true;
            return (
              <div
                key={doc.id}
                onClick={onOpenModal}
                className="p-2 rounded-md bg-surface-card border border-subtle hover:border-zinc-400 flex items-center justify-between group transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2 truncate mr-1">
                  <FileCheck
                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-500' : 'text-muted'}`}
                    aria-hidden="true"
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-primary truncate">{doc.filename}</span>
                      {!isActive && (
                        <span className="text-[9px] font-mono font-semibold px-1 rounded bg-surface-card-hover text-muted border border-subtle">
                          OFF
                        </span>
                      )}
                    </div>
                    <div className="text-[9px] font-mono text-muted">{formatFileSize(doc.file_size)}</div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(doc.id);
                  }}
                  title={`Hapus ${doc.filename}`}
                  aria-label={`Hapus ${doc.filename}`}
                  className="p-1 text-muted hover:text-rose-500 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-zinc-400 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
