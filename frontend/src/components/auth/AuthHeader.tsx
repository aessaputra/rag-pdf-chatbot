import Link from 'next/link';
import type { AuthMode } from '@/hooks/useAuth';

interface AuthHeaderProps {
  mode: AuthMode;
}

export function AuthHeader({ mode }: AuthHeaderProps) {
  const isSignIn = mode === 'signin';
  const title = isSignIn ? 'Masuk' : 'Daftar';
  const altLinkHref = isSignIn ? '/register' : '/login';
  const altLinkLabel = isSignIn ? 'Daftar' : 'Masuk';
  const altLinkText = isSignIn ? 'Belum punya akun?' : 'Sudah punya akun?';

  return (
    <div className="flex items-baseline justify-between border-b border-subtle pb-4">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-primary">
        {title}
      </h1>

      <div className="flex items-center gap-1.5 text-xs font-mono">
        <span className="text-muted">{altLinkText}</span>
        <Link
          href={altLinkHref}
          className="text-primary hover:text-secondary underline underline-offset-4 transition-colors duration-150"
        >
          {altLinkLabel}
        </Link>
      </div>
    </div>
  );
}
