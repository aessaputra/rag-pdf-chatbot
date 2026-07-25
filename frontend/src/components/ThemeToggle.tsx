'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { SunIcon, MoonIcon, DesktopIcon } from '@radix-ui/react-icons';

export function ThemeToggle({ className = '', compact = false }: { className?: string; compact?: boolean }) {
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
        <div className="h-6 w-6 rounded-md bg-transparent" />
        <div className="h-6 w-6 rounded-md bg-transparent" />
        <div className="h-6 w-6 rounded-md bg-transparent" />
      </div>
    );
  }

  const options = [
    { id: 'light', label: 'Terang', icon: SunIcon },
    { id: 'dark', label: 'Gelap', icon: MoonIcon },
    { id: 'system', label: 'Sistem', icon: DesktopIcon },
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
            title={`Mode ${opt.label}`}
            aria-label={`Pilih mode ${opt.label.toLowerCase()}`}
            aria-pressed={isActive}
            className={`relative flex items-center justify-center rounded-md transition-all duration-150 focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-zinc-400 ${
              compact ? 'h-6 w-6 p-1' : 'h-7 px-2 gap-1.5 text-xs font-medium'
            } ${
              isActive
                ? 'bg-surface-card-hover text-primary shadow-xs font-semibold'
                : 'text-muted hover:text-primary hover:bg-surface-card-hover/50'
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {!compact && <span className="hidden sm:inline font-sans">{opt.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
