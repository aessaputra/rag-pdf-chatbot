'use client';

import Link from 'next/link';
import { FileText, LogOut, MessageSquare, Plus, Settings, Trash2 } from 'lucide-react';
import type { ChatSession, DocumentItem, ProviderConfig, UserPayload } from '@/types';
import DocumentManager from './DocumentManager';

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
    <aside aria-label="Navigasi Utama" className="w-[260px] h-screen bg-[#09090b] flex flex-col justify-between p-4 border-r border-[#232326] shrink-0 select-none relative z-20">
      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        {/* Branding Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232326]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[#18181b] border border-[#27272a] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-[#fafafa]" aria-hidden="true" />
            </div>
            <span className="text-xs font-semibold text-[#f4f4f5] tracking-tight font-serif">
              RAG PDF
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          className="w-full minimal-button-primary py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#52525b]"
        >
          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Percakapan Baru</span>
        </button>

        {/* Chat Sessions History Section */}
        {sessions.length > 0 ? (
          <div className="space-y-1.5 max-h-[140px] flex flex-col min-h-0">
            <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider px-1">
              PERCAKAPAN ({sessions.length})
            </div>
            <div className="overflow-y-auto space-y-1 pr-1 flex-1">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`group flex items-center justify-between w-full py-1.5 px-2 rounded-md text-xs transition-colors ${
                    activeSessionId === sess.id
                      ? 'bg-[#18181b] border border-[#27272a] text-white font-medium'
                      : 'text-zinc-400 hover:text-white hover:bg-[#121215]'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectSession?.(sess.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer focus:outline-none"
                  >
                    <MessageSquare className="w-3.5 h-3.5 shrink-0 text-zinc-500" aria-hidden="true" />
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
                      className="opacity-0 group-hover:opacity-100 p-1 text-zinc-500 hover:text-rose-400 transition-opacity cursor-pointer"
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
          <label htmlFor="sidebar-provider-select" className="block text-[10px] font-mono text-[#71717a] uppercase tracking-wider">
            PROVIDER AI
          </label>
          {hasConfigs ? (
            <select
              id="sidebar-provider-select"
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
              className="minimal-input w-full py-1.5 px-2 rounded-md text-xs font-medium cursor-pointer focus-visible:ring-2 focus-visible:ring-[#52525b]"
            >
              {providerConfigs.map((config) => (
                <option key={config.id} value={config.provider} className="bg-[#121215] text-[#f4f4f5]">
                  {config.display_name || config.provider.toUpperCase()} {config.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-2 rounded-md bg-[#121215] border border-[#232326] text-xs">
              <Link href="/dashboard/settings" className="text-[11px] text-zinc-400 hover:text-white hover:underline block focus-visible:ring-2 focus-visible:ring-[#52525b]">
                Atur kunci API di Settings &rarr;
              </Link>
            </div>
          )}
        </div>

        {/* Embedded Document Manager Section */}
        <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-[#232326]">
          <DocumentManager
            documents={documents}
            hasCredentials={hasCredentials}
            onUpload={onUpload}
            onDelete={onDelete}
          />
        </div>
      </div>

      {/* Footer Navigation & Account */}
      <div className="pt-3 border-t border-[#232326] space-y-2">
        <Link
          href="/dashboard/settings"
          className="w-full py-2 px-2.5 rounded-md bg-[#121215] hover:bg-[#18181b] border border-[#232326] text-zinc-400 hover:text-white text-xs font-medium transition-colors flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-[#52525b]"
        >
          <Settings className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Pengaturan</span>
        </Link>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[#121215] border border-[#232326]">
          <div className="text-xs font-mono text-zinc-300 truncate mr-2">
            {user?.email || 'Pengguna'}
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar"
            aria-label="Keluar"
            className="p-1 text-zinc-400 hover:text-rose-400 rounded transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b]"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}


