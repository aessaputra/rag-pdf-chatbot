'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FileCheck, FileText, Lock, Trash2, UploadCloud } from 'lucide-react';
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
      setErrorMessage('Atur AI Provider & Embedding di Settings terlebih dahulu.');
      return;
    }
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya file .pdf yang diperbolehkan.');
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
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Dokumen PDF ({documents.length})
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
        className={`p-3 rounded-lg border border-dashed text-center flex flex-col items-center justify-center transition-colors ${
          !hasCredentials
            ? 'border-[#232326] bg-[#121215]/40 opacity-50 cursor-not-allowed'
            : isDragging
            ? 'border-[#fafafa] bg-[#18181b] cursor-pointer'
            : 'border-[#27272a] hover:border-[#52525b] bg-[#121215] cursor-pointer'
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
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin my-1" />
          ) : (
            <UploadCloud className="w-4 h-4 text-[#a1a1aa] mb-1" />
          )}
          <span className="text-[11px] font-medium text-[#f4f4f5]">
            {!hasCredentials ? 'Upload PDF Terkunci' : isUploading ? 'Memproses PDF...' : 'Unggah PDF Baru'}
          </span>
          <span className="text-[9px] text-[#a1a1aa]">Maksimal 25MB</span>
        </label>
      </div>

      {errorMessage && (
        <div className="p-2 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[10px] flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {documents.length === 0 ? (
          <div className="text-center py-6 text-[#71717a] text-[11px]">
            Belum ada PDF diunggah.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-2 rounded-lg bg-[#121215] border border-[#232326] hover:border-[#27272a] flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-2 truncate mr-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[11px] font-medium text-[#f4f4f5] truncate">{doc.filename}</div>
                  <div className="text-[9px] font-mono text-[#a1a1aa]">{formatFileSize(doc.file_size)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                title="Hapus Dokumen"
                className="p-1 text-[#71717a] hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
