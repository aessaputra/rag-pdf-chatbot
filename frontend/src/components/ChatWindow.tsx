'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUp,
  Bot,
  Check,
  ChevronDown,
  FileText,
  Lock,
  Settings,
  Sparkles,
  User,
} from 'lucide-react';
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

/**
 * Lightweight inline markdown renderer for structured AI streaming text
 */
function FormattedMessage({ content }: { readonly content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-xs leading-relaxed text-primary">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-muted text-[10px] mt-0.5 select-none">•</span>
              <span className="flex-1">{formatInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists (e.g. "1. ")
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-muted font-mono text-[10px] mt-0.5 select-none">{numMatch[1]}.</span>
              <span className="flex-1">{formatInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }

        // Headers (### or ##)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs font-semibold text-primary mt-3 mb-1">
              {formatInlineMarkdown(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-sm font-semibold font-serif text-primary mt-4 mb-1">
              {formatInlineMarkdown(trimmed.slice(3))}
            </h3>
          );
        }

        return <p key={idx}>{formatInlineMarkdown(line)}</p>;
      })}
    </div>
  );
}

function formatInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-surface-card-hover border border-subtle font-mono text-[11px] text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize textarea height smoothly
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputQuery]);

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

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!hasCredentials || !inputQuery.trim() || isStreaming) return;
    const query = inputQuery;
    setInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await onSendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const suggestionPrompts = [
    'Rangkum poin-poin utama dokumen ini.',
    'Apa saja syarat dan batasan yang disebutkan?',
    'Jelaskan kesimpulan dari berkas PDF aktif.',
  ];

  return (
    <main aria-label="Ruang Percakapan Chat" className="flex-1 flex flex-col h-screen bg-canvas text-primary relative z-10 transition-colors duration-150">
      {/* Sleek Top Navigation Header Bar */}
      <header className="h-13 border-b border-subtle bg-canvas/80 backdrop-blur-xs flex items-center justify-between px-6 shrink-0 z-20 select-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-500" aria-hidden="true" />
            <span className="text-xs font-semibold text-primary font-serif">Chat RAG</span>
          </div>

          {/* Active Document Status Indicator */}
          {hasCredentials && (
            <button
              type="button"
              onClick={onOpenDocumentModal}
              className="px-2 py-0.5 rounded-full bg-surface-card hover:bg-surface-card-hover border border-subtle text-[11px] font-mono text-secondary hover:text-primary transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span className={`w-1.5 h-1.5 rounded-full ${activeDocumentCount > 0 ? 'bg-emerald-500' : 'bg-zinc-400'}`} />
              <span>{activeDocumentCount} Dokumen Aktif</span>
            </button>
          )}
        </div>

        {/* Quick Settings Shortcut */}
        <Link
          href="/dashboard/settings"
          className="text-xs font-mono text-muted hover:text-primary transition-colors flex items-center gap-1"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>Pengaturan</span>
        </Link>
      </header>

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
          <div className="h-full flex flex-col items-center justify-center text-center py-16 max-w-md mx-auto">
            {activeDocumentCount === 0 ? (
              <>
                <div className="p-3.5 rounded-full bg-surface-card border border-subtle mb-4 text-muted">
                  <FileText className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-xl font-serif font-semibold text-primary tracking-tight mb-2">
                  Belum ada dokumen aktif.
                </h2>
                <p className="text-xs text-muted leading-relaxed mb-5 max-w-xs">
                  Aktifkan minimal 1 dokumen PDF agar asisten AI dapat menjawab pertanyaan berdasarkan konteks dokumen.
                </p>
                {onOpenDocumentModal && (
                  <button
                    type="button"
                    onClick={onOpenDocumentModal}
                    className="minimal-button-primary py-2 px-4 rounded-md text-xs font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Kelola Dokumen</span>
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="p-3.5 rounded-full bg-surface-card border border-subtle mb-4 text-emerald-500">
                  <Sparkles className="w-6 h-6" aria-hidden="true" />
                </div>
                <h2 className="text-2xl font-serif font-semibold text-primary tracking-tight mb-2">
                  Tanyakan tentang dokumen Anda.
                </h2>
                <p className="text-xs text-muted mb-6">
                  {activeDocumentCount} dokumen aktif siap digunakan sebagai sumber konteks RAG.
                </p>

                {/* Suggested Prompts Chips */}
                <div className="flex flex-col gap-2 w-full">
                  {suggestionPrompts.map((promptText, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setInputQuery(promptText)}
                      className="w-full text-left p-3 rounded-lg bg-surface-card hover:bg-surface-card-hover border border-subtle text-xs text-secondary hover:text-primary transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <span>{promptText}</span>
                      <ArrowUp className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-muted" />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          messages.map((msg, index) => (
            <article
              key={index}
              className={`flex flex-col max-w-3xl mx-auto ${
                msg.sender === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Header Label */}
              <div className="text-[10px] font-mono text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {msg.sender === 'user' ? (
                  <span className="flex items-center gap-1 text-muted">
                    <User className="w-3 h-3" aria-hidden="true" />
                    <span>ANDA</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-500 font-semibold">
                    <Bot className="w-3 h-3" aria-hidden="true" />
                    <span>ASISTEN AI</span>
                  </span>
                )}
              </div>

              {/* Message Bubble Container */}
              <div
                className={`text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'p-3.5 rounded-xl bg-surface-card-hover border border-subtle text-primary max-w-lg shadow-2xs font-sans'
                    : 'w-full p-4 rounded-xl bg-surface-card/60 border border-subtle text-primary shadow-2xs font-sans'
                }`}
              >
                {msg.sender === 'user' ? (
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                  <FormattedMessage content={msg.content} />
                )}

                {/* Structured Source Citations Badges */}
                {msg.citations && msg.citations.length > 0 ? (
                  <div className="mt-4 pt-3 border-t border-subtle space-y-2">
                    <div className="text-[10px] font-mono text-muted uppercase tracking-wider flex items-center gap-1">
                      <FileText className="w-3 h-3 text-muted" />
                      <span>SUMBER SITASI ({msg.citations.length})</span>
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
                          <FileText className="w-3 h-3 text-emerald-500" aria-hidden="true" />
                          <span className="font-medium">Hal {c.page_number}</span>
                          <span className="text-muted text-[10px] truncate max-w-[120px]">({c.filename})</span>
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

      {/* Input Prompt Box - Compound Floating Container */}
      <div className="p-4 border-t border-subtle bg-canvas">
        <form
          onSubmit={handleSubmit}
          className="max-w-3xl mx-auto flex items-end gap-2 p-2 pl-3 rounded-2xl bg-surface-card border border-subtle focus-within:ring-2 focus-within:ring-zinc-400/40 focus-within:border-zinc-400 transition-all duration-150 shadow-xs"
        >
          {/* Integrated AI Model Selector Popover */}
          {providerConfigs && providerConfigs.length > 0 ? (
            <div ref={providerRef} className="relative flex items-center shrink-0 border-r border-subtle pr-2.5 mr-0.5 mb-1">
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
                  className="absolute bottom-full mb-2 left-0 z-50 min-w-[200px] p-1 rounded-lg bg-surface-card border border-subtle shadow-lg animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
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

          {/* Auto-Resizing Multi-line Textarea */}
          <label htmlFor="chat-input-textarea" className="sr-only">
            Pertanyaan tentang dokumen PDF
          </label>
          <textarea
            id="chat-input-textarea"
            ref={textareaRef}
            rows={1}
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasCredentials || isStreaming}
            placeholder={
              !hasCredentials
                ? 'Konfigurasi provider AI di Pengaturan terlebih dahulu…'
                : 'Tanyakan sesuatu… (Tekan Enter untuk mengirim)'
            }
            className="flex-1 bg-transparent border-none text-xs text-primary placeholder:text-muted focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed min-w-0 py-1.5 px-1 font-sans resize-none max-h-36 overflow-y-auto leading-relaxed"
          />

          {/* Integrated Send Button */}
          <button
            type="submit"
            aria-label="Kirim Pertanyaan"
            disabled={!hasCredentials || isStreaming || !inputQuery.trim()}
            className="minimal-button-primary w-8 h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer mb-0.5"
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
