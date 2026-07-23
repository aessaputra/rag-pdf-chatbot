/**
 * Supabase Browser Client Helper
 * Initializes browser-side client for Next.js App Router using @supabase/ssr.
 * Strictly uses modern Publishable Key (NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) per @supabase/server skill guidelines.
 */

import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://sgfhbxprnsolgcgzuymn.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_lMDEZn1F3hJZa2jNKEXJvQ_sD04VImY';

  return createBrowserClient(supabaseUrl, supabaseKey);
}
