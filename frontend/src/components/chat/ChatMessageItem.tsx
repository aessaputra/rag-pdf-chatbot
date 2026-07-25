'use client';

import React, { memo } from 'react';
import { FaceIcon, FileTextIcon } from '@radix-ui/react-icons';
import type { ChatMessage, Citation } from '@/types';

interface ChatMessageItemProps {
  readonly msg: ChatMessage;
  readonly onSelectCitation: (citation: Citation) => void;
}

function formatInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      return (
        <code key={i} className="px-1.5 py-0.5 rounded bg-surface-card-hover border border-subtle font-mono text-[11px] text-primary">
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
const FormattedMessage = memo(function FormattedMessage({ content }: { readonly content: string }) {
  const lines = content.split('\n');
  return (
    <div className="space-y-2 text-xs leading-relaxed text-primary">
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return <div key={idx} className="h-1" />;

        // Bullet lists
        if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-muted text-[10px] mt-0.5 select-none">•</span>
              <span className="flex-1">{formatInlineMarkdown(trimmed.slice(2))}</span>
            </div>
          );
        }

        // Numbered lists (e.g. "1. ")
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-2 pl-2 my-0.5">
              <span className="text-muted font-mono text-[10px] mt-0.5 select-none">{numMatch[1]}.</span>
              <span className="flex-1">{formatInlineMarkdown(numMatch[2])}</span>
            </div>
          );
        }

        // Headers (### or ##)
        if (trimmed.startsWith('### ')) {
          return (
            <h4 key={idx} className="text-xs font-semibold text-primary mt-3 mb-1">
              {formatInlineMarkdown(trimmed.slice(4))}
            </h4>
          );
        }
        if (trimmed.startsWith('## ')) {
          return (
            <h3 key={idx} className="text-sm font-semibold font-serif text-primary mt-4 mb-1">
              {formatInlineMarkdown(trimmed.slice(3))}
            </h3>
          );
        }

        return <p key={idx}>{formatInlineMarkdown(line)}</p>;
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
          <div className="p-3.5 rounded-xl bg-surface-card-hover border border-subtle text-primary max-w-lg shadow-2xs font-sans text-xs leading-relaxed">
            <div className="whitespace-pre-wrap">{msg.content}</div>
          </div>
        ) : (
          <div className="flex items-start gap-3 w-full">
            <div className="w-6 h-6 rounded bg-surface-card border border-subtle flex items-center justify-center shrink-0 mt-0.5">
              <FaceIcon className="w-3.5 h-3.5 text-muted" aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0 p-4 rounded-xl bg-surface-card/60 border border-subtle text-primary shadow-2xs font-sans">
              <FormattedMessage content={msg.content} />

              {/* Source Citations Horizontal Strip */}
              {msg.citations && msg.citations.length > 0 ? (
                <div className="mt-4 pt-3 border-t border-subtle">
                  <div className="flex flex-wrap items-center gap-2">
                    {msg.citations.map((c, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => onSelectCitation(c)}
                        aria-label={`Buka sitasi ${c.filename} halaman ${c.page_number}`}
                        className="py-1 px-2.5 rounded-md bg-surface-card hover:bg-surface-card-hover border border-subtle text-secondary hover:text-primary text-[11px] font-mono transition-colors flex items-center gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400"
                      >
                        <FileTextIcon className="w-3 h-3 text-muted" aria-hidden="true" />
                        <span className="font-medium">Hal {c.page_number}</span>
                        <span className="text-muted text-[10px] truncate max-w-[120px]">
                          ({c.filename})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
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
