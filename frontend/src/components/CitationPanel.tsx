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
    <div className="w-80 glass-panel border-l border-slate-800/80 p-5 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-cyan-400" /> Detail Sitasi PDF
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Metadata Badges */}
      <div className="space-y-3 mb-6">
        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="truncate">
            <div className="text-[10px] uppercase font-semibold text-slate-400">Dokumen Sumber</div>
            <div className="text-xs font-medium text-slate-200 truncate">{citation.filename}</div>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-cyan-400">Hal</span>
          </div>
          <div>
            <div className="text-[10px] uppercase font-semibold text-slate-400">Nomor Halaman PDF</div>
            <div className="text-xs font-medium text-slate-200">Halaman {citation.page_number}</div>
          </div>
        </div>
      </div>

      {/* Content Snippet */}
      <div className="flex-1 flex flex-col min-h-0">
        <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Kutipan Konteks Teks
        </label>
        <div className="flex-1 p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 text-slate-300 text-xs leading-relaxed overflow-y-auto font-mono whitespace-pre-wrap">
          {citation.content}
        </div>
      </div>
    </div>
  );
}
