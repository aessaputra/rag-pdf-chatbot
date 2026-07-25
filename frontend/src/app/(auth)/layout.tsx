import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-canvas text-primary transition-colors duration-150 relative">
      {/* Top Right Header Theme Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>

      {/* Subtle ambient lighting */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_30%,var(--border-subtle),transparent_70%)] pointer-events-none z-0 opacity-40" />

      {/* Cardless Form Container */}
      <div className="w-full max-w-sm relative z-10 space-y-6">
        {children}
      </div>
    </div>
  );
}
