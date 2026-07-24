'use client';

import { useState } from 'react';
import { FileCheck, Trash2, UploadCloud } from 'lucide-react';
import type { DocumentItem } from '@/types';

interface DocumentManagerProps {
  documents: DocumentItem[];
  hasCredentials?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onOpenModal?: () => void;
}

export default function DocumentManager({
  documents,
  hasCredentials = true,
  onUpload,
  onDelete,
  onOpenModal,
}: DocumentManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (file: File | null) => {
    if (!hasCredentials) {
      setErrorMessage('Atur provider AI di Settings terlebih dahulu.');
      return;
    }
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya berkas berformat PDF yang diperbolehkan.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah berkas PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!hasCredentials) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section aria-label="Pengelola Dokumen PDF" className="flex-1 flex flex-col min-h-0 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-muted uppercase tracking-wider">
          BERKAS PDF ({documents.length})
        </span>
        {onOpenModal && (
          <button
            type="button"
            onClick={onOpenModal}
            className="text-[10px] font-mono text-muted hover:text-primary transition-colors underline cursor-pointer"
          >
            Kelola
          </button>
        )}
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (hasCredentials) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-3 rounded-md border border-dashed text-center flex flex-col items-center justify-center transition-colors ${
          !hasCredentials
            ? 'border-subtle bg-surface-card/40 opacity-50 cursor-not-allowed'
            : isDragging
            ? 'border-zinc-400 bg-surface-card-hover cursor-pointer'
            : 'border-subtle hover:border-zinc-400 bg-surface-card cursor-pointer'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          disabled={!hasCredentials || isUploading}
          onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
          className="hidden"
          id="pdf-upload-input"
        />
        <label
          htmlFor="pdf-upload-input"
          className={`flex flex-col items-center focus-within:ring-2 focus-within:ring-zinc-400 rounded p-1 ${!hasCredentials ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin my-1" aria-label="Mengunggah berkas…" />
          ) : (
            <UploadCloud className="w-4 h-4 text-muted mb-1" aria-hidden="true" />
          )}
          <span className="text-xs font-medium text-primary">
            {!hasCredentials ? 'Unggah Terkunci' : isUploading ? 'Memproses PDF…' : 'Unggah PDF'}
          </span>
          <span className="text-[10px] font-mono text-muted mt-0.5">Maks 50 MB</span>
        </label>
      </div>

      {errorMessage && (
        <div role="alert" className="p-2 rounded bg-[var(--pastel-red-bg)] border border-[var(--pastel-red-text)]/20 text-[var(--pastel-red-text)] text-xs leading-normal">
          {errorMessage}
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {documents.length === 0 ? (
          <div className="text-center py-6 text-muted text-xs font-mono">
            Kosong
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
                    className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-emerald-500' : 'text-zinc-500'}`}
                    aria-hidden="true"
                  />
                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-primary truncate">{doc.filename}</span>
                      {!isActive && (
                        <span className="text-[9px] font-mono font-semibold px-1 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
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
                  className="p-1 text-muted hover:text-rose-500 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-zinc-400"
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
