# Redesign Dashboard Utilitarian Minimalist Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign Dashboard components (`Sidebar.tsx`, `DocumentManager.tsx`, `ChatWindow.tsx`, `CitationPanel.tsx`) into a zero-clutter, utilitarian minimalist interface following `/minimalist-ui`, `/redesign-existing-projects`, and `/web-design-guidelines`.

**Architecture:** Refactor UI markup and UX copy across the four core dashboard components. Strip out decorative badges, empty-state verbiage, redundant status text, and unnecessary verbiage while preserving all existing React state hooks, API calls, SSE streaming, and Supabase Auth logic.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React icons.

## Global Constraints

- **Language & UX Copy**: Indonesian, super direct, monospace uppercase labels (`SUMBER`, `DOKUMEN`, `HALAMAN`, `KONTEKS`, `PROVIDER AI`, `BERKAS PDF`). Zero marketing fluff or unnecessary badges.
- **Utilitarian Layout**: Ultra-thin 1px borders (`border-[#232326]`), dark canvas (`#09090b`), high-contrast editorial titles (`font-serif`).
- **Performance**: Strict TypeScript types, explicit ternary conditional rendering (`rendering-conditional-render`), zero inline component definitions (`rerender-no-inline-components`).

---

### Task 1: Refactor `Sidebar.tsx` and `DocumentManager.tsx`

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx:1-136`
- Modify: `frontend/src/components/DocumentManager.tsx:1-152`

**Interfaces:**
- Consumes: `UserPayload`, `ProviderConfig`, `DocumentItem` from `@/types`
- Produces: Minimalist `Sidebar` and `DocumentManager` components with zero UX copy clutter.

- [ ] **Step 1: Update `Sidebar.tsx`**

Replace `frontend/src/components/Sidebar.tsx` with zero-clutter minimalist implementation:

```tsx
'use client';

import Link from 'next/link';
import { FileText, LogOut, Plus, Settings } from 'lucide-react';
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
    <aside aria-label="Navigasi Utama" className="w-[260px] h-screen bg-[#09090b] flex flex-col justify-between p-4 border-r border-[#232326] shrink-0 select-none">
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
```

- [ ] **Step 2: Update `DocumentManager.tsx`**

Replace `frontend/src/components/DocumentManager.tsx` with zero-clutter minimalist implementation:

```tsx
'use client';

import { useState } from 'react';
import { AlertCircle, FileCheck, Trash2, UploadCloud } from 'lucide-react';
import type { DocumentItem } from '@/types';

