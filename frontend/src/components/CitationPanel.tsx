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

