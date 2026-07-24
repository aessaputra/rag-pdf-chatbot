'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, Lock, Settings } from 'lucide-react';
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
    <main aria-label="Ruang Percakapan Chat" className="flex-1 flex flex-col h-screen bg-[#09090b] relative z-10">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!hasCredentials ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-10 h-10 rounded-md bg-[#121215] border border-[#232326] flex items-center justify-center mb-4">
              <Lock className="w-4 h-4 text-zinc-400" aria-hidden="true" />
            </div>
            <h2 className="text-base font-serif font-semibold text-white mb-1.5">
              Konfigurasi Kunci API
            </h2>
            <p className="text-xs text-zinc-400 max-w-xs mb-4 leading-normal">
              Atur provider AI di Pengaturan untuk memulai.
            </p>
            <Link
              href="/dashboard/settings"
              className="minimal-button-primary py-2 px-4 rounded-md text-xs font-medium flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-[#52525b]"
            >
              <Settings className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Pengaturan</span>
            </Link>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-xl mx-auto">
            <h2 className="text-2xl font-serif text-white tracking-tight">
              Tanyakan tentang dokumen Anda.
            </h2>
          </div>
        ) : (
          messages.map((msg) => (
            <article
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-md p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#18181b] border border-[#27272a] text-white'
                    : 'bg-[#121215] border border-[#232326] text-[#f4f4f5]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#232326] flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider w-full mb-1">
                      SUMBER
                    </span>
                    {msg.citations.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onSelectCitation(c)}
                        aria-label={`Buka sitasi ${c.filename} halaman ${c.page_number}`}
                        className="py-1 px-2 rounded bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#f4f4f5] text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#52525b]"
                      >
                        <span className="truncate max-w-[140px]">{c.filename}</span>
                        <span className="text-zinc-500">•</span>
                        <span className="text-zinc-400">Hal {c.page_number}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Box */}
      <div className="p-4 border-t border-[#232326] bg-[#09090b]">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-2xl mx-auto">
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
            className="flex-1 minimal-input py-2.5 px-4 rounded-md text-xs disabled:opacity-50 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#52525b]"
          />
          <button
            type="submit"
            aria-label="Kirim Pertanyaan"
            disabled={!hasCredentials || isStreaming || !inputQuery.trim()}
            className="minimal-button-primary p-2.5 rounded-md disabled:opacity-40 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-[#52525b]"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" aria-label="Mengirim…" />
            ) : (
              <ArrowUp className="w-4 h-4" aria-hidden="true" />
            )}
          </button>
        </form>
      </div>
    </main>
  );
}

