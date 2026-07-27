import React, { memo } from 'react';
import type { Citation } from '@/types';

const INLINE_MARKDOWN_REGEX = /(\[\d+\]|\*\*.*?\*\*|\*.*?\*|`.*?`)/g;

function formatInlineMarkdown(
  text: string, 
  citations?: readonly Citation[], 
  onSelectCitation?: (c: Citation) => void
) {
  const parts = text.split(INLINE_MARKDOWN_REGEX);
  return parts.map((part, i) => {

    if (part.startsWith('[') && part.endsWith(']')) {
      const citationIndex = parseInt(part.slice(1, -1), 10) - 1;
      const citation = citations?.[citationIndex];

      if (citation && onSelectCitation) {
        return (
          <button
            key={i}
            type="button"
            onClick={() => onSelectCitation(citation)}
            aria-label={`Buka sitasi ${citation.filename} halaman ${citation.page_number}`}
            className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 rounded bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20 text-xs font-mono transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-blue-400 align-baseline leading-none"
          >
            <span className="font-semibold [font-variant-numeric:tabular-nums]">[{citationIndex + 1}]</span>
          </button>
        );
      }

      return (
        <span key={i} className="text-muted text-xs font-mono mx-0.5">
          {part}
        </span>
      );
    }

    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
      return (
        <em key={i} className="italic text-primary">
          {part.slice(1, -1)}
        </em>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-surface-card-hover border border-subtle font-mono text-xs text-primary">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

export const FormattedMessage = memo(function FormattedMessage({ 
  content, 
  citations, 
  onSelectCitation 
}: { 
  readonly content: string;
  readonly citations?: readonly Citation[];
  readonly onSelectCitation?: (c: Citation) => void;
}) {
  const lines = content.split('\n');
  return (
    <div className="space-y-2.5 text-sm leading-relaxed text-primary">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-1">
              <span className="text-muted text-xs mt-0.5 select-none">•</span>
              <span className="flex-1">{formatInlineMarkdown(trimmed.slice(2), citations, onSelectCitation)}</span>
            </div>
          );
        }

        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-1">
              <span className="text-muted font-mono text-xs mt-0.5 select-none">{numMatch[1]}.</span>
              <span className="flex-1">{formatInlineMarkdown(numMatch[2], citations, onSelectCitation)}</span>
            </div>
          );
        }

        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-primary mt-3 mb-1 text-balance">
              {formatInlineMarkdown(trimmed.slice(4), citations, onSelectCitation)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-base font-semibold font-serif text-primary mt-4 mb-1 text-balance">
              {formatInlineMarkdown(trimmed.slice(3), citations, onSelectCitation)}
            </h3>
          );
        }

        return <div key={idx}>{formatInlineMarkdown(trimmed, citations, onSelectCitation)}</div>;
      })}
    </div>
  );
});
