'use client';

import Image from 'next/image';
import Link from 'next/link';
import { FileTextIcon, ExitIcon, ChatBubbleIcon, PlusIcon, GearIcon, TrashIcon } from '@radix-ui/react-icons';
import { useApp } from '@/context/AppContext';
import { useDocument } from '@/context/DocumentContext';
import { useChat } from '@/context/ChatContext';
import { useSidebar } from '@/context/SidebarContext';
import { ThemeToggle } from '../theme/ThemeToggle';
import { ViewVerticalIcon } from '@radix-ui/react-icons';

export default function Sidebar() {
  const { user, handleLogout } = useApp();
  const { setIsDocModalOpen } = useDocument();
  const {
    sessions,
    activeSessionId,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
  } = useChat();
  const { isOpen, toggle } = useSidebar();

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 md:hidden animate-in fade-in duration-200"
          onClick={toggle}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label="Navigasi Utama"
        className={`fixed inset-y-0 left-0 md:relative h-screen bg-canvas shrink-0 select-none z-40 md:z-20 transition-all duration-300 ease-in-out overflow-hidden md:shadow-none shadow-2xl ${
          isOpen ? 'w-65 border-r border-subtle' : 'w-0 border-r-0 opacity-0'
        }`}
      >
      <div className="w-65 h-full flex flex-col justify-between">
        <div className="h-13 px-4 flex items-center justify-between border-b border-subtle shrink-0">
        <div className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt="PaperMind Logo"
            width={28}
            height={28}
            className="w-7 h-7 shrink-0"
            priority
          />
          <span className="text-base font-extrabold text-primary tracking-tight">
            PaperMind
          </span>
        </div>
        <button
          type="button"
          onClick={toggle}
          className="p-3 md:p-1.5 text-muted hover:text-primary hover:bg-surface-card-hover rounded-md transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400"
          title="Tutup Sidebar"
          aria-label="Tutup Sidebar"
          aria-expanded={isOpen}
        >
          <ViewVerticalIcon className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      <div className="flex flex-col flex-1 min-h-0 p-4 space-y-4">
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={handleNewChat}
            className="w-full minimal-button-primary py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <PlusIcon className="w-4 h-4" aria-hidden="true" />
            <span>Percakapan Baru</span>
          </button>

          <button
            type="button"
            onClick={() => setIsDocModalOpen(true)}
            className="w-full py-1.5 px-3 rounded-md text-xs font-medium text-secondary hover:text-primary bg-surface-card hover:bg-surface-card-hover border border-subtle transition-colors flex items-center justify-start gap-1.5 cursor-pointer focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            <FileTextIcon className="w-4 h-4" aria-hidden="true" />
            <span>Dokumen Saya</span>
          </button>
        </div>

        {sessions.length > 0 ? (
          <div className="flex-1 space-y-1.5 flex flex-col min-h-0 pt-2 border-t border-subtle">
            <div className="text-xs font-mono text-muted uppercase tracking-wider px-1">
              PERCAKAPAN
            </div>
            <div className="overflow-y-auto space-y-1 pr-1 flex-1">
              {sessions.map((sess) => (
                <div
                  key={sess.id}
                  className={`group flex items-center justify-between w-full py-1.5 px-2 rounded-md text-xs transition-colors ${
                    activeSessionId === sess.id
                      ? 'bg-surface-card-hover border border-subtle text-primary font-medium'
                      : 'text-secondary hover:text-primary hover:bg-surface-card-hover/50'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleSelectSession(sess.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left cursor-pointer focus:outline-hidden"
                  >
                    <ChatBubbleIcon className="w-3.5 h-3.5 shrink-0 text-muted" aria-hidden="true" />
                    <span className="truncate text-xs">{sess.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(sess.id);
                    }}
                    title="Hapus percakapan"
                    aria-label="Hapus percakapan"
                    className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-rose-500 transition-opacity cursor-pointer focus-visible:ring-1 focus-visible:ring-zinc-400"
                  >
                    <TrashIcon className="w-3.5 h-3.5" aria-hidden="true" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="p-4 pt-3 border-t border-subtle space-y-2">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-mono text-muted uppercase tracking-wider">TEMA</span>
          <ThemeToggle compact />
        </div>

        <div className="flex items-center justify-between p-2 rounded-md bg-surface-card border border-subtle gap-2">
          <div className="flex items-center min-w-0 gap-2 flex-1">
            <div className="w-6.5 h-6.5 rounded-md bg-surface-card-hover border border-subtle flex items-center justify-center text-xs font-mono font-medium text-primary shrink-0">
              {(user?.email?.[0] || 'U').toUpperCase()}
            </div>
            <span className="text-xs font-mono text-secondary truncate min-w-0" title={user?.email || 'Pengguna'}>
              {user?.email || 'Pengguna'}
            </span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <Link
              href="/settings"
              title="Pengaturan"
              aria-label="Pengaturan"
              className="p-1.5 text-muted hover:text-primary hover:bg-surface-card-hover rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400"
            >
              <GearIcon className="w-4 h-4" aria-hidden="true" />
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              aria-label="Keluar"
              className="p-1.5 text-muted hover:text-rose-500 hover:bg-surface-card-hover rounded-md transition-colors focus-visible:ring-1 focus-visible:ring-zinc-400 cursor-pointer"
            >
              <ExitIcon className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
      </div>
    </aside>
    </>
  );
}

