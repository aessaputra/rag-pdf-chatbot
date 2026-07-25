'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import {
  deleteChatSession,
  deleteDocument,
  fetchSSEStream,
  getEmbeddingConfig,
  getSessionMessages,
  listChatSessions,
  listDocuments,
  listProviderConfigs,
  uploadDocument,
} from '@/lib/api';
import type {
  ChatMessage,
  ChatSession,
  Citation,
  DocumentItem,
  EmbeddingConfig,
  ProviderConfig,
  UserPayload,
} from '@/types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

function createUserPayload(id: string, email: string | undefined): UserPayload {
  return { user_id: id, email: email || '', role: 'authenticated' };
}

function createChatMessage(id: string, sender: 'user' | 'assistant', content: string): ChatMessage {
  return { id, sender, content, citations: [], created_at: new Date().toISOString() };
}

interface DashboardContextType {
  // State
  user: UserPayload | null;
  token: string | null;
  provider: string;
  providerConfigs: ProviderConfig[];
  embeddingConfig: EmbeddingConfig | null;
  documents: DocumentItem[];
  sessions: ChatSession[];
  activeSessionId: string | null;
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedCitation: Citation | null;
  isDocModalOpen: boolean;
  hasCredentials: boolean;

  // Derived State (Memoized)
  activeDocuments: DocumentItem[];
  activeDocumentCount: number;
  primaryDoc: DocumentItem | undefined;
  extraDocsCount: number;

  // Actions
  setProvider: (provider: string) => void;
  setSelectedCitation: (citation: Citation | null) => void;
  setIsDocModalOpen: (isOpen: boolean) => void;
  handleNewChat: () => void;
  handleSelectSession: (sessionId: string) => Promise<void>;
  handleDeleteSession: (sessionId: string) => Promise<void>;
  handleSendMessage: (query: string) => Promise<void>;
  handleUploadDocument: (file: File) => Promise<void>;
  handleDeleteDocument: (id: string) => Promise<void>;
  handleDocumentsUpdated: () => Promise<void>;
  handleLogout: () => Promise<void>;
}

const DashboardContext = createContext<DashboardContextType | null>(null);

export function DashboardProvider({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);

  // Derived state memoized (`rerender-derived-state-no-effect`)
  const hasCredentials = useMemo(
    () => providerConfigs.length > 0 && embeddingConfig !== null,
    [providerConfigs, embeddingConfig]
  );

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

  const reloadSessions = useCallback(async (accessToken: string) => {
    const res = await listChatSessions(accessToken);
    if (res.success && res.data) {
      setSessions(res.data);
      return res.data;
    }
    return [];
  }, []);

  const loadSessionMessages = useCallback(async (sessionId: string, accessToken: string) => {
    if (!sessionId || !accessToken) return;
    setActiveSessionId(sessionId);
    const res = await getSessionMessages(sessionId, accessToken);
    if (res.success && res.data) {
      setMessages(res.data);
    } else {
      console.error('Gagal memuat pesan sesi:', res.error);
    }
  }, []);

  const reloadDocuments = useCallback(async (accessToken: string) => {
    const res = await listDocuments(accessToken);
    if (res.success && res.data) setDocuments(res.data);
  }, []);

  // Parallel initial data fetching (`async-parallel`)
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

      // Execute initial queries in parallel
      const [docsRes, provRes, embRes, sessRes] = await Promise.all([
        listDocuments(session.access_token),
        listProviderConfigs(session.access_token),
        getEmbeddingConfig(session.access_token),
        listChatSessions(session.access_token),
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

      if (sessRes.success && sessRes.data && sessRes.data.length > 0) {
        setSessions(sessRes.data);
        const latestSessionId = sessRes.data[0].id;
        // Non-blocking load of initial messages
        loadSessionMessages(latestSessionId, session.access_token);
      }
    }

    initializeDashboard();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
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
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, router, loadSessionMessages]);

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
    setActiveSessionId(null);
    setMessages([]);
    setSelectedCitation(null);
  }, []);

  const handleSelectSession = useCallback(async (sessionId: string) => {
    if (!token) return;
    setSelectedCitation(null);
    await loadSessionMessages(sessionId, token);
  }, [token, loadSessionMessages]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!token) return;
    const res = await deleteChatSession(sessionId, token);
    if (res.success) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (activeSessionId === sessionId) {
        handleNewChat();
      }
    }
  }, [token, activeSessionId, handleNewChat]);

  const updateAssistantMessage = useCallback((assistantId: string, update: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === assistantId ? { ...msg, ...update } : msg))
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

    const activeDocIds = documents
      .filter((d) => (d.is_active ?? true) && d.status === 'ready')
      .map((d) => d.id);

    await fetchSSEStream(
      query,
      token,
      provider,
      activeDocIds,
      {
        onSession: (sessId) => {
          setActiveSessionId(sessId);
          reloadSessions(token);
        },
        onCitations: (citations) => updateAssistantMessage(assistantId, { citations }),
        onToken: (tokenText) => {
          accumulatedTokens += tokenText;
          updateAssistantMessage(assistantId, { content: accumulatedTokens });
        },
        onComplete: () => {
          setIsStreaming(false);
          reloadSessions(token);
        },
        onError: (errorMsg) => {
          updateAssistantMessage(assistantId, { content: `Error: ${errorMsg}` });
          setIsStreaming(false);
        },
      },
      activeSessionId || undefined
    );
  }, [token, provider, documents, activeSessionId, updateAssistantMessage, reloadSessions]);

  const handleDocumentsUpdated = useCallback(async () => {
    if (token) await reloadDocuments(token);
  }, [token, reloadDocuments]);

  const value = useMemo(
    () => ({
      user,
      token,
      provider,
      providerConfigs,
      embeddingConfig,
      documents,
      sessions,
      activeSessionId,
      messages,
      isStreaming,
      selectedCitation,
      isDocModalOpen,
      hasCredentials,
      activeDocuments,
      activeDocumentCount,
      primaryDoc,
      extraDocsCount,
      setProvider,
      setSelectedCitation,
      setIsDocModalOpen,
      handleNewChat,
      handleSelectSession,
      handleDeleteSession,
      handleSendMessage,
      handleUploadDocument,
      handleDeleteDocument,
      handleDocumentsUpdated,
      handleLogout,
    }),
    [
      user,
      token,
      provider,
      providerConfigs,
      embeddingConfig,
      documents,
      sessions,
      activeSessionId,
      messages,
      isStreaming,
      selectedCitation,
      isDocModalOpen,
      hasCredentials,
      activeDocuments,
      activeDocumentCount,
      primaryDoc,
      extraDocsCount,
      handleNewChat,
      handleSelectSession,
      handleDeleteSession,
      handleSendMessage,
      handleUploadDocument,
      handleDeleteDocument,
      handleDocumentsUpdated,
      handleLogout,
    ]
  );

  return <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) {
    throw new Error('useDashboard must be used within a DashboardProvider');
  }
  return context;
}
