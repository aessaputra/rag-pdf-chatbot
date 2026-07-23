import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="id" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))] pointer-events-none z-0" />
        <main className="relative z-10">{children}</main>
      </body>
    </html>
  );
}
