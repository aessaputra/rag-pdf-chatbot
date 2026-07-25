'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import { listProviderConfigs, getEmbeddingConfig } from '@/lib/api';
import type { EmbeddingConfig, ProviderConfig, UserPayload } from '@/types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

function createUserPayload(id: string, email: string | undefined): UserPayload {
  return { user_id: id, email: email || '', role: 'authenticated' };
}

interface AppContextType {
  user: UserPayload | null;
  token: string | null;
  provider: string;
  providerConfigs: ProviderConfig[];
  embeddingConfig: EmbeddingConfig | null;
  hasCredentials: boolean;
  setProvider: (provider: string) => void;
  setProviderConfigs: React.Dispatch<React.SetStateAction<ProviderConfig[]>>;
  setEmbeddingConfig: React.Dispatch<React.SetStateAction<EmbeddingConfig | null>>;
  handleLogout: () => Promise<void>;
  isInitializing: boolean;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ 
  children,
  initialSession
}: { 
  readonly children: React.ReactNode;
  readonly initialSession: Session;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserPayload | null>(() => 
    initialSession ? createUserPayload(initialSession.user.id, initialSession.user.email) : null
  );
  const [token, setToken] = useState<string | null>(initialSession?.access_token || null);
  const [provider, setProvider] = useState('');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const hasCredentials = useMemo(
    () => providerConfigs.length > 0 && embeddingConfig !== null,
    [providerConfigs, embeddingConfig]
  );

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event: AuthChangeEvent, session: Session | null) => {
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
      subscription.unsubscribe();
    };
  }, [supabase, router]);

  useEffect(() => {
    let mounted = true;

    async function initializeApp() {
      if (!token) {
        setIsInitializing(false);
        return;
      }
      
      setIsInitializing(true);
      const [provRes, embRes] = await Promise.all([
        listProviderConfigs(token),
        getEmbeddingConfig(token),
      ]);

      if (!mounted) return;

      if (provRes.success && provRes.data) {
        setProviderConfigs(provRes.data);
        const defaultConfig = provRes.data.find((c) => c.is_default);
        if (defaultConfig) {
          setProvider(defaultConfig.provider);
        } else if (provRes.data.length > 0) {
          setProvider(provRes.data[0].provider);
        }
      } else {
        setProviderConfigs([]);
      }
      
      if (embRes.success && embRes.data) {
        setEmbeddingConfig(embRes.data);
      } else {
        setEmbeddingConfig(null);
      }
      
      setIsInitializing(false);
    }

    initializeApp();

    return () => {
      mounted = false;
    };
  }, [token]);

  const handleLogout = React.useCallback(async () => {
    await supabase.auth.signOut();
    router.refresh();
    router.push('/login');
  }, [supabase, router]);

  const value = useMemo(
    () => ({
      user,
      token,
      provider,
      providerConfigs,
      embeddingConfig,
      hasCredentials,
      setProvider,
      setProviderConfigs,
      setEmbeddingConfig,
      handleLogout,
      isInitializing,
    }),
    [user, token, provider, providerConfigs, embeddingConfig, hasCredentials, isInitializing, handleLogout]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
