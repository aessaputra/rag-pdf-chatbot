'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { deleteDocument, fetchSSEStream, listDocuments, uploadDocument } from '@/lib/api';
import type { ChatMessage, Citation, DocumentItem, UserPayload } from '@/types';

import Sidebar from '@/components/Sidebar';
import DocumentManager from '@/components/DocumentManager';
import ChatWindow from '@/components/ChatWindow';
import CitationPanel from '@/components/CitationPanel';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState<string>('gemini');

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  // 1. Verify Authentication Session
  useEffect(() => {
    async function checkAuth() {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.push('/login');
        return;
      }

      const sessionUser = data.session.user;
      setUser({
        user_id: sessionUser.id,
        email: sessionUser.email || '',
        role: 'authenticated',
      });
      setToken(data.session.access_token);

      // Load Documents
      const docsRes = await listDocuments(data.session.access_token);
      if (docsRes.success && docsRes.data) {
        setDocuments(docsRes.data);
      }
    }

    checkAuth();
  }, [router, supabase.auth]);

  // 2. Handle PDF Upload
  const handleUploadDocument = async (file: File) => {
    if (!token) return;
    const res = await uploadDocument(file, token);
    if (res.success) {
      // Reload Document List
      const docsRes = await listDocuments(token);
      if (docsRes.success && docsRes.data) {
        setDocuments(docsRes.data);
      }
    } else {
      throw new Error(res.error || 'Gagal mengunggah dokumen.');
    }
  };

  // 3. Handle PDF Delete
  const handleDeleteDocument = async (id: string) => {
    if (!token) return;
    const res = await deleteDocument(id, token);
    if (res.success) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
    }
  };

  // 4. Handle Logout
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  // 5. Handle New Chat
  const handleNewChat = () => {
    setMessages([]);
    setSelectedCitation(null);
  };

  // 6. Handle Send Message with SSE Streaming
  const handleSendMessage = async (query: string) => {
    if (!token) return;

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const newUserMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      content: query,
      created_at: new Date().toISOString(),
    };

    const newAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      content: '',
      citations: [],
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMsg, newAssistantMsg]);
    setIsStreaming(true);

    let streamCitations: Citation[] = [];
    let streamTokens = '';

    await fetchSSEStream(
      query,
      token,
      provider,
      documents.map((d) => d.id),
      (citations) => {
        streamCitations = citations;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, citations: streamCitations }
              : msg
          )
        );
      },
      (tokenText) => {
        streamTokens += tokenText;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: streamTokens }
              : msg
          )
        );
      },
      () => {
        setIsStreaming(false);
      },
      (errorMsg) => {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? { ...msg, content: `Error: ${errorMsg}` }
              : msg
          )
        );
        setIsStreaming(false);
      }
    );
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100">
      {/* Sidebar Component */}
      <Sidebar
        user={user}
        provider={provider}
        onProviderChange={setProvider}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
      />

      {/* Document Manager Component */}
      <DocumentManager
        documents={documents}
        onUpload={handleUploadDocument}
        onDelete={handleDeleteDocument}
      />

      {/* Chat Window Component */}
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        onSendMessage={handleSendMessage}
        onSelectCitation={setSelectedCitation}
      />

      {/* Citation Panel Drawer Component */}
      <CitationPanel
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
