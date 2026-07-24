'use client';

import Link from 'next/link';
import { FileText, LogOut, MessageSquare, Plus, Settings, Trash2 } from 'lucide-react';
import type { ChatSession, DocumentItem, ProviderConfig, UserPayload } from '@/types';
import DocumentManager from './DocumentManager';
import { ThemeToggle } from './ThemeToggle';

interface SidebarProps {
  user: UserPayload | null;
  provider: string;
  providerConfigs: ProviderConfig[];
  documents: DocumentItem[];
  sessions?: ChatSession[];
  activeSessionId?: string | null;
  hasCredentials: boolean;
  onProviderChange: (provider: string) => void;
  onNewChat: () => void;
  onSelectSession?: (sessionId: string) => void;
  onDeleteSession?: (sessionId: string) => void;
  onLogout: () => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function Sidebar({
  user,
  provider,
  providerConfigs,
  documents,
  sessions = [],
  activeSessionId = null,
  hasCredentials,
  onProviderChange,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onLogout,
  onUpload,
  onDelete,
}: SidebarProps) {
  const hasConfigs = providerConfigs.length > 0;

  return (
    <aside
      aria-label="Navigasi Utama"
      className="w-[260px] h-screen bg-canvas flex flex-col justify-between p-4 border-r border-subtle shrink-0 select-none relative z-20 transition-colors duration-150"
    >
      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        {/* Branding Header */}
        <div className="flex items-center justify-between pb-3 border-b border-subtle">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-surface-card border border-subtle flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-primary tracking-tight font-serif">
              RAG PDF
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          className="w-full minimal-button-primary py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Percakapan Baru</span>
        </button>

        {/* Chat Sessions History Section */}
        {sessions.length > 0 ? (
          <div className="space-y-1.5 max-h-[140px] flex flex-col min-h-0">
            <div className="text-[10px] font-mono text-muted uppercase tracking-wider px-1">
              PERCAKAPAN ({sessions.length})
            </div>
            <div className="overflow-y-auto space-y-1 pr-1 flex-1">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`group flex items-center justify-between w-full py-1.5 px-2 rounded-md text-xs transition-colors ${
                    activeSessionId === sess.id
                      ? 'bg-surface-card-hover border border-subtle text-primary font-medium'
                      : 'text-secondary hover:text-primary hover:bg-surface-card-hover/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSession?.(sess.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer focus:outline-hidden"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />
                    <span className="truncate text-[11px]">{sess.title}</span>
                  </button>
                  {onDeleteSession ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(sess.id);
                      }}
                      title="Hapus percakapan"
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-rose-500 transition-opacity cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {/* AI Provider Selector */}
        <div className="space-y-1.5">
          <label htmlFor="sidebar-provider-select" className="block text-[10px] font-mono text-muted uppercase tracking-wider">
            PROVIDER AI
          </label>
          {hasConfigs ? (
            <select
              id="sidebar-provider-select"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
              className="minimal-input w-full py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              {providerConfigs.map((config) => (
                <option key={config.id} value={config.provider} className="bg-surface-card text-primary">
                  {config.display_name || config.provider.toUpperCase()} {config.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-2 rounded-md bg-surface-card border border-subtle text-xs">
              <Link href="/dashboard/settings" className="text-[11px] text-muted hover:text-primary hover:underline block focus-visible:ring-2 focus-visible:ring-zinc-400">
                Atur kunci API di Settings &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Embedded Document Manager Section */}
        <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-subtle">
          <DocumentManager
            documents={documents}
            hasCredentials={hasCredentials}
            onUpload={onUpload}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Footer Account & Settings Action Bar */}
      <div className="pt-3 border-t border-subtle space-y-2">
        {/* Row 1: Theme Switcher */}
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-mono text-muted uppercase tracking-wider">TEMA</span>
          <ThemeToggle compact />
        </div>

        {/* Row 2: User Profile Card with Settings & Logout */}
        <div className="flex items-center justify-between p-2 rounded-md bg-surface-card border border-subtle gap-2">
          <div className="flex items-center min-w-0 gap-2 flex-1">
            <div className="w-6.5 h-6.5 rounded-full bg-surface-card-hover border border-subtle flex items-center justify-center text-[10px] font-mono font-medium text-primary shrink-0">
              {(user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <span className="text-xs font-mono text-secondary truncate min-w-0" title={user?.email || 'Pengguna'}>
              {user?.email || 'Pengguna'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/dashboard/settings"
              title="Pengaturan"
              aria-label="Pengaturan"
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-card-hover rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400"
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={onLogout}
              title="Keluar"
              aria-label="Keluar"
              className="p-1.5 text-muted hover:text-rose-500 hover:bg-surface-card-hover rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
