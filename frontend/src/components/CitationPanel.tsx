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
    <aside aria-label="Detail Sitasi Dokumen PDF" className="w-[320px] bg-canvas border-l border-subtle p-5 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200 z-20 transition-colors duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-subtle">
        <h3 className="text-[11px] font-mono uppercase tracking-wider text-muted">
          DETAIL SITASI
        </h3>
        <button
          type="button"
          onClick={onClose}
          aria-label="Tutup Detail Sitasi"
          className="p-1 rounded text-muted hover:text-primary hover:bg-surface-card-hover transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <X className="w-3.5 h-3.5" aria-hidden="true" />
        </button>
      </div>

      {/* Flat Metadata Block (No Sub-Cards) */}
      <div className="space-y-1.5 mb-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileText className="w-3.5 h-3.5 text-muted shrink-0" aria-hidden="true" />
            <span className="text-xs font-semibold text-primary truncate" title={citation.filename}>
              {citation.filename}
            </span>
          </div>
          <span className="text-[10px] font-mono text-secondary bg-surface-card border border-subtle px-2 py-0.5 rounded shrink-0">
            HAL {citation.page_number}
          </span>
        </div>
      </div>

      {/* Editorial Quote Excerpt */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="text-[10px] font-mono text-muted uppercase tracking-wider">
          KONTEKS DOKUMEN
        </div>
        <div
          tabIndex={0}
          className="flex-1 border-l-2 border-zinc-500 pl-3 py-1 text-secondary text-xs leading-relaxed overflow-y-auto whitespace-pre-wrap font-sans focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          {cleanContent}
        </div>
      </div>
    </aside>
  );
}
