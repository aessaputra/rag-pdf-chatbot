import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { AppProvider } from '@/context/AppContext';
import { DocumentProvider } from '@/context/DocumentContext';
import { ChatProvider } from '@/context/ChatContext';
import { SidebarProvider } from '@/context/SidebarContext';

export default async function MainLayout({ children }: { readonly children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    redirect('/login');
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet, _headers) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {}
      },
    } as CookieMethodsServer,
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect('/login');
  }

  return (
    <AppProvider initialSession={session}>
      <DocumentProvider>
        <SidebarProvider>
          <ChatProvider>
            {children}
          </ChatProvider>
        </SidebarProvider>
      </DocumentProvider>
    </AppProvider>
  );
}
