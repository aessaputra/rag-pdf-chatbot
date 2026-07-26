# Spesifikasi Fitur (PRD): RAG Rate Limiting Resiliency

## Problem Statement

Sistem pencernaan data (*ingestion pipeline*) saat ini menggunakan pemecah *chunk* dokumen yang sangat akurat (PyMuPDF4LLM). Namun, karena sistem mengaplikasikan pola *HyDE* (memanggil LLM untuk membuat 5 pertanyaan sintetis per *chunk*), peladen menembakkan ratusan permintaan ke LLM (seperti Google Gemini) secara nyaris serentak tanpa adanya batas kelajuan (*pacing*).

Bagi pengguna yang memanfaatkan kunci API versi gratis (*Free Tier*), lonjakan permintaan seketika ini langsung menabrak batas *Rate Limit* (batas 20 RPM Gemini) yang menyebabkan galat fatal `429 RESOURCE_EXHAUSTED`. Akibatnya, pemrosesan dokumen PDF akan gagal secara internal, tugas *background* mati, dan di mata pengguna dokumen tersebut akan tersangkut dalam status `PROSES` atau `GAGAL`.

## Solution

Sistem harus dirancang ulang agar memiliki pertahanan kokoh (*resiliency*) berlapis terhadap limitasi kuota API pihak ketiga, tanpa menghukum kecepatan memproses bagi pengguna berbayar.
Solusinya adalah menerapkan pola *Exponential Backoff* dinamis pada saat pemanggilan LLM. Sistem akan mencoba memprosesnya secepat mungkin (0 detik jeda statis). Namun jika sistem mendapat penolakan galat `429` (Rate Limit) atau `50x` (Server Timeout) dari API, ia akan secara otomatis menidurkan tugas tersebut secara eksponensial (2 detik, 4 detik, 8 detik, dst) dan mencoba kembali secara cerdas (*Dynamic Backpressure*).

## User Stories

1. Sebagai pengguna API *Free Tier* Gemini, saya ingin mengunggah dokumen PDF puluhan halaman tanpa membuat sistem lumpuh, sehingga dokumen tetap berhasil diproses secara gratis meskipun memakan waktu tunggu lebih lama.
2. Sebagai pengguna API Berbayar (OpenAI/Gemini Tier 1), saya ingin dokumen saya diproses seketika tanpa adanya penundaan waktu tunggu *sleep* buatan, sehingga saya bisa langsung menggunakan asisten obrolan.
3. Sebagai administrator sistem, saya ingin layanan *backend* FastAPI tidak kehabisan memori atau tertahan utasnya (*event loop blocked*) saat sedang berurusan dengan API pihak ketiga yang melambat, sehingga kinerja peladen untuk pengguna lain tetap gegas.
4. Sebagai *developer*, saya ingin sistem secara cerdas bisa membedakan mana galat sementara (seperti API penuh) dengan galat fatal (seperti API Key palsu atau format salah), sehingga sistem langsung menggagalkan (*fail-fast*) pada galat fatal dan menghemat sumber daya.

## Implementation Decisions

- **Modifikasi Layanan Latar Belakang (Background Task)**: Modifikasi akan dilakukan pada berkas `backend/app/services/ingestion_service.py`.
- **Mekanisme Pacing Dinamis**: Menggunakan pustaka *retry* andalan Python, yaitu `tenacity` (yang sudah terpasang). 
- **Tidak Ada *Sleep* Statis**: Tidak akan ada penggunaan `time.sleep()` yang disengaja. Sistem akan murni bergantung pada galat dari API untuk menurunkan lajunya.
- **Keselamatan Konkurensi Berbasis Threadpool**: Memanfaatkan arsitektur standar `FastAPI`, fungsi `process_document` dideklarasikan sebagai fungsi `def` sinkronus (bukan `async`). Dengan demikian, FastAPI melempar eksekusi ke *Threadpool*. Menggunakan `wait_exponential` (jeda tidur panjang akibat galat API) di area ini terjamin sangat aman dan **tidak akan memblokir** utas kejadian (*event loop*) utama web peladen.
- **Pendeteksi Galat Multi-Provider**: Kita akan menangkap galat generik (`Exception`) dari abstraksi LangChain, lalu menginspeksi teks galatnya (apakah mengandung "429", "rate limit", "500", dsb) untuk menentukan apakah galat tersebut boleh dicoba lagi (*retryable*) atau tidak.

## Testing Decisions

Kita akan menguji lapisan pertahanan (*seam*) ini langsung pada berkas pengujian layanan: `tests/test_ingestion.py`.

- Pengujian hanya akan difokuskan pada pengujian perilaku batas-luar (*external behavior*), bukan detail implementasinya.
- **Skenario 1**: Kita akan membuat *Mock* untuk `llm.invoke` yang melempar galat tiruan `Exception("429 Too Many Requests")`. Layanan harus tidak langsung gagal (di-*retry*) hingga batas maksimal upaya (*stop_after_attempt*) tercapai.
- **Skenario 2**: Kita akan melempar galat fatal tiruan `Exception("401 Unauthorized")`. Layanan harus seketika itu juga menjatuhkan proses (*fail-fast*), yang menunjukkan deteksi klasifikasi galat berfungsi normal.

## Out of Scope

- Membangun antrean pesan berat berskala industri (seperti Celery/Redis). Mengandalkan penundaan latar belakang FastAPI + Tenacity sudah lebih dari cukup dan teruji stabil untuk layanan berbasis *single-node*.
- Menampilkan waktu perkiraan (*ETA*) penyelesaian ekstraksi dokumen kepada klien web (di luar batasan tiket ini).

## Further Notes

- **Konfigurasi Retries**: Parameter `tenacity` diatur menggunakan fungsi `wait_exponential(multiplier=1, min=4, max=60)` dan `stop_after_attempt(5)`. Total maksimal penundaan jika Google sedang benar-benar padat adalah 5 upaya dengan total maksimal istirahat 1 hingga 2 menit per *chunk* dokumen.
