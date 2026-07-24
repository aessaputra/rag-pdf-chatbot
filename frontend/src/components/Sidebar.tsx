'use client';

import Link from 'next/link';
import { Bot, FileText, LogOut, MessageSquarePlus, Settings, Sparkles } from 'lucide-react';
import type { ProviderConfig, UserPayload } from '@/types';

interface SidebarProps {
  user: UserPayload | null;
  provider: string;
  providerConfigs: ProviderConfig[];
  onProviderChange: (provider: string) => void;
  onNewChat: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  user,
  provider,
  providerConfigs,
  onProviderChange,
  onNewChat,
  onLogout,
}: SidebarProps) {
  const hasConfigs = providerConfigs.length > 0;

  return (
    <aside className="w-72 h-screen glass-panel flex flex-col justify-between p-4 border-r border-slate-800/80 shrink-0 select-none">
      <div>
        {/* Branding Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-6 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
              RAG PDF <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            </h2>
            <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">
              AI Assistant v1.0
            </span>
          </div>
        </div>

        {/* New Chat Button */}
        <button
          type="button"
          onClick={onNewChat}
          className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white font-medium text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2 mb-6"
        >
          <MessageSquarePlus className="w-4 h-4" />
          Chat Percakapan Baru
        </button>

        {/* LLM Provider Selector */}
        <div className="mb-6 px-2 space-y-2">
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-indigo-400" /> Model Provider AI
          </label>

          {hasConfigs ? (
            <select
              value={provider}
              onChange={(e) => onProviderChange(e.target.value)}
              className="w-full glass-input py-2 px-3 rounded-lg text-xs font-medium text-slate-200 cursor-pointer"
            >
              {providerConfigs.map((config) => (
                <option key={config.id} value={config.provider} className="bg-slate-900 text-white">
                  {config.display_name || config.provider.toUpperCase()} {config.is_default ? '(Default)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-800/60 text-amber-300 text-xs space-y-1.5">
              <p className="font-medium text-[11px]">Belum Ada Provider</p>
              <p className="text-[10px] text-amber-400/80 leading-relaxed">
                Silakan tambahkan API key di menu Settings untuk mengaktifkan AI.
              </p>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline pt-0.5"
              >
                <Settings className="w-3 h-3" /> Config di Settings →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Footer & Navigation Link to Settings */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80">
        <Link
          href="/dashboard/settings"
          className="w-full py-2.5 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white text-xs font-medium transition-all flex items-center gap-2"
        >
          <Settings className="w-4 h-4 text-cyan-400" />
          <span>Pengaturan AI & BYOK</span>
        </Link>

        <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-slate-900/60 border border-slate-800/60">
          <div className="truncate mr-2">
            <div className="text-xs font-medium text-slate-200 truncate">
              {user?.email || 'Pengguna'}
            </div>
            <div className="text-[10px] text-slate-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Terotentikasi
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            title="Keluar Akun"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
