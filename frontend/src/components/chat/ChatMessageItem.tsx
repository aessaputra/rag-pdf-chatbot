'use client';

import React, { memo } from 'react';
import { FaceIcon, FileTextIcon } from '@radix-ui/react-icons';
import type { ChatMessage, Citation } from '@/types';

interface ChatMessageItemProps {
  readonly msg: ChatMessage;
  readonly onSelectCitation: (citation: Citation) => void;
}

function formatInlineMarkdown(
  text: string, 
  citations?: readonly Citation[], 
  onSelectCitation?: (c: Citation) => void
) {
  const parts = text.split(/(\[\d+\]|\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    // Handle inline citations
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

/**
 * Lightweight inline markdown renderer for structured AI streaming text.
 * Memoized to avoid re-parsing static markdown strings across unchanged messages.
 */
const FormattedMessage = memo(function FormattedMessage({ 
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

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-1">
              <span className="text-muted text-xs mt-0.5 select-none">•</span>
              <span className="flex-1">{formatInlineMarkdown(trimmed.slice(2), citations, onSelectCitation)}</span>
            </div>
          );
        }

        // Numbered lists (e.g. "1. ")
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-1">
              <span className="text-muted font-mono text-xs mt-0.5 select-none">{numMatch[1]}.</span>
              <span className="flex-1">{formatInlineMarkdown(numMatch[2], citations, onSelectCitation)}</span>
            </div>
          );
        }

        // Headers (### or ##)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-sm font-semibold text-primary mt-3 mb-1 [text-wrap:balance]">
              {formatInlineMarkdown(trimmed.slice(4), citations, onSelectCitation)}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-base font-semibold font-serif text-primary mt-4 mb-1 [text-wrap:balance]">
              {formatInlineMarkdown(trimmed.slice(3), citations, onSelectCitation)}
            </h3>
          );
        }

        return <div key={idx}>{formatInlineMarkdown(trimmed, citations, onSelectCitation)}</div>;
      })}
    </div>
  );
});

/**
 * Individual Chat Message Article component.
 * Wrapped in React.memo so historical messages are NOT re-rendered
 * when streaming tokens arrive for the active assistant message.
 */
export const ChatMessageItem = memo(
  function ChatMessageItem({ msg, onSelectCitation }: ChatMessageItemProps) {
    return (
      <article
        className={`flex flex-col max-w-3xl mx-auto ${
          msg.sender === 'user' ? 'items-end' : 'items-start'
        }`}
      >
        {msg.sender === 'user' ? (
          <div className="p-3.5 rounded-xl bg-surface-card-hover border border-subtle text-primary max-w-lg shadow-2xs font-sans text-sm leading-relaxed">
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ) : (
          <div className="flex items-start gap-3 w-full">
            <div className="w-7 h-7 rounded bg-surface-card border border-subtle flex items-center justify-center shrink-0 mt-0.5">
              <FaceIcon className="w-4 h-4 text-muted" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 p-5 rounded-xl bg-surface-card/60 border border-subtle text-primary shadow-2xs font-sans">
              <FormattedMessage 
                content={msg.content} 
                citations={msg.citations} 
                onSelectCitation={onSelectCitation} 
              />
            </div>
          </div>
        )}
      </article>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.msg.id === nextProps.msg.id &&
      prevProps.msg.content === nextProps.msg.content &&
      prevProps.msg.citations === nextProps.msg.citations
    );
  }
);

export default ChatMessageItem;
