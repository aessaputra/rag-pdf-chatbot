import type { AuthMode } from '@/hooks/useAuth';
import type { AuthState } from '@/types';

interface AuthFormProps {
  mode: AuthMode;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  authState: AuthState;
  onSubmit: (e: React.FormEvent) => void;
}

export function AuthForm({
  mode,
  email,
  setEmail,
  password,
  setPassword,
  authState,
  onSubmit,
}: AuthFormProps) {
  const isLoading = authState.status === 'loading';
  const buttonLabel = mode === 'signin' ? 'Masuk' : 'Daftar';
  const autoComplete = mode === 'signup' ? 'new-password' : 'current-password';

  return (
    <form onSubmit={onSubmit} className="space-y-4" autoComplete="on">
      <div>
        <label
          htmlFor="auth-email"
          className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5"
        >
          EMAIL
        </label>
        <input
          id="auth-email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@email.com"
          className="w-full px-3 py-2.5 rounded-md minimal-input text-xs"
        />
      </div>

      <div>
        <label
          htmlFor="auth-password"
          className="block font-mono text-[11px] uppercase tracking-wider text-muted mb-1.5"
        >
          KATA SANDI
        </label>
        <input
          id="auth-password"
          name="password"
          type="password"
          autoComplete={autoComplete}
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          className="w-full px-3 py-2.5 rounded-md minimal-input text-xs"
        />
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full mt-2 py-2.5 px-4 rounded-md minimal-button-primary text-xs flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Memproses…
          </span>
        ) : (
          <span>{buttonLabel}</span>
        )}
      </button>
    </form>
  );
}
