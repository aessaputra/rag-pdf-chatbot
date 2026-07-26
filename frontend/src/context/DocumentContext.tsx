'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { listDocuments, uploadDocument, deleteDocument } from '@/lib/api';
import type { DocumentItem } from '@/types';
import { useApp } from './AppContext';

interface DocumentContextType {
  documents: DocumentItem[];
  isDocModalOpen: boolean;
  activeDocuments: DocumentItem[];
  activeDocumentCount: number;
  primaryDoc: DocumentItem | undefined;
  extraDocsCount: number;
  isInitializingDocs: boolean;
  setIsDocModalOpen: (isOpen: boolean) => void;
  handleUploadDocument: (file: File) => Promise<void>;
  handleDeleteDocument: (id: string) => Promise<void>;
  handleDocumentsUpdated: () => Promise<void>;
}

const DocumentContext = createContext<DocumentContextType | null>(null);

const PROCESSING_POLL_INTERVAL_MS = 5000;

export function DocumentProvider({ children }: { readonly children: React.ReactNode }) {
  const { token } = useApp();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [fetchedTokenDocs, setFetchedTokenDocs] = useState<string | null>(null);

  const isInitializingDocs = token !== fetchedTokenDocs;

  const activeDocuments = useMemo(
    () => documents.filter((d) => (d.is_active ?? true) && d.status === 'ready'),
    [documents]
  );

  const activeDocumentCount = useMemo(
    () => documents.filter((d) => (d.is_active ?? true) && d.status !== 'failed').length,
    [documents]
  );

  const primaryDoc = useMemo(() => activeDocuments[0], [activeDocuments]);
  const extraDocsCount = useMemo(() => Math.max(0, activeDocuments.length - 1), [activeDocuments]);

  const hasProcessingDocuments = useMemo(
    () => documents.some((d) => d.status === 'processing'),
    [documents]
  );

  const reloadDocuments = useCallback(async (accessToken: string) => {
    const res = await listDocuments(accessToken);
    if (res.success && res.data) setDocuments(res.data);
  }, []);

  useEffect(() => {
    if (token) {
      reloadDocuments(token).finally(() => setFetchedTokenDocs(token));
    } else {
      setDocuments([]);
      setFetchedTokenDocs(null);
    }
  }, [token, reloadDocuments]);

  useEffect(() => {
    if (!token || !hasProcessingDocuments) return;
    const intervalId = setInterval(() => {
      void reloadDocuments(token);
    }, PROCESSING_POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [token, hasProcessingDocuments, reloadDocuments]);

  const handleUploadDocument = useCallback(async (file: File) => {
    if (!token) throw new Error('Sesi login telah berakhir.');

    const res = await uploadDocument(file, token);
    if (!res.success) throw new Error(res.error || 'Gagal mengunggah dokumen.');

    await reloadDocuments(token);
  }, [token, reloadDocuments]);

  const handleDeleteDocument = useCallback(async (id: string) => {
    if (!token) return;
    const res = await deleteDocument(id, token);
    if (res.success) setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, [token]);

  const handleDocumentsUpdated = useCallback(async () => {
    if (token) await reloadDocuments(token);
  }, [token, reloadDocuments]);

  const value = useMemo(
    () => ({
      documents,
      isDocModalOpen,
      activeDocuments,
      activeDocumentCount,
      primaryDoc,
      extraDocsCount,
      isInitializingDocs,
      setIsDocModalOpen,
      handleUploadDocument,
      handleDeleteDocument,
      handleDocumentsUpdated,
    }),
    [
      documents,
      isDocModalOpen,
      activeDocuments,
      activeDocumentCount,
      primaryDoc,
      extraDocsCount,
      isInitializingDocs,
      handleUploadDocument,
      handleDeleteDocument,
      handleDocumentsUpdated,
    ]
  );

  return <DocumentContext.Provider value={value}>{children}</DocumentContext.Provider>;
}

export function useDocument() {
  const context = useContext(DocumentContext);
  if (!context) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}
