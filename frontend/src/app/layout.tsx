import type { Metadata } from 'next';
import { Geist, Geist_Mono, Newsreader } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const newsreader = Newsreader({
  variable: '--font-newsreader',
  subsets: ['latin'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: 'RAG PDF Chatbot | Intelligent AI Document Assistant',
  description: 'Upload PDF documents and chat with AI in real-time with exact page citations and multi-provider LLM support.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${newsreader.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans bg-[#0c0c0d] text-[#f4f4f5] antialiased selection:bg-[#27272a] selection:text-[#fafafa]">
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}

