'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FileCheck, FileText, Lock, Settings, Trash2, UploadCloud } from 'lucide-react';
import type { DocumentItem } from '@/types';

interface DocumentManagerProps {
  documents: DocumentItem[];
  hasCredentials?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function DocumentManager({
  documents,
  hasCredentials = true,
  onUpload,
  onDelete,
}: DocumentManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (file: File | null) => {
    if (!hasCredentials) {
      setErrorMessage('Silakan atur AI Provider & Model Embedding di Settings sebelum mengunggah PDF.');
      return;
    }
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya file berformat PDF (.pdf) yang diperbolehkan.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!hasCredentials) {
      setErrorMessage('Silakan atur AI Provider & Model Embedding di Settings sebelum mengunggah PDF.');
      return;
    }
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-80 glass-panel border-r border-slate-800/80 p-4 flex flex-col h-screen shrink-0">
      <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-800/80">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileText className="w-4 h-4 text-indigo-400" /> Manajer Dokumen PDF
        </h3>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          {documents.length} File
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (hasCredentials) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-6 rounded-2xl border-2 border-dashed transition-all text-center flex flex-col items-center justify-center mb-4 ${
          !hasCredentials
            ? 'border-slate-800 bg-slate-950/60 opacity-60 cursor-not-allowed'
            : isDragging
            ? 'border-cyan-400 bg-cyan-500/10 scale-[0.99] cursor-pointer'
            : 'border-slate-700/80 hover:border-indigo-500/80 bg-slate-900/40 hover:bg-slate-900/80 cursor-pointer'
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
          className={`flex flex-col items-center ${!hasCredentials ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mb-3">
            {!hasCredentials ? (
              <Lock className="w-6 h-6 text-amber-400" />
            ) : isUploading ? (
              <div className="w-6 h-6 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <UploadCloud className="w-6 h-6 text-indigo-400" />
            )}
          </div>
          <span className="text-xs font-medium text-slate-200 mb-1">
            {!hasCredentials
              ? 'Upload PDF Terkunci'
              : isUploading
              ? 'Memproses PDF & Embeddings...'
              : 'Klik / Tarik PDF ke Sini'}
          </span>
          <span className="text-[10px] text-slate-400">
            {!hasCredentials ? 'Atur API Key di Settings untuk membuka' : 'Mendukung file PDF hingga 25MB'}
          </span>
        </label>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Hard Block Warning Box if no credentials */}
      {!hasCredentials && (
        <div className="mb-4 p-3 rounded-xl bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs space-y-1.5">
          <p className="font-semibold text-amber-200 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-400" /> Konfigurasi Diperlukan
          </p>
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            Anda belum mengonfigurasi AI Provider / Embedding Model.
          </p>
          <Link
            href="/dashboard/settings"
            className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline font-medium"
          >
            <Settings className="w-3.5 h-3.5" /> Buka Menu Settings →
          </Link>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1">
        {documents.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            Belum ada dokumen PDF diunggah.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-3 truncate mr-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="truncate">
                  <div className="text-xs font-medium text-slate-200 truncate">{doc.filename}</div>
                  <div className="text-[10px] text-slate-400">{formatFileSize(doc.file_size)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                title="Hapus Dokumen"
                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
