'use client';

import React, { createContext, useContext, useState, useMemo, ReactNode } from 'react';

interface SidebarContextType {
  isOpen: boolean;
  toggle: () => void;
  setIsOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { readonly children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(true);
  const toggle = React.useCallback(() => setIsOpen((prev) => !prev), []);
  const value = useMemo(() => ({ isOpen, toggle, setIsOpen }), [isOpen, toggle]);

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error('useSidebar must be used within SidebarProvider');
  }
  return ctx;
}
