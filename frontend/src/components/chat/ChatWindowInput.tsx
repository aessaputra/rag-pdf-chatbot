'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpIcon, CheckIcon, MagicWandIcon } from '@radix-ui/react-icons';
import { useApp } from '@/context/AppContext';

import { formatProviderLabel } from '@/lib/utils';
import { useChat } from '@/context/ChatContext';

interface ChatWindowInputProps {
  readonly inputQuery: string;
  readonly onChangeInputQuery: (query: string) => void;
}

function ChatWindowInput({ inputQuery, onChangeInputQuery }: ChatWindowInputProps) {
  const { hasCredentials, provider, providerConfigs, setProvider } = useApp();

  const { isStreaming, handleSendMessage } = useChat();

  const [isProviderOpen, setIsProviderOpen] = useState(false);
  const providerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (providerRef.current && !providerRef.current.contains(event.target as Node)) {
        setIsProviderOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [inputQuery]);

  const activeConfig = providerConfigs.find((c) => c.provider === provider) || providerConfigs[0];
  const activeLabel = formatProviderLabel(activeConfig, provider || undefined);

  const handleSubmit = async (e?: React.SyntheticEvent<HTMLFormElement>) => {
    if (e) e.preventDefault();
    if (!hasCredentials || !inputQuery.trim() || isStreaming) return;
    const query = inputQuery;
    onChangeInputQuery('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    await handleSendMessage(query);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="p-4 md:px-6 md:pb-6 pb-[calc(1rem+env(safe-area-inset-bottom))] border-t border-subtle bg-canvas">
      <form
        onSubmit={handleSubmit}
        className="max-w-3xl mx-auto flex items-end gap-2 p-2 pl-3 rounded-2xl bg-surface-card border border-subtle focus-within:ring-2 focus-within:ring-zinc-400/40 focus-within:border-zinc-400 transition-all duration-150 shadow-xs"
      >

        {providerConfigs && providerConfigs.length > 0 ? (
          <div ref={providerRef} className="relative flex items-center shrink-0 mb-0.5 mr-1">
            <button
              type="button"
              onClick={() => setIsProviderOpen((prev) => !prev)}
              disabled={isStreaming}
              aria-expanded={isProviderOpen}
              aria-haspopup="listbox"
              aria-label="Pilih Provider AI"
              title={`Ganti Provider (Aktif: ${activeLabel})`}
              className="p-3 md:p-1.5 text-muted hover:text-primary hover:bg-surface-card-hover rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400 focus:outline-hidden cursor-pointer"
            >
              <MagicWandIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
            </button>


            {isProviderOpen && (
              <div
                role="listbox"
                aria-label="Daftar Provider AI"
                className="absolute bottom-full mb-2 left-0 z-50 min-w-50 p-1 rounded-lg bg-surface-card border border-subtle shadow-lg animate-in fade-in zoom-in-95 duration-100 space-y-0.5"
              >
                <div className="px-2.5 py-1 text-xs font-mono text-muted uppercase tracking-wider border-b border-subtle mb-1">
                  PROVIDER AI
                </div>
                {providerConfigs.map((config) => {
                  const isSelected = config.provider === provider;
                  const label = formatProviderLabel(config, provider || undefined);
                  return (
                    <button
                      key={config.id}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => {
                        setProvider(config.provider);
                        setIsProviderOpen(false);
                      }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs font-mono transition-colors flex items-center justify-between cursor-pointer ${
                        isSelected
                          ? 'bg-surface-card-hover text-primary font-semibold'
                          : 'text-secondary hover:text-primary hover:bg-surface-card-hover/50'
                      }`}
                    >
                      <span className="truncate">{label}</span>
                      {isSelected && <CheckIcon className="w-3.5 h-3.5 text-primary shrink-0 ml-2" aria-hidden="true" />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : null}


        <label htmlFor="chat-input-textarea" className="sr-only">
          Pertanyaan tentang dokumen PDF
        </label>
        <textarea
          id="chat-input-textarea"
          ref={textareaRef}
          rows={1}
          value={inputQuery}
          onChange={(e) => onChangeInputQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={!hasCredentials || isStreaming}
          placeholder={
            !hasCredentials
              ? 'Konfigurasi provider AI di Pengaturan terlebih dahulu…'
              : 'Tanyakan sesuatu…'
          }
          className="flex-1 bg-transparent border-none text-sm text-primary placeholder:text-muted focus:outline-hidden disabled:opacity-50 disabled:cursor-not-allowed min-w-0 py-1.5 px-1 font-sans resize-none max-h-36 overflow-y-auto leading-relaxed"
        />


        <button
          type="submit"
          aria-label="Kirim Pertanyaan"
          disabled={!hasCredentials || isStreaming || !inputQuery.trim()}
          className="minimal-button-primary w-11 h-11 md:w-8 md:h-8 rounded-xl flex items-center justify-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer mb-0.5"
        >
          {isStreaming ? (
            <div className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" aria-label="Mengirim…" />
          ) : (
            <ArrowUpIcon className="w-3.5 h-3.5" aria-hidden="true" />
          )}
        </button>
      </form>
    </div>
  );
}

export default ChatWindowInput;
