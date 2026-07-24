'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Bot, FileText, Lock, Settings, Sparkles } from 'lucide-react';
import type { ChatMessage, Citation } from '@/types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  hasCredentials?: boolean;
  onSendMessage: (query: string) => Promise<void>;
  onSelectCitation: (citation: Citation) => void;
}

export default function ChatWindow({
  messages,
  isStreaming,
  hasCredentials = true,
  onSendMessage,
  onSelectCitation,
}: ChatWindowProps) {
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
            <div className="p-3 rounded-full bg-surface-card border border-subtle mb-4 text-muted">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-serif text-primary tracking-tight">
              Tanyakan tentang dokumen Anda.
            </h2>
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

      {/* Input Prompt Box */}
      <div className="p-4 border-t border-subtle bg-canvas">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-3xl mx-auto">
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
            className="flex-1 minimal-input py-2.5 px-4 rounded-md text-xs placeholder:text-muted focus:outline-hidden focus:ring-2 focus:ring-zinc-400 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            aria-label="Kirim Pertanyaan"
            disabled={!hasCredentials || isStreaming || !inputQuery.trim()}
            className="minimal-button-primary p-2.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" aria-label="Mengirim…" />
            ) : (
              <ArrowUp className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </form>
      </div>
    </main>
  );
}
