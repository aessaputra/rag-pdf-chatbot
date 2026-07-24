'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Bot, Check, ChevronDown, FileText, Lock, Settings, Sparkles } from 'lucide-react';
import type { ChatMessage, Citation, ProviderConfig } from '@/types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  hasCredentials?: boolean;
  activeDocumentCount?: number;
  provider?: string;
  providerConfigs?: ProviderConfig[];
  onProviderChange?: (provider: string) => void;
  onSendMessage: (query: string) => Promise<void>;
  onSelectCitation: (citation: Citation) => void;
  onOpenDocumentModal?: () => void;
}

export default function ChatWindow({
  messages,
  isStreaming,
  hasCredentials = true,
  activeDocumentCount = 0,
  provider,
  providerConfigs = [],
  onProviderChange,
  onSendMessage,
  onSelectCitation,
  onOpenDocumentModal,
}: ChatWindowProps) {
  const [inputQuery, setInputQuery] = useState('');
  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const providerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) {
        setIsProviderOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeConfig = providerConfigs.find((c) => c.provider === provider) || providerConfigs[0];
  const activeLabel = activeConfig
    ? `${activeConfig.display_name || activeConfig.provider.toUpperCase()}${activeConfig.is_default ? ' (Default)' : ''}`
    : provider?.toUpperCase() || 'Pilih Provider';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasCredentials || !inputQuery.trim() || isStreaming) return;
    const query = inputQuery;
    setInputQuery('');
    await onSendMessage(query);
  };

  return (
    <main aria-label="Ruang Percakapan Chat" className="flex-1 flex flex-col h-screen bg-canvas text-primary relative z-10 transition-colors duration-150">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!hasCredentials ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-xs mx-auto">
            <div className="w-10 h-10 rounded-md bg-surface-card border border-subtle flex items-center justify-center mb-4">
              <Lock className="w-4 h-4 text-muted" aria-hidden="true" />
            </div>
            <h2 className="text-base font-serif font-semibold text-primary mb-1.5">
              Konfigurasi Kunci API
            </h2>
            <p className="text-xs text-muted mb-4 leading-normal">
              Atur provider AI di Pengaturan untuk memulai.
            </p>
            <Link
              href="/dashboard/settings"
              className="minimal-button-primary py-2 px-4 rounded-md text-xs font-medium flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pengaturan</span>
            </Link>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            {activeDocumentCount === 0 ? (
              <>
                <div className="p-3 rounded-full bg-surface-card border border-subtle mb-4 text-muted">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-serif text-primary tracking-tight mb-4">
                  Belum ada dokumen aktif.
                </h2>
                {onOpenDocumentModal && (
                  <button
                    type="button"
                    onClick={onOpenDocumentModal}
                    className="py-1.5 px-3 rounded-md text-xs font-medium text-secondary hover:text-primary bg-surface-card hover:bg-surface-card-hover border border-subtle transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Kelola Dokumen</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="p-3 rounded-full bg-surface-card border border-subtle mb-4 text-muted">
                  <Sparkles className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-serif text-primary tracking-tight">
                  Tanyakan tentang dokumen Anda.
                </h2>
              </>
            )}
          </div>
        ) : (
          messages.map((msg, index) => (
            <article
              key={index}
              className={`flex flex-col ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Header Label */}
              <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {msg.sender === 'user' ? (
                  <span>ANDA</span>
                ) : (
                  <span className="flex items-center gap-1 text-secondary">
                    <Bot className="w-3 h-3" aria-hidden="true" />
                    <span>ASISTEN AI</span>
                  </span>
                )}
              </div>

              {/* Message Body */}
              <div
                className={`text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'p-3.5 rounded-xl bg-surface-card-hover border border-subtle text-primary max-w-lg shadow-xs'
                    : 'bg-transparent text-primary w-full'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Compact Non-Redundant Citation Badges */}
                {msg.citations && msg.citations.length > 0 ? (
                  <div className="mt-4 pt-3 border-t border-subtle space-y-2">
                    <div className="text-[10px] font-mono text-muted uppercase tracking-wider">
                      SUMBER
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSelectCitation(c)}
                          aria-label={`Buka sitasi ${c.filename} halaman ${c.page_number}`}
                          className="py-1 px-2.5 rounded-md bg-surface-card hover:bg-surface-card-hover border border-subtle text-secondary hover:text-primary text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400"
                        >
                          <FileText className="w-3 h-3 text-muted" aria-hidden="true" />
                          <span>Hal {c.page_number}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Box - Unified Compound Bar */}
      <div className="p-4 border-t border-subtle bg-canvas">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-center gap-2 p-1.5 pl-3 rounded-xl bg-surface-card border border-subtle focus-within:ring-2 focus-within:ring-zinc-400/50 focus-within:border-zinc-400 transition-all duration-150 shadow-2xs"
        >
          {/* Integrated AI Model Selector Custom Dropdown Popover */}
          {providerConfigs && providerConfigs.length > 0 ? (
            <div ref={providerRef} className="relative flex items-center shrink-0 border-r border-subtle pr-2.5 mr-0.5">
              <button
                type="button"
                onClick={() => setIsProviderOpen((prev) => !prev)}
                disabled={isStreaming}
                aria-expanded={isProviderOpen}
                aria-haspopup="listbox"
                aria-label="Pilih Provider AI"
                className="flex items-center gap-1.5 text-xs font-mono font-medium text-secondary hover:text-primary transition-colors cursor-pointer py-1 px-1 rounded-md focus-visible:ring-1 focus-visible:ring-zinc-400 focus:outline-none"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />
                <span className="truncate max-w-[140px]">{activeLabel}</span>
                <ChevronDown className={`w-3 h-3 shrink-0 text-muted transition-transform duration-150 ${isProviderOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {/* Custom Floating Popover Dropdown Menu */}
              {isProviderOpen && (
                <div
                  role="listbox"
                  aria-label="Daftar Provider AI"
                  className="absolute bottom-full mb-2 left-0 z-50 min-w-[200px] p-1 rounded-lg bg-surface-card border border-subtle shadow-md animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
                >
                  <div className="px-2.5 py-1 text-[10px] font-mono text-muted uppercase tracking-wider border-b border-subtle mb-1">
                    PROVIDER AI
                  </div>
                  {providerConfigs.map((config) => {
                    const isSelected = config.provider === provider;
                    const label = `${config.display_name || config.provider.toUpperCase()}${config.is_default ? ' (Default)' : ''}`;
                    return (
                      <button
                        key={config.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          onProviderChange?.(config.provider);
                          setIsProviderOpen(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-surface-card-hover text-primary font-semibold'
                            : 'text-secondary hover:text-primary hover:bg-surface-card-hover/50'
                        }`}
                      >
                        <span className="truncate">{label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" aria-hidden="true" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : null}

          {/* Borderless Text Input */}
          <label htmlFor="chat-input-field" className="sr-only">
            Pertanyaan tentang dokumen PDF
          </label>
          <input
            id="chat-input-field"
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={!hasCredentials || isStreaming}
            placeholder={
              !hasCredentials
                ? 'Konfigurasi provider AI di Pengaturan terlebih dahulu…'
                : 'Tanyakan sesuatu…'
            }
            className="flex-1 bg-transparent border-none text-xs text-primary placeholder:text-muted focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-w-0 py-1.5 px-1 font-sans"
          />

          {/* Integrated Send Button */}
          <button
            type="submit"
            aria-label="Kirim Pertanyaan"
            disabled={!hasCredentials || isStreaming || !inputQuery.trim()}
            className="minimal-button-primary w-8 h-8 rounded-lg flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {isStreaming ? (
              <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-label="Mengirim…" />
            ) : (
              <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
