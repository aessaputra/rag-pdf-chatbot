'use client';

import { Cross1Icon, FileTextIcon } from '@radix-ui/react-icons';
import { useChat } from '@/context/ChatContext';

/**
 * Sanitizes raw PDF text extractions by replacing unprintable PUA unicode glyphs
 * (such as missing font bullet rectangles) with clean bullet characters (`•`).
 */
function sanitizeContextText(text: string): string {
  if (!text) return '';
  return text.replace(/[\uE000-\uF8FF\u25A0-\u25FF]/g, '•');
}

export default function CitationPanel() {
  const { selectedCitation, setSelectedCitation } = useChat();

  if (!selectedCitation) return null;

  const cleanContent = sanitizeContextText(selectedCitation.content);

  return (
    <aside aria-label="Detail Sitasi Dokumen PDF" className="w-90 bg-canvas border-l border-subtle p-6 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200 z-20 transition-colors duration-150">
      {/* Header */}
      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-subtle">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted">
          DETAIL SITASI
        </h3>
        <button
          type="button"
          onClick={() => setSelectedCitation(null)}
          aria-label="Tutup Detail Sitasi"
          className="p-1 rounded text-muted hover:text-primary hover:bg-surface-card-hover transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <Cross1Icon className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Flat Metadata Block */}
      <div className="space-y-1.5 mb-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <FileTextIcon className="w-4 h-4 text-muted shrink-0" aria-hidden="true" />
            <span className="text-sm font-semibold text-primary truncate" title={selectedCitation.filename}>
              {selectedCitation.filename}
            </span>
          </div>
          <span className="text-xs font-mono text-secondary bg-surface-card border border-subtle px-2.5 py-1 rounded shrink-0 [font-variant-numeric:tabular-nums]">
            HAL {selectedCitation.page_number}
          </span>
        </div>
      </div>

      {/* Editorial Quote Excerpt */}
      <div className="flex-1 flex flex-col min-h-0 space-y-2">
        <div className="text-xs font-mono text-muted uppercase tracking-wider">
          KONTEKS DOKUMEN
        </div>
        <div
          tabIndex={0}
          className="flex-1 border-l-2 border-zinc-400 pl-3 py-1 text-secondary text-sm leading-relaxed overflow-y-auto whitespace-pre-wrap font-sans focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          {cleanContent}
        </div>
      </div>
    </aside>
  );
}
