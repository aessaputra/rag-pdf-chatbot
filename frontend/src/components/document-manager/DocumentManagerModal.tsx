'use client';

import React, { useState, useEffect } from 'react';
import { Cross1Icon, FileTextIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { DocumentItem } from '@/types';
import { toggleDocumentActive, getDocumentPreviewUrl } from '@/lib/api';
import { useDocument } from '@/context/DocumentContext';
import { DocumentDropzone } from './DocumentDropzone';
import { DocumentList } from './DocumentList';

interface DocumentManagerModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly token: string;
  readonly documents: DocumentItem[];
  readonly onDocumentsUpdated: () => void;
}

export default function DocumentManagerModal({
  isOpen,
  onClose,
  token,
  documents,
  onDocumentsUpdated,
}: DocumentManagerModalProps) {
  const { handleUploadDocument, handleDeleteDocument } = useDocument();

  const [uploading, setUploading] = useState(false);
  const [actionDocId, setActionDocId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (file.size > 52428800) {
      setError('Ukuran berkas melebihi batas maksimum 50 MB.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      await handleUploadDocument(file);
      onDocumentsUpdated();
    } catch (err: any) {
      setError(err.message || 'Gagal mengunggah berkas.');
    } finally {
      setUploading(false);
    }
  };

  const handleToggleActive = async (doc: DocumentItem) => {
    const newStatus = !(doc.is_active ?? true);
    setActionDocId(doc.id);
    setError(null);
    const res = await toggleDocumentActive(doc.id, newStatus, token);
    setActionDocId(null);
    if (res.success) {
      onDocumentsUpdated();
    } else {
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
    try {
      await handleDeleteDocument(docId);
      onDocumentsUpdated();
    } catch (err: any) {
      setError(err.message || 'Gagal menghapus dokumen.');
    } finally {
      setActionDocId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4 bg-black/60 backdrop-blur-xs">
      <div
        className="w-full h-full sm:h-auto sm:max-w-2xl bg-canvas border border-subtle sm:rounded-xl shadow-2xl overflow-hidden flex flex-col sm:max-h-full text-primary"
        role="dialog"
        aria-modal="true"
        aria-labelledby="document-modal-title"
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-subtle bg-surface-card">
          <div className="flex items-center gap-2.5">
            <FileTextIcon className="w-5 h-5 text-muted" />
            <h2 id="document-modal-title" className="text-base font-semibold text-primary">
              Dokumen
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-3 md:p-1 text-muted hover:text-primary rounded-lg hover:bg-surface-card-hover transition-colors cursor-pointer focus-visible:ring-2"
          >
            <Cross1Icon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {error && (
            <div className="flex items-center gap-2.5 p-3 text-xs text-rose-500 bg-rose-500/10 border border-rose-500/20 rounded-lg">
              <ExclamationTriangleIcon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <DocumentDropzone
            onFileUpload={handleFileUpload}
            uploading={uploading}
          />

          <DocumentList
            documents={documents}
            actionDocId={actionDocId}
            onToggleActive={handleToggleActive}
            onPreview={handlePreview}
            onDelete={handleDelete}
          />
        </div>
      </div>
    </div>
  );
}
