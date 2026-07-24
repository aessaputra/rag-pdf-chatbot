'use client';

import Link from 'next/link';
import { Bot, FileText, LogOut, Plus, Settings } from 'lucide-react';
import type { DocumentItem, ProviderConfig, UserPayload } from '@/types';
import DocumentManager from './DocumentManager';

interface SidebarProps {
  user: UserPayload | null;
  provider: string;
  providerConfigs: ProviderConfig[];
  documents: DocumentItem[];
  hasCredentials: boolean;
  onProviderChange: (provider: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function Sidebar({
  user,
  provider,
  providerConfigs,
  documents,
  hasCredentials,
  onProviderChange,
  onNewChat,
  onLogout,
  onUpload,
  onDelete,
}: SidebarProps) {
  const hasConfigs = providerConfigs.length > 0;

  return (
    <aside className="w-[280px] h-screen bg-[#09090b] flex flex-col justify-between p-4 border-r border-[#232326] shrink-0 select-none">
      <div className="flex flex-col flex-1 min-h-0 space-y-4">
        {/* Branding Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#232326]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#18181b] border border-[#27272a] flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-[#fafafa]" />
            </div>
            <span className="text-sm font-semibold text-[#f4f4f5] tracking-tight">
              RAG PDF
            </span>
          </div>
          <span className="text-[10px] font-mono text-[#a1a1aa] px-1.5 py-0.5 rounded bg-[#18181b] border border-[#27272a]">
            v1.0
          </span>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          className="w-full minimal-button-primary py-2 px-3 rounded-lg text-xs flex items-center justify-center gap-2"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Chat Percakapan Baru</span>
        </button>

        {/* AI Provider Selector */}
        <div className="space-y-1.5">
          <label className="block text-[10px] font-medium text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3 h-3 text-[#a1a1aa]" /> Model Provider
          </label>
          {hasConfigs ? (
            <select
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
              className="minimal-input w-full py-1.5 px-2.5 rounded-lg text-xs font-medium cursor-pointer"
            >
              {providerConfigs.map((config) => (
                <option key={config.id} value={config.provider} className="bg-[#121215] text-[#f4f4f5]">
                  {config.display_name || config.provider.toUpperCase()} {config.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-2.5 rounded-lg bg-[#451a03]/30 border border-[#78350f]/50 text-[#fde68a] text-xs space-y-1">
              <p className="font-medium text-[11px]">Belum Ada Provider</p>
              <Link href="/dashboard/settings" className="text-[10px] text-[#fde68a] hover:underline block pt-0.5">
                Config di Settings →
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
          className="w-full py-2 px-2.5 rounded-lg bg-[#121215] hover:bg-[#18181b] border border-[#232326] text-[#a1a1aa] hover:text-[#f4f4f5] text-xs font-medium transition-colors flex items-center gap-2"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Pengaturan AI & BYOK</span>
        </Link>

        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-[#121215] border border-[#232326]">
          <div className="truncate mr-2">
            <div className="text-xs font-medium text-[#f4f4f5] truncate">
              {user?.email || 'Pengguna'}
            </div>
            <div className="text-[10px] font-mono text-[#a1a1aa] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Online
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar Akun"
            className="p-1 text-[#a1a1aa] hover:text-rose-400 rounded transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
