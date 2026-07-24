# Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the overall `/dashboard` page into a minimalist, cohesive 3-panel layout (Option A: Combined Studio Sidebar, flex-1 Chat Workspace, slide-over Citation Panel) matching the Utilitarian Minimalism design system.

**Architecture:** Refactor `Sidebar.tsx` and `DocumentManager.tsx` into an integrated studio sidebar (280px), upgrade `ChatWindow.tsx` and `CitationPanel.tsx` with minimalist styling and high-contrast typography, and update `globals.css` with the warm dark monochrome design tokens.

**Tech Stack:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS v4, Lucide React, Geist Sans/Mono & Newsreader fonts.

## Global Constraints
- Palette: Canvas `#09090b`, Surface `#121215` / `#18181b`, Subtle Border `#232326`, Primary Accent `#fafafa` (text `#09090b`).
- Typography: Body/UI `var(--font-geist-sans)`, Empty state header `var(--font-newsreader)` (*italic*), Metadata/Stats `var(--font-geist-mono)`.
- Option A Layout: Left Studio Sidebar (280px), Center Chat (flex-1), Right Citation Slide-Over (320px).

---

### Task 1: Update Global Design Tokens & Minimalist Utility Classes

**Files:**
- Modify: `frontend/src/app/globals.css`

**Interfaces:**
- Consumes: Tailwind v4 theme variables defined in `layout.tsx` (`--font-geist-sans`, `--font-geist-mono`, `--font-newsreader`).
- Produces: CSS utility classes `.minimal-card`, `.minimal-input`, `.minimal-button-primary`, `.minimal-badge`.

- [ ] **Step 1: Inspect and update globals.css with monochrome dark tokens**

```css
@import "tailwindcss";

@theme {
  --font-sans: var(--font-geist-sans), system-ui, -apple-system, sans-serif;
  --font-mono: var(--font-geist-mono), 'SF Mono', 'JetBrains Mono', monospace;
  --font-serif: var(--font-newsreader), 'Newsreader', Georgia, serif;
}

@layer base {
  :root {
    --bg-canvas: #09090b;
    --surface-card: #121215;
    --surface-card-hover: #18181b;
    --border-subtle: #232326;
    --border-focus: #52525b;
  }

  body {
    background-color: var(--bg-canvas);
    color: #f4f4f5;
    font-family: var(--font-sans);
  }
}

/* Utilitarian Minimalist Utilities */
.minimal-card {
  background-color: #121215;
  border: 1px solid #232326;
}

.minimal-input {
  background-color: #18181b;
  border: 1px solid #27272a;
  color: #fafafa;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}

.minimal-input:focus-visible {
  outline: none;
  border-color: #52525b;
  box-shadow: 0 0 0 2px rgba(161, 161, 170, 0.2);
}

.minimal-button-primary {
  background-color: #fafafa;
  color: #09090b;
  font-weight: 500;
  transition: transform 0.1s ease, background-color 0.15s ease;
}

.minimal-button-primary:hover:not(:disabled) {
  background-color: #e4e4e7;
}

.minimal-button-primary:active:not(:disabled) {
  transform: scale(0.98);
}
```

- [ ] **Step 2: Commit globals.css changes**

```bash
git add frontend/src/app/globals.css
git commit -m "style: add utilitarian minimalist design tokens and css utilities"
```

---

### Task 2: Refactor Combined Studio Sidebar Components (`Sidebar.tsx` & `DocumentManager.tsx`)

**Files:**
- Modify: `frontend/src/components/Sidebar.tsx`
- Modify: `frontend/src/components/DocumentManager.tsx`

**Interfaces:**
- Consumes: `user: UserPayload | null`, `provider: string`, `providerConfigs: ProviderConfig[]`, `documents: DocumentItem[]`, `hasCredentials: boolean`.
- Produces: `onProviderChange`, `onNewChat`, `onLogout`, `onUpload`, `onDelete`.

- [ ] **Step 1: Refactor Sidebar.tsx to house branding, new chat, model selector, embedded document manager, and user footer**

```tsx
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
```

- [ ] **Step 2: Refactor DocumentManager.tsx into an embedded component for the sidebar**

