'use client';

import dynamic from 'next/dynamic';
import { AppProvider, useApp } from '@/context/AppContext';
import { DocumentProvider, useDocument } from '@/context/DocumentContext';
import { ChatProvider } from '@/context/ChatContext';
import Sidebar from '@/components/layout/Sidebar';
import ChatWindow from '@/components/chat/ChatWindow';
import CitationPanel from '@/components/chat/CitationPanel';

// Lazy-load heavy document manager modal on demand (`bundle-dynamic-imports`)
const DocumentManagerModal = dynamic(
  () => import('@/components/document-manager/DocumentManagerModal'),
  { ssr: false }
);

function ChatInner() {
  const { token } = useApp();
  const { isDocModalOpen, setIsDocModalOpen, documents, handleDocumentsUpdated } = useDocument();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-canvas text-primary transition-colors duration-150">
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
  return (
    <AppProvider>
      <DocumentProvider>
        <ChatProvider>
          <ChatInner />
        </ChatProvider>
      </DocumentProvider>
    </AppProvider>
  );
}
