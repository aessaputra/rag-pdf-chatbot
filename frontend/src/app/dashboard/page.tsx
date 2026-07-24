'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import {
  deleteDocument, fetchSSEStream, getEmbeddingConfig, listDocuments,
  listProviderConfigs, uploadDocument
} from '@/lib/api';
import type { ChatMessage, Citation, DocumentItem, EmbeddingConfig, ProviderConfig, UserPayload } from '@/types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import CitationPanel from '@/components/CitationPanel';

function createUserPayload(id: string, email: string | undefined): UserPayload {
  return { user_id: id, email: email || '', role: 'authenticated' };
}

function createChatMessage(id: string, sender: 'user' | 'assistant', content: string): ChatMessage {
  return { id, sender, content, citations: [], created_at: new Date().toISOString() };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState('gemini');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const hasCredentials = providerConfigs.length > 0 && embeddingConfig !== null;

  useEffect(() => {
    let mounted = true;

    async function initializeDashboard() {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) { router.push('/login'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      if (!mounted) return;

      setUser(createUserPayload(authUser.id, authUser.email));
      setToken(session.access_token);

      const [docsRes, provRes, embRes] = await Promise.all([
        listDocuments(session.access_token),
        listProviderConfigs(session.access_token),
        getEmbeddingConfig(session.access_token),
      ]);

      if (!mounted) return;

      if (docsRes.success && docsRes.data) setDocuments(docsRes.data);
      if (provRes.success && provRes.data) {
        setProviderConfigs(provRes.data);
        const defaultConfig = provRes.data.find((c) => c.is_default);
        if (defaultConfig) {
          setProvider(defaultConfig.provider);
        } else if (provRes.data.length > 0) {
          setProvider(provRes.data[0].provider);
        }
      }
      if (embRes.success && embRes.data) setEmbeddingConfig(embRes.data);
    }

    initializeDashboard();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setToken(null);
        router.push('/login');
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setToken(session.access_token);
        setUser(createUserPayload(session.user.id, session.user.email));
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase, router]);

  const reloadDocuments = useCallback(async (accessToken: string) => {
    const res = await listDocuments(accessToken);
    if (res.success && res.data) setDocuments(res.data);
  }, []);

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

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setSelectedCitation(null);
  }, []);

  const updateAssistantMessage = useCallback((assistantId: string, update: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => msg.id === assistantId ? { ...msg, ...update } : msg)
    );
  }, []);

  const handleSendMessage = useCallback(async (query: string) => {
    if (!token) return;

    const assistantId = `assistant-${Date.now()}`;
    const userMsg = createChatMessage(`user-${Date.now()}`, 'user', query);
    const assistantMsg = createChatMessage(assistantId, 'assistant', '');

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    let accumulatedTokens = '';

    await fetchSSEStream(query, token, provider, documents.map((d) => d.id), {
      onCitations: (citations) => updateAssistantMessage(assistantId, { citations }),
      onToken: (tokenText) => {
        accumulatedTokens += tokenText;
        updateAssistantMessage(assistantId, { content: accumulatedTokens });
      },
      onComplete: () => setIsStreaming(false),
      onError: (errorMsg) => {
        updateAssistantMessage(assistantId, { content: `Error: ${errorMsg}` });
        setIsStreaming(false);
      },
    });
  }, [token, provider, documents, updateAssistantMessage]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      <Sidebar
        user={user}
        provider={provider}
        providerConfigs={providerConfigs}
        documents={documents}
        hasCredentials={hasCredentials}
        onProviderChange={setProvider}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        onUpload={handleUploadDocument}
        onDelete={handleDeleteDocument}
      />
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        hasCredentials={hasCredentials}
        onSendMessage={handleSendMessage}
        onSelectCitation={setSelectedCitation}
      />
      <CitationPanel
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
