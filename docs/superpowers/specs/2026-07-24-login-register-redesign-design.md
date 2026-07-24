# Design Specification: Cardless Utilitarian Login & Register Redesign

**Date**: 2026-07-24  
**Topic**: Login & Register Page Redesign (`frontend/src/app/login/page.tsx`)  
**Design Paradigm**: Premium Utilitarian Minimalism & Zero-Clutter UX (`/minimalist-ui`, `/redesign-existing-projects`, `/web-design-guidelines`)

---

## 1. Overview & Goal

Redesign the authentication page (`/login`) of the RAG PDF Chatbot application to adhere to strict utilitarian minimalism and eliminate all UX copy clutter, redundant badges, marketing fluff, and unnecessary container boxes.

### Core Objectives:
1. **Zero UX Copy Clutter**: Remove marketing slogans, badges (`v1.0 • Supabase RLS`), help text, and decorative footers. Use sharp, single-word Indonesian labels (`Masuk`, `Daftar`, `Email`, `Kata sandi`).
2. **Cardless Utilitarian Layout**: Strip out the outer container card and shadows. The form integrates cleanly into the dark canvas with high-contrast editorial typography and macro-whitespace.
3. **Optimized Auth Flow & Vercel React Best Practices**: Preserve Supabase Auth logic (`signInWithPassword` & `signUp`), memoize Supabase client instantiation, apply early exits (`js-early-exit`), and explicit ternary conditional rendering (`rendering-conditional-render`).

---

## 2. Component Structure & UX Copy Audit

### A. Eliminated Clutter (Before vs. After)

| Component Area | Existing (Before) | Redesigned (After) | Rationale |
|---|---|---|---|
| **Header Badge** | `v1.0 • Supabase RLS` | *Removed* | Visual clutter that provides no user value on an auth page. |
| **Headline** | `Masuk ke akun Anda` / `Buat akun baru` | **`Masuk`** / **`Daftar`** | High-contrast editorial display font, crisp 1-word heading. |
| **Subtitle** | `Kelola dokumen PDF & percakapan tanya-jawab...` | *Removed* | Unnecessary marketing fluff. |
| **Mode Switcher** | Heavy rounded box with `"Masuk Akun"` / `"Daftar Baru"` | Minimal text switcher: **`Masuk`** · **`Daftar`** | Clean inline toggle without heavy border boxes. |
| **Input Labels** | `"Alamat Email"`, `"Kata Sandi"` + `"Min. 6 karakter"` | Monospace uppercase: **`EMAIL`**, **`KATA SANDI`** | Utilitarian styling with wide tracking (`tracking-wider`). Removed helper text. |
| **Input Icons** | `Mail` and `Lock` icons inside inputs | *Removed* | Decorational noise removed to speed up visual scanning. |
| **Primary CTA** | `"Masuk Sekarang"` / `"Daftar Akun"` | **`Masuk`** / **`Daftar`** | Direct, solid `#fafafa` button with `#09090b` text. |
| **Footer Info** | `"Terproteksi Supabase Auth"` & `"Tekan Enter ↵"` | *Removed* | Eliminates bottom noise. |

---

## 3. Technical Implementation Details

### File: `frontend/src/app/login/page.tsx`

1. **State & Client Initialization**:
   ```tsx
   const supabase = useMemo(() => createClient(), []);
   const [mode, setMode] = useState<'signin' | 'signup'>('signin');
   const [email, setEmail] = useState('');
   const [password, setPassword] = useState('');
   const [authState, setAuthState] = useState<AuthState>({ status: 'idle' });
   ```

2. **Early Exit Validation & Auth Action**:
   ```tsx
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!email || !password) return; // js-early-exit

     setAuthState({ status: 'loading' });
     try {
       const authAction = mode === 'signup'
         ? supabase.auth.signUp({ email, password })
         : supabase.auth.signInWithPassword({ email, password });

       const { data, error } = await authAction;
       if (error) throw error;

       if (data.user) {
         setAuthState({ status: 'success', user: { user_id: data.user.id, email: data.user.email || email, role: 'authenticated' } });
         setTimeout(() => router.push('/dashboard'), mode === 'signup' ? 1000 : 0);
       }
     } catch (err: any) {
       setAuthState({
         status: 'error',
         message: toUserFriendlyError(err.message || 'Terjadi kesalahan otentikasi.'),
       });
     }
   };
   ```

3. **Utilitarian Form UI**:
   - Canvas: `min-h-screen flex flex-col items-center justify-center p-4 bg-[#09090b] text-[#f4f4f5]`
   - Form width constraint: `w-full max-w-sm`
   - Inputs: `bg-[#121215] border border-[#232326] focus:border-[#52525b] rounded-md px-3 py-2.5 text-xs text-white`
   - CTA Button: `w-full bg-[#fafafa] text-[#09090b] font-medium py-2.5 rounded-md hover:bg-[#e4e4e7] active:scale-[0.98] transition-all duration-150 text-xs`

---

## 4. Verification Plan

1. **Automated Verification**:
   - Run `npm run build` in `frontend/` to ensure strict TypeScript and Next.js App Router build passes cleanly.
2. **Manual Verification**:
   - Toggle between `Masuk` and `Daftar` modes.
   - Verify error alert styling on invalid credentials.
   - Verify redirect to `/dashboard` upon successful login.
