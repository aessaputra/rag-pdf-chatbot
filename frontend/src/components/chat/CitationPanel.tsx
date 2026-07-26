'use client';

import { Cross1Icon, FileTextIcon } from '@radix-ui/react-icons';
import { useChat } from '@/context/ChatContext';


function sanitizeContextText(text: string): string {
  if (!text) return '';
  return text.replace(/[\uE000-\uF8FF\u25A0-\u25FF]/g, '•');
}

export default function CitationPanel() {
  const { selectedCitation, setSelectedCitation } = useChat();

  if (!selectedCitation) return null;

  const cleanContent = sanitizeContextText(selectedCitation.content);

  return (
    <>
      <div 
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
        onClick={() => setSelectedCitation(null)}
        aria-hidden="true"
      />
      <aside aria-label="Detail Sitasi Dokumen PDF" className="fixed inset-y-0 right-0 md:relative w-[85vw] sm:w-100 md:w-90 bg-canvas border-l border-subtle p-4 md:p-6 flex flex-col h-screen shrink-0 animate-in slide-in-from-right duration-200 z-40 md:z-20 transition-colors shadow-2xl md:shadow-none">

      <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-subtle">
        <h3 className="text-xs font-mono uppercase tracking-wider text-muted">
          DETAIL SITASI
        </h3>
        <button
          type="button"
          onClick={() => setSelectedCitation(null)}
          aria-label="Tutup Detail Sitasi"
          className="p-3 md:p-1 rounded text-muted hover:text-primary hover:bg-surface-card-hover transition-colors focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          <Cross1Icon className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>


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
            {selectedCitation.line_start && selectedCitation.line_end ? ` BARIS ${selectedCitation.line_start}-${selectedCitation.line_end}` : ''}
          </span>
        </div>
      </div>


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
    </>
  );
}
