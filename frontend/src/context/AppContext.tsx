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
  handleLogout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);

  const hasCredentials = useMemo(
    () => providerConfigs.length > 0 && embeddingConfig !== null,
    [providerConfigs, embeddingConfig]
  );

  useEffect(() => {
    let mounted = true;

    async function initializeApp() {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) { router.push('/login'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      if (!mounted) return;

      setUser(createUserPayload(authUser.id, authUser.email));
      setToken(session.access_token);

      const [provRes, embRes] = await Promise.all([
        listProviderConfigs(session.access_token),
        getEmbeddingConfig(session.access_token),
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
      }
      if (embRes.success && embRes.data) setEmbeddingConfig(embRes.data);
    }

    initializeApp();

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
  }, [supabase, router]);

  const handleLogout = React.useCallback(async () => {
    await supabase.auth.signOut();
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
      handleLogout,
    }),
    [user, token, provider, providerConfigs, embeddingConfig, hasCredentials, handleLogout]
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