```tsx
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertCircle, FileCheck, FileText, Lock, Trash2, UploadCloud } from 'lucide-react';
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
      setErrorMessage('Atur AI Provider & Embedding di Settings terlebih dahulu.');
      return;
    }
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setErrorMessage('Hanya file .pdf yang diperbolehkan.');
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      await onUpload(file);
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal mengunggah PDF.');
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
    <div className="flex-1 flex flex-col min-h-0 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-[#a1a1aa] uppercase tracking-wider flex items-center gap-1.5">
          <FileText className="w-3 h-3" /> Dokumen PDF ({documents.length})
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
        className={`p-3 rounded-lg border border-dashed text-center flex flex-col items-center justify-center transition-colors ${
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
          className={`flex flex-col items-center ${!hasCredentials ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {isUploading ? (
            <div className="w-4 h-4 border-2 border-[#fafafa] border-t-transparent rounded-full animate-spin my-1" />
          ) : (
            <UploadCloud className="w-4 h-4 text-[#a1a1aa] mb-1" />
          )}
          <span className="text-[11px] font-medium text-[#f4f4f5]">
            {!hasCredentials ? 'Upload PDF Terkunci' : isUploading ? 'Memproses PDF...' : 'Unggah PDF Baru'}
          </span>
          <span className="text-[9px] text-[#a1a1aa]">Maksimal 25MB</span>
        </label>
      </div>

      {errorMessage && (
        <div className="p-2 rounded bg-rose-950/40 border border-rose-800/50 text-rose-300 text-[10px] flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Document List */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5">
        {documents.length === 0 ? (
          <div className="text-center py-6 text-[#71717a] text-[11px]">
            Belum ada PDF diunggah.
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={doc.id}
              className="p-2 rounded-lg bg-[#121215] border border-[#232326] hover:border-[#27272a] flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-2 truncate mr-1">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="truncate">
                  <div className="text-[11px] font-medium text-[#f4f4f5] truncate">{doc.filename}</div>
                  <div className="text-[9px] font-mono text-[#a1a1aa]">{formatFileSize(doc.file_size)}</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                title="Hapus Dokumen"
                className="p-1 text-[#71717a] hover:text-rose-400 rounded transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Commit Sidebar and DocumentManager changes**

```bash
git add frontend/src/components/Sidebar.tsx frontend/src/components/DocumentManager.tsx
git commit -m "refactor: integrate Sidebar and DocumentManager into unified 280px studio sidebar"
```

---

### Task 3: Redesign Chat Workspace Component (`ChatWindow.tsx`)

**Files:**
- Modify: `frontend/src/components/ChatWindow.tsx`

**Interfaces:**
- Consumes: `messages: ChatMessage[]`, `isStreaming: boolean`, `hasCredentials: boolean`.
- Produces: `onSendMessage(query: string)`, `onSelectCitation(citation: Citation)`.

- [ ] **Step 1: Update ChatWindow.tsx with editorial empty state, high-contrast messages, and minimal input**

```tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowUp, BookOpen, Lock, Settings } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-screen bg-[#09090b] relative z-10">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {!hasCredentials ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8">
            <div className="w-12 h-12 rounded-xl bg-[#121215] border border-[#232326] flex items-center justify-center mb-4">
              <Lock className="w-5 h-5 text-amber-400" />
            </div>
            <h2 className="text-lg font-medium text-[#f4f4f5] mb-2 font-serif italic">
              Konfigurasi AI Provider Diperlukan
            </h2>
            <p className="text-xs text-[#a1a1aa] max-w-sm mb-5 leading-relaxed">
              Silakan atur API Key AI Provider atau Model Embedding di menu Settings terlebih dahulu.
            </p>
            <Link
              href="/dashboard/settings"
              className="minimal-button-primary py-2 px-4 rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Buka Menu Settings</span>
            </Link>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-xl mx-auto">
            <h2 className="text-2xl font-serif italic text-[#f4f4f5] mb-3 tracking-tight">
              Apa yang ingin Anda telusuri dari dokumen PDF Anda?
            </h2>
            <p className="text-xs text-[#a1a1aa] leading-relaxed mb-6">
              Unggah dokumen PDF di panel sebelah kiri, lalu ajukan pertanyaan. Asisten AI akan menganalisis dan menampilkan jawaban beserta nomor halaman sitasi secara presisi.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-[10px] font-mono px-2 py-1 rounded bg-[#121215] border border-[#232326] text-[#a1a1aa]">
                <kbd className="font-sans font-semibold">Shift</kbd> + <kbd className="font-sans font-semibold">Enter</kbd> untuk baris baru
              </span>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-2xl rounded-xl p-4 text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-[#18181b] border border-[#27272a] text-[#f4f4f5]'
                    : 'bg-[#121215] border border-[#232326] text-[#f4f4f5]'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Citation Badges */}
                {msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-[#232326] flex flex-wrap gap-1.5">
                    <span className="text-[10px] font-medium text-[#a1a1aa] w-full mb-1 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-[#a1a1aa]" /> Sumber Referensi:
                    </span>
                    {msg.citations.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onSelectCitation(c)}
                        className="py-1 px-2 rounded-md bg-[#18181b] hover:bg-[#27272a] border border-[#27272a] text-[#f4f4f5] text-[11px] font-medium transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="truncate max-w-[140px]">{c.filename}</span>
                        <span className="px-1 py-0.2 rounded bg-[#27272a] text-[9px] font-mono text-[#a1a1aa]">
                          Hal {c.page_number}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Prompt Box */}
      <div className="p-4 border-t border-[#232326] bg-[#09090b]">
        <form onSubmit={handleSubmit} className="flex gap-2 items-center max-w-3xl mx-auto">
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            disabled={!hasCredentials || isStreaming}
            placeholder={
              !hasCredentials
                ? 'Konfigurasi Provider AI di Settings terlebih dahulu...'
                : 'Ketik pertanyaan tentang dokumen PDF Anda...'
            }
            className="flex-1 minimal-input py-2.5 px-4 rounded-xl text-xs disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!hasCredentials || isStreaming || !inputQuery.trim()}
            className="minimal-button-primary p-2.5 rounded-xl disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-[#09090b] border-t-transparent rounded-full animate-spin" />
            ) : (
              <ArrowUp className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit ChatWindow changes**

```bash
git add frontend/src/components/ChatWindow.tsx
git commit -m "style: redesign ChatWindow with editorial empty state and utilitarian minimalist bubbles"
```

---

### Task 4: Redesign Slide-Over Citation Panel (`CitationPanel.tsx`) & Main Layout Container (`page.tsx`)

**Files:**
- Modify: `frontend/src/components/CitationPanel.tsx`
- Modify: `frontend/src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `selectedCitation: Citation | null`, `hasCredentials: boolean`.
- Produces: Smooth 3-panel dashboard layout integration.

- [ ] **Step 1: Refactor CitationPanel.tsx as a smooth right slide-over panel**

```tsx
'use client';

import { BookOpen, FileText, X } from 'lucide-react';
import type { Citation } from '@/types';

interface CitationPanelProps {
  citation: Citation | null;
  onClose: () => void;
}

export default function CitationPanel({ citation, onClose }: CitationPanelProps) {
  if (!citation) return null;

  return (
    <div className="w-[320px] bg-[#09090b] border-l border-[#232326] p-4 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200 z-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#232326]">
        <h3 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#a1a1aa]" /> Detail Sitasi PDF
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Metadata Info */}
      <div className="space-y-2 mb-4">
        <div className="p-2.5 rounded-lg bg-[#121215] border border-[#232326] flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[#a1a1aa] shrink-0" />
          <div className="truncate">
            <div className="text-[9px] uppercase font-mono text-[#71717a]">Dokumen Sumber</div>
            <div className="text-xs font-medium text-[#f4f4f5] truncate">{citation.filename}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#121215] border border-[#232326] flex items-center gap-2.5">
          <span className="text-xs font-mono text-[#a1a1aa] shrink-0">Hal</span>
          <div>
            <div className="text-[9px] uppercase font-mono text-[#71717a]">Halaman PDF</div>
            <div className="text-xs font-medium font-mono text-[#f4f4f5]">Halaman {citation.page_number}</div>
          </div>
        </div>
      </div>

      {/* Excerpt Monospace Box */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-[10px] font-mono text-[#71717a] uppercase tracking-wider mb-1.5">
          Kutipan Konteks Teks
        </label>
        <div className="flex-1 p-3 rounded-lg bg-[#121215] border border-[#232326] text-[#a1a1aa] text-xs leading-relaxed overflow-y-auto font-mono whitespace-pre-wrap selection:bg-[#27272a]">
          {citation.content}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Update page.tsx layout to pass documents to Sidebar and render 3-panel layout**

```tsx
'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabaseClient';
import {
  deleteDocument, fetchSSEStream, getEmbeddingConfig, listDocuments,
  listProviderConfigs, uploadDocument
} from '@/lib/api';
import type { ChatMessage, Citation, DocumentItem, EmbeddingConfig, ProviderConfig, UserPayload } from '@/types';
import type { AuthChangeEvent, Session } from '@supabase/supabase-js';

import Sidebar from '@/components/Sidebar';
import ChatWindow from '@/components/ChatWindow';
import CitationPanel from '@/components/CitationPanel';

function createUserPayload(id: string, email: string | undefined): UserPayload {
  return { user_id: id, email: email || '', role: 'authenticated' };
}

function createChatMessage(id: string, sender: 'user' | 'assistant', content: string): ChatMessage {
  return { id, sender, content, citations: [], created_at: new Date().toISOString() };
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [user, setUser] = useState<UserPayload | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [provider, setProvider] = useState('gemini');
  const [providerConfigs, setProviderConfigs] = useState<ProviderConfig[]>([]);
  const [embeddingConfig, setEmbeddingConfig] = useState<EmbeddingConfig | null>(null);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);

  const hasCredentials = providerConfigs.length > 0 && embeddingConfig !== null;

  useEffect(() => {
    let mounted = true;

    async function initializeDashboard() {
      const { data: { user: authUser }, error } = await supabase.auth.getUser();
      if (error || !authUser) { router.push('/login'); return; }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/login'); return; }

      if (!mounted) return;

      setUser(createUserPayload(authUser.id, authUser.email));
      setToken(session.access_token);

      const [docsRes, provRes, embRes] = await Promise.all([
        listDocuments(session.access_token),
        listProviderConfigs(session.access_token),
        getEmbeddingConfig(session.access_token),
      ]);

      if (!mounted) return;

      if (docsRes.success && docsRes.data) setDocuments(docsRes.data);
      if (provRes.success && provRes.data) {
        setProviderConfigs(provRes.data);
        const defaultConfig = provRes.data.find((c) => c.is_default);
        if (defaultConfig) {
          setProvider(defaultConfig.provider);
        } else if (provRes.data.length > 0) {
          setProvider(provRes.data[0].provider);
        }
      }
      if (embRes.success && embRes.data) setEmbeddingConfig(embRes.data);
    }

    initializeDashboard();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setToken(null);
        router.push('/login');
        return;
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
        setToken(session.access_token);
        setUser(createUserPayload(session.user.id, session.user.email));
      }
    });

    return () => { mounted = false; subscription.unsubscribe(); };
  }, [supabase, router]);

  const reloadDocuments = useCallback(async (accessToken: string) => {
    const res = await listDocuments(accessToken);
    if (res.success && res.data) setDocuments(res.data);
  }, []);

  const handleUploadDocument = useCallback(async (file: File) => {
    if (!token) throw new Error('Sesi login telah berakhir.');

    const res = await uploadDocument(file, token);
    if (!res.success) throw new Error(res.error || 'Gagal mengunggah dokumen.');

    await reloadDocuments(token);
  }, [token, reloadDocuments]);

  const handleDeleteDocument = useCallback(async (id: string) => {
    if (!token) return;
    const res = await deleteDocument(id, token);
    if (res.success) setDocuments((prev) => prev.filter((d) => d.id !== id));
  }, [token]);

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    router.push('/login');
  }, [supabase, router]);

  const handleNewChat = useCallback(() => {
    setMessages([]);
    setSelectedCitation(null);
  }, []);

  const updateAssistantMessage = useCallback((assistantId: string, update: Partial<ChatMessage>) => {
    setMessages((prev) =>
      prev.map((msg) => msg.id === assistantId ? { ...msg, ...update } : msg)
    );
  }, []);

  const handleSendMessage = useCallback(async (query: string) => {
    if (!token) return;

    const assistantId = `assistant-${Date.now()}`;
    const userMsg = createChatMessage(`user-${Date.now()}`, 'user', query);
    const assistantMsg = createChatMessage(assistantId, 'assistant', '');

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    let accumulatedTokens = '';

    await fetchSSEStream(query, token, provider, documents.map((d) => d.id), {
      onCitations: (citations) => updateAssistantMessage(assistantId, { citations }),
      onToken: (tokenText) => {
        accumulatedTokens += tokenText;
        updateAssistantMessage(assistantId, { content: accumulatedTokens });
      },
      onComplete: () => setIsStreaming(false),
      onError: (errorMsg) => {
        updateAssistantMessage(assistantId, { content: `Error: ${errorMsg}` });
        setIsStreaming(false);
      },
    });
  }, [token, provider, documents, updateAssistantMessage]);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#09090b] text-[#f4f4f5]">
      <Sidebar
        user={user}
        provider={provider}
        providerConfigs={providerConfigs}
        documents={documents}
        hasCredentials={hasCredentials}
        onProviderChange={setProvider}
        onNewChat={handleNewChat}
        onLogout={handleLogout}
        onUpload={handleUploadDocument}
        onDelete={handleDeleteDocument}
      />
      <ChatWindow
        messages={messages}
        isStreaming={isStreaming}
        hasCredentials={hasCredentials}
        onSendMessage={handleSendMessage}
        onSelectCitation={setSelectedCitation}
      />
      <CitationPanel
        citation={selectedCitation}
        onClose={() => setSelectedCitation(null)}
      />
    </div>
  );
}
```

- [ ] **Step 3: Commit CitationPanel and page.tsx changes**

```bash
git add frontend/src/components/CitationPanel.tsx frontend/src/app/dashboard/page.tsx
git commit -m "feat: complete option A dashboard layout integration with slide-over citation panel"
```

---

### Task 5: Integration Verification & Next.js Type Build Test

**Files:**
- Test: `frontend/`

- [ ] **Step 1: Execute TypeScript type checking and production build in frontend**

```bash
cd frontend && npm run build
```

Expected output: Clean compilation with zero TypeScript or Next.js build errors.

- [ ] **Step 2: Commit any remaining build or formatting fixes**

```bash
git add frontend/
git commit -m "chore: verify frontend type-check and build success for redesigned dashboard"
```
