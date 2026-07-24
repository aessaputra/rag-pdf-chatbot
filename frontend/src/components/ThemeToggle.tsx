'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={`inline-flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-card p-0.5 ${className}`}
        aria-hidden="true"
      >
        <div className="h-7 w-7 rounded-md bg-transparent" />
        <div className="h-7 w-7 rounded-md bg-transparent" />
        <div className="h-7 w-7 rounded-md bg-transparent" />
      </div>
    );
  }

  const options = [
    { id: 'light', label: 'Terang', icon: Sun },
    { id: 'dark', label: 'Gelap', icon: Moon },
    { id: 'system', label: 'Sistem', icon: Monitor },
  ] as const;

  return (
    <div
      role="group"
      aria-label="Pilihan mode tema tampilan"
      className={`inline-flex items-center gap-0.5 rounded-lg border border-subtle bg-surface-card p-0.5 shadow-2xs ${className}`}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = theme === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => setTheme(opt.id)}
            aria-label={`Pilih mode ${opt.label.toLowerCase()}`}
            aria-pressed={isActive}
            className={`relative flex h-7 items-center justify-center gap-1.5 rounded-md px-2 text-xs font-medium transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-400 ${
              isActive
                ? 'bg-surface-card-hover text-primary shadow-xs font-semibold'
                : 'text-muted hover:text-primary hover:bg-surface-card-hover/50'
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline font-sans">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
