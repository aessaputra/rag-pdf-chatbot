# Chat Context & Component Refactoring Spec

## Problem Statement

Aplikasi saat ini memiliki sebuah "God Context" (`ChatContext.tsx`) yang mengelola tiga domain state yang berbeda secara bersamaan: Otentikasi (User/Token), Manajemen Dokumen (List, Upload, Status), dan Percakapan (Sessions, Messages, Streaming). 

Kondisi ini menyebabkan **bottleneck performa yang parah**. Karena pesan AI di-*stream* menggunakan *Server-Sent Events* (SSE), *array* `messages` diperbarui berulang kali dalam satu detik. Karena `ChatContext` diakses oleh hampir seluruh komponen (seperti `Sidebar` dan `CitationPanel`), pembaruan token ini memicu *re-render* massal pada komponen yang sebenarnya tidak membutuhkan data `messages`. Selain itu, komponen `DocumentManagerModal` saat ini bersifat monolitik (hampir 340 baris), melanggar *Clean Code* (Single Responsibility Principle) dan *Vercel Composition Patterns*.

## Solution

Memecah (decouple) *state* global menjadi beberapa *Context* yang spesifik berdasarkan domain frekuensi perubahannya. Memisahkan komponen statis dari komponen dinamis, dan merombak `DocumentManagerModal` menjadi serangkaian komponen terkomposisi yang lebih kecil. Ini akan mengisolasi siklus *re-render* hanya pada komponen yang relevan (seperti `ChatWindowMessages`), sehingga aplikasi tetap ringan dan responsif meskipun AI sedang melakukan *streaming* teks yang panjang.

## User Stories

1. As a user, I want the chat interface to remain buttery smooth and responsive while the AI is streaming long responses, so that I don't experience browser lag or jank.
2. As a user, I want the sidebar and document manager to open instantly without stuttering, even if the AI is currently generating a response in the background.
3. As a developer, I want the application contexts to be strictly separated by domain (App/Auth, Documents, Chat), so that I can easily reason about state changes and prevent accidental global re-renders.
4. As a developer, I want the `DocumentManagerModal` to be broken down into composable parts (`Dropzone`, `List`, `Row`), so that it is easier to read, maintain, and write unit tests for.

## Implementation Decisions

- **Modul yang akan dibangun/dimodifikasi:**
  - `AppContext`: Akan menampung state otentikasi (User, Token) dan Provider Config. (Jarang berubah).
  - `DocumentContext`: Akan menampung array `documents`, fungsi upload/hapus, dan status buka/tutup modal. (Sesekali berubah).
  - `ChatContext`: Akan difokuskan HANYA untuk state percakapan (`sessions`, `messages`, `isStreaming`, fungsi `handleSendMessage`). (Sangat sering berubah).
- **Arsitektur:**
  - `AppProvider` akan membungkus `DocumentProvider`, yang selanjutnya akan membungkus `ChatProvider` di dalam `(main)/page.tsx` atau `layout.tsx`.
  - `Sidebar` hanya akan berlangganan pada `DocumentContext` dan `ChatContext` (hanya untuk `sessions`, bukan `messages`).
- **Komponen UI:**
  - Memecah `DocumentManagerModal` menggunakan pendekatan *Composition*. Bagian unggah akan diekstrak menjadi `DocumentDropzone`. Bagian daftar akan diekstrak menjadi `DocumentList` dan `DocumentItemRow`.

## Testing Decisions

- **Kriteria Test yang Baik:** Pengujian tidak boleh bergantung pada implementasi internal *Context*, melainkan pada perilaku eksternal: Saat AI me-*return* token baru secara *streaming*, komponen `Sidebar` TIDAK BOLEH mengalami re-render.
- **Prior Art:** Pengujian manual melalui React DevTools Profiler harus dihidupkan untuk memvalidasi *highlight* hijau pada komponen saat pesan di-*stream*.
- **Integrasi Komponen:** Modal Dokumen harus diuji coba untuk memastikan *drag-and-drop* file PDF masih memicu unggahan ke *Supabase Storage* dengan benar setelah ekstraksi komponen.

## Out of Scope

- Memodifikasi skema *database* atau endpoint API *backend*.
- Menambahkan fitur baru ke dalam *chatbot* (seperti ekspor PDF atau *voice input*). Semua fitur tetap sama persis, hanya arsitekturnya yang diubah (Refactoring murni).

## Further Notes

- Sesuai dengan panduan `/vercel-react-best-practices` (`state-decouple-implementation` dan `rerender-defer-reads`), isolasi *state* ini adalah kunci utama optimasi aplikasi React/Next.js modern.
