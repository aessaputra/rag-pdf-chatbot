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
    <aside aria-label="Detail Sitasi Dokumen PDF" className="w-[320px] bg-[#09090b] border-l border-[#232326] p-4 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200 z-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#232326]">
        <h3 className="text-xs font-semibold text-[#f4f4f5] flex items-center gap-1.5">
          <BookOpen className="w-3.5 h-3.5 text-[#a1a1aa]" aria-hidden="true" /> Detail Sitasi PDF
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Detail Sitasi"
          className="p-1 rounded text-[#a1a1aa] hover:text-[#f4f4f5] hover:bg-[#18181b] transition-colors focus-visible:ring-2 focus-visible:ring-[#52525b]"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Metadata Info */}
      <div className="space-y-2 mb-4">
        <div className="p-2.5 rounded-lg bg-[#121215] border border-[#232326] flex items-center gap-2.5">
          <FileText className="w-4 h-4 text-[#a1a1aa] shrink-0" aria-hidden="true" />
          <div className="truncate">
            <div className="text-[9px] uppercase font-mono text-[#71717a]">Dokumen Sumber</div>
            <div className="text-xs font-medium text-[#f4f4f5] truncate">{citation.filename}</div>
          </div>
        </div>

        <div className="p-2.5 rounded-lg bg-[#121215] border border-[#232326] flex items-center gap-2.5">
          <span className="text-xs font-mono text-[#a1a1aa] shrink-0" aria-hidden="true">Hal</span>
          <div>
            <div className="text-[9px] uppercase font-mono text-[#71717a]">Halaman PDF</div>
            <div className="text-xs font-medium font-mono text-[#f4f4f5]">Halaman {citation.page_number}</div>
          </div>
        </div>
      </div>

      {/* Excerpt Monospace Box */}
      <div className="flex-1 flex flex-col min-h-0">
        <label htmlFor="citation-excerpt-content" className="block text-[10px] font-mono text-[#71717a] uppercase tracking-wider mb-1.5">
          Kutipan Konteks Teks
        </label>
        <div
          id="citation-excerpt-content"
          tabIndex={0}
          className="flex-1 p-3 rounded-lg bg-[#121215] border border-[#232326] text-[#a1a1aa] text-xs leading-relaxed overflow-y-auto font-mono whitespace-pre-wrap selection:bg-[#27272a] focus-visible:ring-2 focus-visible:ring-[#52525b]"
        >
          {citation.content}
        </div>
      </div>
    </aside>
  );
}