interface DocumentManagerProps {
  documents: DocumentItem[];
  hasCredentials?: boolean;
  onUpload: (file: File) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export default function DocumentManager({
  documents,
  hasCredentials = true,
  onUpload,
  onDelete,
}: DocumentManagerProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFileChange = async (file: File | null) => {
    if (!hasCredentials) {
      setErrorMessage('Atur provider AI di Settings terlebih dahulu.');
      return;
    }
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya berkas berformat PDF yang diperbolehkan.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah berkas PDF.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (!hasCredentials) return;
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <section aria-label="Pengelola Dokumen PDF" className="flex-1 flex flex-col min-h-0 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono text-[#71717a] uppercase tracking-wider">
          BERKAS PDF ({documents.length})
        </span>
      </div>

      {/* Drag & Drop Upload Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (hasCredentials) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`p-3 rounded-md border border-dashed text-center flex flex-col items-center justify-center transition-colors ${
          !hasCredentials
            ? 'border-[#232326] bg-[#121215]/40 opacity-50 cursor-not-allowed'
            : isDragging
            ? 'border-[#fafafa] bg-[#18181b] cursor-pointer'
            : 'border-[#27272a] hover:border-[#52525b] bg-[#121215] cursor-pointer'
        }`}
      >
        <input
          type="file"
          accept=".pdf"
          disabled={!hasCredentials || isUploading}
          onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
          className="hidden"
          id="pdf-upload-input"
        />
        <label
          htmlFor="pdf-upload-input"
          className={`flex flex-col items-center focus-within:ring-2 focus-within:ring-[#52525b] rounded p-1 ${!hasCredentials ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin my-1" aria-label="Mengunggah berkas…" />
          ) : (
            <UploadCloud className="w-4 h-4 text-zinc-400 mb-1" aria-hidden="true" />
          )}
          <span className="text-xs font-medium text-white">
            {!hasCredentials ? 'Unggah Terkunci' : isUploading ? 'Memproses PDF…' : 'Unggah PDF'}
          </span>
          <span className="text-[10px] font-mono text-zinc-500 mt-0.5">Maks 25 MB</span>
        </label>
      </div>

      {errorMessage && (
        <div role="alert" className="p-2 rounded bg-[#2a1618] border border-[#451a1d] text-[#f87171] text-xs leading-normal">
          {errorMessage}
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {documents.length === 0 ? (
          <div className="text-center py-6 text-zinc-600 text-xs font-mono">
            Kosong
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-2 rounded-md bg-[#121215] border border-[#232326] hover:border-[#27272a] flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-2 truncate mr-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" aria-hidden="true" />
                <div className="truncate">
                  <div className="text-xs font-medium text-white truncate">{doc.filename}</div>
                  <div className="text-[9px] font-mono text-zinc-500">{formatFileSize(doc.file_size)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                title={`Hapus ${doc.filename}`}
                aria-label={`Hapus ${doc.filename}`}
                className="p-1 text-zinc-500 hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 focus-visible:ring-2 focus-visible:ring-[#52525b]"
              >
                <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
```

---

### Task 2: Refactor `ChatWindow.tsx` and `CitationPanel.tsx`

**Files:**
- Modify: `frontend/src/components/ChatWindow.tsx:1-159`
- Modify: `frontend/src/components/CitationPanel.tsx:1-66`

**Interfaces:**
- Consumes: `ChatMessage`, `Citation` from `@/types`
- Produces: Minimalist `ChatWindow` and `CitationPanel` components with zero UX copy clutter.

- [ ] **Step 1: Update `ChatWindow.tsx`**

Replace `frontend/src/components/ChatWindow.tsx` with zero-clutter minimalist implementation:

```tsx
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
```

- [ ] **Step 2: Update `CitationPanel.tsx`**

Replace `frontend/src/components/CitationPanel.tsx` with zero-clutter minimalist implementation:

```tsx
'use client';

import { X } from 'lucide-react';
import type { Citation } from '@/types';

interface CitationPanelProps {
  citation: Citation | null;
  onClose: () => void;
}

export default function CitationPanel({ citation, onClose }: CitationPanelProps) {
  if (!citation) return null;

  return (
    <aside aria-label="Detail Sitasi Dokumen PDF" className="w-[300px] bg-[#09090b] border-l border-[#232326] p-4 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200 z-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#232326]">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-white">
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

      {/* Metadata Info */}
      <div className="space-y-2 mb-4">
        <div className="p-2.5 rounded-md bg-[#121215] border border-[#232326]">
          <div className="text-[9px] uppercase font-mono text-[#71717a]">DOKUMEN</div>
          <div className="text-xs font-medium text-white truncate mt-0.5">{citation.filename}</div>
        </div>

        <div className="p-2.5 rounded-md bg-[#121215] border border-[#232326]">
          <div className="text-[9px] uppercase font-mono text-[#71717a]">HALAMAN</div>
          <div className="text-xs font-mono font-medium text-white mt-0.5">Halaman {citation.page_number}</div>
        </div>
      </div>

      {/* Excerpt Monospace Box */}
      <div className="flex-1 flex flex-col min-h-0">
        <label htmlFor="citation-excerpt-content" className="block text-[10px] font-mono text-[#71717a] uppercase tracking-wider mb-1.5">
          KONTEKS
        </label>
        <div
          id="citation-excerpt-content"
          tabIndex={0}
          className="flex-1 p-3 rounded-md bg-[#121215] border border-[#232326] text-zinc-300 text-xs leading-relaxed overflow-y-auto font-mono whitespace-pre-wrap selection:bg-[#27272a] focus-visible:ring-2 focus-visible:ring-[#52525b]"
        >
          {citation.content}
        </div>
      </div>
    </aside>
  );
}
```

- [ ] **Step 3: Run frontend type checking & build verification**

Run command:
`cd frontend && npm run build`

Expected Output: Clean Next.js 15 build with 0 TypeScript errors and successful static page generation.

- [ ] **Step 4: Commit changes to Git**

Run command:
`git add frontend/src/components/Sidebar.tsx frontend/src/components/DocumentManager.tsx frontend/src/components/ChatWindow.tsx frontend/src/components/CitationPanel.tsx docs/superpowers/specs/2026-07-24-dashboard-redesign-design.md docs/superpowers/plans/2026-07-24-dashboard-redesign.md`
`git commit -m "feat(dashboard): redesign dashboard UI into utilitarian minimalist interface with zero UX copy clutter"`
