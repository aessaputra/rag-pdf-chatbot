# Redesign Chat Window & Citation Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `frontend/src/components/ChatWindow.tsx` and `frontend/src/components/CitationPanel.tsx` into an ultra-minimalist, cardless editorial RAG interface.

**Architecture:** 
1. `ChatWindow.tsx`: Remove outer container card from AI responses, stream responses directly on canvas, display clean non-redundant citation badges (`Hal 3`).
2. `CitationPanel.tsx`: Flatten metadata header, sanitize PDF bullet artifacts (`[]` &rarr; `•`), format context excerpt as an editorial quote block (`border-l-2 border-[#52525b]`).

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, Lucide React.

---

### Task 1: Refactor `ChatWindow.tsx` into Cardless Editorial RAG Interface

**Files:**
- Modify: `frontend/src/components/ChatWindow.tsx:1-151`

- [ ] **Step 1: Update `ChatWindow.tsx` markup and citation rendering**

Replace the contents of `frontend/src/components/ChatWindow.tsx` with:

```tsx
'use client';

import { useState, useRef, useEffect } from 'react';
import { ArrowUp, Bot, FileText, Sparkles } from 'lucide-react';
import type { ChatMessage, Citation } from '@/types';

interface ChatWindowProps {
  messages: ChatMessage[];
  isStreaming: boolean;
  onSendMessage: (query: string) => void;
  onSelectCitation: (citation: Citation) => void;
  hasCredentials: boolean;
}

export default function ChatWindow({
  messages,
  isStreaming,
  onSendMessage,
  onSelectCitation,
  hasCredentials,
}: ChatWindowProps) {
  const [inputQuery, setInputQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputQuery.trim() || isStreaming || !hasCredentials) return;
    onSendMessage(inputQuery.trim());
    setInputQuery('');
  };

  return (
    <main aria-label="Jendela Obrolan AI" className="flex-1 flex flex-col h-screen bg-[#09090b] text-[#f4f4f5] min-w-0">
      {/* Scrollable Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20">
            <div className="p-3 rounded-full bg-[#121215] border border-[#232326] mb-4 text-[#a1a1aa]">
              <Sparkles className="w-6 h-6" aria-hidden="true" />
            </div>
            <h2 className="text-2xl font-serif text-white tracking-tight">
              Tanyakan tentang dokumen Anda.
            </h2>
          </div>
        ) : (
          messages.map((msg, index) => (
            <article
              key={index}
              className={`flex flex-col ${
                msg.role === 'user' ? 'items-end' : 'items-start'
              }`}
            >
              {/* Message Header Label */}
              <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                {msg.role === 'user' ? (
                  <span>ANDA</span>
                ) : (
                  <span className="flex items-center gap-1 text-zinc-400">
                    <Bot className="w-3 h-3" aria-hidden="true" />
                    <span>ASISTEN AI</span>
                  </span>
                )}
              </div>

              {/* Message Body */}
              <div
                className={`text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'p-3.5 rounded-xl bg-[#18181b] border border-[#27272a] text-white max-w-lg'
                    : 'bg-transparent text-[#f4f4f5] w-full'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Compact Non-Redundant Citation Badges */}
                {msg.citations && msg.citations.length > 0 ? (
                  <div className="mt-4 pt-3 border-t border-[#232326] space-y-2">
                    <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
                      SUMBER
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {msg.citations.map((c, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => onSelectCitation(c)}
                          aria-label={`Buka sitasi ${c.filename} halaman ${c.page_number}`}
                          className="py-1 px-2.5 rounded-md bg-[#121215] hover:bg-[#18181b] border border-[#232326] text-zinc-300 hover:text-white text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-[#52525b]"
                        >
                          <FileText className="w-3 h-3 text-zinc-400" aria-hidden="true" />
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
      <div className="p-4 border-t border-[#232326] bg-[#09090b]">
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
```

---

### Task 2: Refactor `CitationPanel.tsx` with Flat Metadata & Sanitized Glyphs

**Files:**
- Modify: `frontend/src/components/CitationPanel.tsx:1-61`

- [ ] **Step 1: Update `CitationPanel.tsx` implementation**

Replace the contents of `frontend/src/components/CitationPanel.tsx` with:

```tsx
'use client';

import { X, FileText } from 'lucide-react';
import type { Citation } from '@/types';

interface CitationPanelProps {
  citation: Citation | null;
  onClose: () => void;
}

/**
 * Sanitizes raw PDF text extractions by replacing unprintable PUA unicode glyphs
 * (such as missing font bullet rectangles) with clean bullet characters (`•`).
 */
function sanitizeContextText(text: string): string {
  if (!text) return '';
  return text.replace(/[\uE000-\uF8FF\u25A0-\u25FF]/g, '•');
}

export default function CitationPanel({ citation, onClose }: CitationPanelProps) {
  if (!citation) return null;

  const cleanContent = sanitizeContextText(citation.content);

  return (
    <aside aria-label="Detail Sitasi Dokumen PDF" className="w-[320px] bg-[#09090b] border-l border-[#232326] p-5 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200 z-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-[#232326]">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-zinc-400">
          DETAIL SITASI
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Detail Sitasi"
          className="p-1 rounded text-zinc-400 hover:text-white hover:bg-[#18181b] transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b]"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Flat Metadata Block (No Sub-Cards) */}
      <div className="space-y-1.5 mb-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="w-3.5 h-3.5 text-zinc-400 shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold text-white truncate" title={citation.filename}>
              {citation.filename}
            </span>
          </div>
          <span className="text-[10px] font-mono text-zinc-400 bg-[#121215] border border-[#232326] px-2 py-0.5 rounded shrink-0">
            HAL {citation.page_number}
          </span>
        </div>
      </div>

      {/* Editorial Quote Excerpt */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">
          KONTEKS DOKUMEN
        </div>
        <div
          tabIndex={0}
          className="flex-1 border-l-2 border-[#52525b] pl-3 py-1 text-zinc-300 text-xs leading-relaxed overflow-y-auto whitespace-pre-wrap font-sans selection:bg-[#27272a] focus-visible:ring-2 focus-visible:ring-[#52525b]"
        >
          {cleanContent}
        </div>
      </div>
    </aside>
  );
}
```

---

### Task 3: Build Verification & Commit

- [ ] **Step 1: Run frontend build**

Run command:
`cd frontend && npm run build`

Expected Output: Clean Next.js 15 build with 0 TypeScript errors.

- [ ] **Step 2: Commit changes to Git**

Run command:
`git add frontend/src/components/ChatWindow.tsx frontend/src/components/CitationPanel.tsx docs/superpowers/specs/2026-07-24-chat-citation-redesign-design.md docs/superpowers/plans/2026-07-24-chat-citation-redesign.md`
`git commit -m "feat(chat): redesign chat window and citation drawer into cardless editorial RAG interface"`
