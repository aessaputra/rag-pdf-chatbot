# 🎟️ RAG PDF Chatbot Project Tickets

Dokumen ini berisi daftar tiket tugas (*work tickets*) yang diturunkan dari `docs/PRD.md` untuk mengacak dan melacak status eksekusi secara terstruktur.

---

### [TICKET-01] Supabase Database Migration & Backend Core Setup
- **Status**: ✅ COMPLETED
- **Target Files**:
  - `docs/supabase_schema.sql`
  - `docs/specs/ticket-01-spec.md`
  - `backend/requirements.txt`
  - `backend/.env.example`
  - `backend/app/config.py`
  - `backend/app/database.py`
  - `backend/tests/test_config.py`
- **Description**: Menyiapkan skema SQL Supabase (`pgvector` & RLS), membuat file konfigurasi pydantic backend, dan menuliskan test verifikasi konfigurasi.
- **Dependencies**: None

---

### [TICKET-02] Supabase JWT Authentication Middleware in FastAPI
- **Status**: ✅ COMPLETED
- **Target Files**:
  - `backend/app/schemas.py`
  - `backend/app/auth.py`
  - `backend/tests/test_auth.py`
- **Description**: Menyiapkan middleware JWT Supabase untuk memverifikasi token Bearer pada HTTP header dan mengisolasi `user_id` di FastAPI.
- **Dependencies**: TICKET-01

---

### [TICKET-03] PDF Document Ingestion & Supabase Vector Store Service
- **Status**: ✅ COMPLETED
- **Target Files**:
  - `backend/app/schemas.py`
  - `backend/app/services/llm_factory.py`
  - `backend/app/services/ingestion_service.py`
  - `backend/tests/test_ingestion.py`
- **Description**: Membangun parser PDF, text chunker (`RecursiveCharacterTextSplitter`), dan pengunggah embeddings ke Supabase vector table.
- **Dependencies**: TICKET-01, TICKET-02

---

### [TICKET-04] Multi-Provider LLM Factory & RAG Streaming Engine
- **Status**: ✅ COMPLETED
- **Target Files**:
  - `backend/app/services/llm_factory.py`
  - `backend/app/services/rag_service.py`
  - `backend/tests/test_rag.py`
- **Description**: Mengimplementasikan LLM Factory (Gemini, OpenAI, Ollama) dan RAG Engine dengan keluaran Server-Sent Events (SSE) streaming dan sitasi dokumen.
- **Dependencies**: TICKET-03

---

### [TICKET-05] FastAPI Main Endpoints & Router Integration
- **Status**: ✅ COMPLETED
- **Target Files**:
  - `backend/app/schemas.py`
  - `backend/app/routers/document_router.py`
  - `backend/app/routers/chat_router.py`
  - `backend/app/main.py`
  - `backend/tests/test_routers.py`
- **Description**: Menyusun endpoint REST API untuk unggah/hapus dokumen dan endpoint streaming RAG SSE.
- **Dependencies**: TICKET-02, TICKET-03, TICKET-04

---

### [TICKET-06] Frontend Next.js 15 Setup & Supabase Auth Client
- **Status**: ⏳ TODO
- **Target Files**:
  - `frontend/package.json`
  - `frontend/src/lib/supabaseClient.ts`
  - `frontend/src/app/login/page.tsx`
- **Description**: Menginisialisasi Next.js 15, Tailwind CSS v4, `@supabase/ssr`, dan membuat halaman Login/Register.
- **Dependencies**: TICKET-01

---

### [TICKET-07] Premium Next.js UI Chat Interface & Citation Panel
- **Status**: ⏳ TODO
- **Target Files**:
  - `frontend/src/lib/api.ts`
  - `frontend/src/components/Sidebar.tsx`
  - `frontend/src/components/DocumentManager.tsx`
  - `frontend/src/components/ChatWindow.tsx`
  - `frontend/src/components/CitationPanel.tsx`
  - `frontend/src/app/dashboard/page.tsx`
- **Description**: Membangun antarmuka obrolan realtime, pengunggah PDF drag-and-drop, dan panel penampil sitasi nomor halaman PDF.
- **Dependencies**: TICKET-05, TICKET-06

---

### [TICKET-08] Docker Integration & Full Stack Verification
- **Status**: ⏳ TODO
- **Target Files**:
  - `docker-compose.yml`
  - `backend/Dockerfile`
  - `README.md`
- **Description**: Menyiapkan file Docker Compose untuk kemudahan run secara terintegrasi dan memverifikasi seluruh alur RAG PDF Chatbot.
- **Dependencies**: TICKET-05, TICKET-07
