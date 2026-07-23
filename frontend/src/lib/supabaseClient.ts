import { createBrowserClient } from '@supabase/ssr';

let instance: ReturnType<typeof createBrowserClient> | null = null;

export function createClient() {
  if (instance) return instance;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY harus di-set.');
  }

  instance = createBrowserClient(url, key);
  return instance;
}
