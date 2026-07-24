'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, BookOpen, Bot, Lock, Send, Settings, Sparkles, User } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-screen bg-slate-950/40 relative z-10">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Prominent Hard Block Callout Banner if no credentials */}
        {!hasCredentials ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-amber-950/60 border border-amber-800/80 flex items-center justify-center shadow-xl shadow-amber-900/20 mb-6">
              <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3 flex items-center justify-center gap-2">
              Konfigurasi AI Provider Diperlukan <Sparkles className="w-5 h-5 text-amber-400" />
            </h2>
            <p className="text-sm text-slate-300 max-w-md mb-6 leading-relaxed">
              Anda belum mengonfigurasi API Key untuk Provider AI atau Model Embedding. Silakan atur kunci API Anda di menu Settings untuk memulai percakapan RAG PDF Chatbot.
            </p>
            <Link
              href="/dashboard/settings"
              className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-medium text-sm transition-all shadow-lg shadow-emerald-600/25 flex items-center gap-2"
            >
              <Settings className="w-4 h-4" />
              <span>Buka Menu Settings Sekarang</span>
            </Link>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-4">
              <Bot className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              Apa yang ingin Anda ketahui dari PDF Anda? <Sparkles className="w-5 h-5 text-cyan-400" />
            </h2>
            <p className="text-sm text-slate-400 max-w-md">
              Unggah dokumen PDF di panel sebelah kiri, lalu ajukan pertanyaan. AI akan mencari konteks dan memberikan jawaban beserta sitasi nomor halaman.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-4 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-indigo-500/20">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-2xl rounded-2xl p-4 text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white rounded-tr-none shadow-lg shadow-indigo-600/20'
                    : 'glass-panel text-slate-100 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-wrap gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 w-full mb-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-cyan-400" /> Sumber Referensi:
                    </span>
                    {msg.citations.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onSelectCitation(c)}
                        className="py-1 px-2.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>📄 {c.filename}</span>
                        <span className="px-1.5 py-0.5 rounded bg-indigo-500/30 text-[10px] font-bold text-white">
                          Hal {c.page_number}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Box */}
      <div className="p-4 border-t border-slate-800/80 glass-panel">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-4xl mx-auto">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={!hasCredentials || isStreaming}
            placeholder={
              !hasCredentials
                ? 'Silakan konfigurasi Provider AI di menu Settings terlebih dahulu...'
                : 'Ketik pertanyaan tentang dokumen PDF Anda...'
            }
            className="flex-1 glass-input py-3.5 px-5 rounded-2xl text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!hasCredentials || isStreaming || !inputQuery.trim()}
            className="py-3.5 px-5 rounded-2xl font-medium text-white bg-gradient-to-r from-indigo-600 via-indigo-500 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all shadow-lg shadow-indigo-500/25 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Kirim</span>
                <Send className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
