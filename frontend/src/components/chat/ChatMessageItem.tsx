'use client';

import React, { memo } from 'react';
import { FaceIcon } from '@radix-ui/react-icons';
import type { ChatMessage, Citation } from '@/types';
import { FormattedMessage } from './FormattedMessage';

interface ChatMessageItemProps {
  readonly msg: ChatMessage;
  readonly onSelectCitation: (citation: Citation) => void;
}




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
              {msg.content ? (
                <FormattedMessage 
                  content={msg.content} 
                  citations={msg.citations} 
                  onSelectCitation={onSelectCitation} 
                />
              ) : (
                <div className="flex gap-1.5 items-center h-5 opacity-60">
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse [animation-delay:200ms]" />
                  <div className="w-2 h-2 rounded-full bg-current animate-pulse [animation-delay:400ms]" />
                </div>
              )}
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
