/**
 * Supabase Browser Client Helper
 * Initializes browser-side client for Next.js App Router using @supabase/ssr.
 * Supports modern Publishable Key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) per /supabase skill guidelines.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
  const supabaseKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'placeholder-anon-key';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
