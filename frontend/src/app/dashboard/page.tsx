'use client';

import dynamic from 'next/dynamic';
import { DashboardProvider, useDashboard } from '@/context/DashboardContext';
import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import CitationPanel from '@/components/CitationPanel';

// Lazy-load heavy document manager modal on demand (`bundle-dynamic-imports`)
const DocumentManagerModal = dynamic(
  () => import('@/components/DocumentManagerModal'),
  { ssr: false }
);

function DashboardInner() {
  const { token, isDocModalOpen, setIsDocModalOpen, documents, handleDocumentsUpdated } = useDashboard();

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

export default function DashboardPage() {
  return (
    <DashboardProvider>
      <DashboardInner />
    </DashboardProvider>
  );
}
