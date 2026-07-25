'use client';

import dynamic from 'next/dynamic';
import { useApp } from '@/context/AppContext';
import { useDocument } from '@/context/DocumentContext';
import { useChat } from '@/context/ChatContext';
import Sidebar from '@/components/layout/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import CitationPanel from '@/components/chat/CitationPanel';


const DocumentManagerModal = dynamic(
  () => import('@/components/document-manager/DocumentManagerModal'),
  { ssr: false }
);

function ChatInner() {
  const { token, isInitializing } = useApp();
  const { isDocModalOpen, setIsDocModalOpen, documents, handleDocumentsUpdated, isInitializingDocs } = useDocument();
  const { isInitializingSessions } = useChat();

  const isPageLoading = isInitializing || isInitializingDocs || isInitializingSessions;

  if (isPageLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-canvas text-primary">
        <div className="flex items-center gap-3 text-muted text-sm font-mono animate-pulse">
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          Memuat aplikasi...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-primary">
      <Sidebar />
      <ChatWindow />
      <CitationPanel />
      {token && isDocModalOpen && (
        <DocumentManagerModal
          isOpen={isDocModalOpen}
          onClose={() => setIsDocModalOpen(false)}
          token={token}
          documents={documents}
          onDocumentsUpdated={handleDocumentsUpdated}
        />
      )}
    </div>
  );
}

export default function ChatPage() {
  return <ChatInner />;
}
