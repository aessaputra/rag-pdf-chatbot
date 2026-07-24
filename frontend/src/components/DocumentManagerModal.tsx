'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  FileText,
  UploadCloud,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { DocumentItem } from '@/types';
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  toggleDocumentActive,
  getDocumentPreviewUrl,
} from '@/lib/api';

interface DocumentManagerModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly token: string;
  readonly onDocumentsUpdated?: () => void;
}

export default function DocumentManagerModal({
  isOpen,
  onClose,
  token,
  onDocumentsUpdated,
}: DocumentManagerModalProps) {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [actionDocId, setActionDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocuments = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    const res = await listDocuments(token);
    setLoading(false);
    if (res.success && res.data) {
      setDocuments(res.data);
      onDocumentsUpdated?.();
    } else if (res.error) {
      setError(res.error);
    }
  }, [token, onDocumentsUpdated]);

  useEffect(() => {
    if (isOpen) {
      fetchDocuments();
    }
  }, [isOpen, fetchDocuments]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileUpload = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Hanya berkas PDF yang didukung.');
      return;
    }

    if (file.size > 52428800) { // 50MB
      setError('Ukuran berkas melebihi batas maksimum 50 MB.');
      return;
    }

    setUploading(true);
    setError(null);
    const res = await uploadDocument(file, token);
    setUploading(false);

    if (res.success) {
      fetchDocuments();
    } else {
      setError(res.error || 'Gagal mengunggah berkas.');
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleToggleActive = async (doc: DocumentItem) => {
    const newStatus = !(doc.is_active ?? true);
    setActionDocId(doc.id);
    setError(null);

    // Optimistic UI update
    setDocuments((prev) =>
      prev.map((d) => (d.id === doc.id ? { ...d, is_active: newStatus } : d))
    );

    const res = await toggleDocumentActive(doc.id, newStatus, token);
    setActionDocId(null);

    if (res.success) {
      onDocumentsUpdated?.();
    } else {
      // Revert optimistic update
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, is_active: !newStatus } : d))
      );
      setError(res.error || 'Gagal mengubah status dokumen.');
    }
  };

  const handlePreview = async (docId: string) => {
    setActionDocId(docId);
    setError(null);
    const res = await getDocumentPreviewUrl(docId, token);
    setActionDocId(null);

    if (res.success && res.data?.signed_url) {
      window.open(res.data.signed_url, '_blank', 'noopener,noreferrer');
    } else {
      setError(res.error || 'Gagal mengambil URL preview.');
    }
  };

  const handleDelete = async (docId: string) => {
    setActionDocId(docId);
    setError(null);

    const res = await deleteDocument(docId, token);
    setActionDocId(null);
    setDeletingId(null);

    if (res.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      onDocumentsUpdated?.();
    } else {
      setError(res.error || 'Gagal menghapus dokumen.');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-zinc-400" />
            <h2 id="document-modal-title" className="text-base font-semibold text-zinc-100">
              Dokumen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-2.5 p-3 text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upload Dropzone */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragOver
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/30'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
            />
            <div className="flex flex-col items-center justify-center gap-2">
              {uploading ? (
                <>
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                  <p className="text-xs font-medium text-zinc-300">Mengunggah & Memproses PDF...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="w-8 h-8 text-zinc-500" />
                  <p className="text-sm font-medium text-zinc-200">Unggah PDF</p>
                  <p className="text-xs text-zinc-500">Maks. 50 MB</p>
                </>
              )}
            </div>
          </div>

          {/* Document List */}
          <div className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400 px-1">
              Daftar Dokumen ({documents.length})
            </h3>

            {loading && documents.length === 0 ? (
              <div className="flex justify-center items-center py-10">
                <Loader2 className="w-6 h-6 text-zinc-500 animate-spin" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-xs text-zinc-500 border border-zinc-800/60 rounded-lg">
                Belum ada dokumen yang diunggah.
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const isActive = doc.is_active ?? true;
                  const isProcessing = doc.status === 'processing';
                  const isFailed = doc.status === 'failed';
                  const isBusy = actionDocId === doc.id;

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-lg hover:border-zinc-700/80 transition-colors"
                    >
                      {/* Left: Info & Badges */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-zinc-200 truncate" title={doc.filename}>
                              {doc.filename}
                            </span>
                            {/* Status Badge */}
                            {isProcessing ? (
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                                <Loader2 className="w-2.5 h-2.5 animate-spin" />
                                PROSES
                              </span>
                            ) : isFailed ? (
                              <span className="bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                                GAGAL
                              </span>
                            ) : isActive ? (
                              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                                AKTIF
                              </span>
                            ) : (
                              <span className="bg-zinc-800/60 text-zinc-400 border border-zinc-700/50 text-[10px] tracking-wider font-semibold px-2 py-0.5 rounded-full shrink-0">
                                OFF
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-500">
                            <span>{formatFileSize(doc.file_size)}</span>
                            {doc.total_pages && <span>• {doc.total_pages} hal</span>}
                          </div>
                        </div>
                      </div>

                      {/* Right: Actions */}
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        {/* Toggle Switch */}
                        <button
                          onClick={() => handleToggleActive(doc)}
                          disabled={isBusy || isProcessing}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                            isActive ? 'bg-emerald-500' : 'bg-zinc-700'
                          } ${isBusy || isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                          title={isActive ? 'Nonaktifkan RAG' : 'Aktifkan RAG'}
                          aria-label={`Toggle status ${doc.filename}`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                              isActive ? 'translate-x-4' : 'translate-x-0'
                            }`}
                          />
                        </button>

                        {/* Preview Button */}
                        <button
                          onClick={() => handlePreview(doc.id)}
                          disabled={isBusy}
                          className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                          title="Preview PDF"
                          aria-label={`Preview ${doc.filename}`}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        {deletingId === doc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(doc.id)}
                              disabled={isBusy}
                              className="px-2 py-0.5 text-[10px] font-medium text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded hover:bg-rose-500/20 transition-colors"
                            >
                              Hapus
                            </button>
                            <button
                              onClick={() => setDeletingId(null)}
                              className="px-1.5 py-0.5 text-[10px] text-zinc-400 hover:text-zinc-200"
                            >
                              Batal
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeletingId(doc.id)}
                            disabled={isBusy}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-md transition-colors"
                            title="Hapus Dokumen"
                            aria-label={`Hapus ${doc.filename}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
