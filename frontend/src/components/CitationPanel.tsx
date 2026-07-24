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


