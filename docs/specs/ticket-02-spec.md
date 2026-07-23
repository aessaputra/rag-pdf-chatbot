# Ticket-02 Specification: Supabase JWT Authentication Middleware in FastAPI

> **Reference Ticket:** [TICKET-02] (from `docs/TICKETS.md`)  
> **Applied Skills:** `supabase`, `supabase-postgres-best-practices`, `clean-code`  
> **Status:** Specification Complete (Ready for Implementation)  

---

## Problem Statement

Sebagai pengembang sistem RAG, kita memerlukan lapisan pengamanan (middleware dependency) di FastAPI yang mampu memverifikasi token JWT buatan Supabase Auth pada setiap *HTTP Request*.

Tanpa otentikasi JWT yang ketat di backend, pengguna tanpa otorisasi atau pihak tak dikenal dapat mengakses endpoint RAG, mengunggah file PDF secara ilegal, atau membaca data pengguna lain (*BOLA / IDOR Vulnerability*).

---

## Solution

Mengimplementasikan modul otentikasi `backend/app/auth.py` dan `UserPayload` DTO:
1. Membaca header HTTP `Authorization: Bearer <access_token>` menggunakan FastAPI `HTTPBearer`.
2. Dekode dan verifikasi tanda tangan JWT Supabase menggunakan algoritma `HS256` dan `SUPABASE_JWT_SECRET`.
3. Memastikan pemisahan klaim otorisasi aman (menggunakan klaim `sub` sebagai `user_id` dan `role`, serta mengabaikan `user_metadata` yang dapat diubah oleh pengguna sesuai *Supabase Security Checklist*).
4. Menyediakan FastAPI Dependency `get_current_user` yang mengembalikan objek `UserPayload` tervalidasi.
5. Menyediakan pengujian unit komprehensif di `backend/tests/test_auth.py` untuk menguji token valid, token kedaluwarsa, token palsu, dan header tidak lengkap.

---

## User Stories

1. As an authenticated user, I want my HTTP requests to FastAPI to be verified via my Supabase JWT token, so that I can securely upload PDFs and chat with my own data.
2. As a security auditor, I want invalid, tampered, or expired JWT tokens to be rejected immediately with HTTP 401 Unauthorized, so that unauthenticated access is strictly blocked.
3. As a backend developer, I want a reusable FastAPI dependency `get_current_user`, so that any protected router endpoint can retrieve the validated `user_id` seamlessly.

---

## Implementation Decisions

### 1. Security & Supabase Auth Best Practices

- **Token Decoding & Verification**: Use `pyjwt.decode(token, key, algorithms=["HS256"])` with `SUPABASE_JWT_SECRET`.
- **JWT Claim Trust Boundaries**:
  - `sub`: Trusted Supabase User UUID (`user_id`).
  - `email`: User email address.
  - `role`: Postgres auth role (e.g. `authenticated`).
  - **Security Rule**: Ignore `raw_user_meta_data` for authorization decisions as it is user-editable on Supabase client-side.
- **HTTP 401 Unauthorized Standard**: Return proper `WWW-Authenticate: Bearer` header on authentication failure.

### 2. Module Boundaries & Signatures

#### `backend/app/schemas.py`
```python
from pydantic import BaseModel, EmailStr

class UserPayload(BaseModel):
    """Authenticated user context payload extracted from Supabase JWT."""
    user_id: str
    email: EmailStr
    role: str = "authenticated"
```

#### `backend/app/auth.py`
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from pydantic import ValidationError
from app.config import settings
from app.schemas import UserPayload

security_bearer = HTTPBearer(auto_error=True)

def verify_supabase_token(token: str, secret: str = settings.SUPABASE_JWT_SECRET) -> UserPayload:
    """
    Decodes and validates a Supabase JWT access token.
    Raises HTTPException(401) if token is invalid, expired, or malformed.
    """
    ...

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)) -> UserPayload:
    """
    FastAPI dependency for injecting authenticated user context into router endpoints.
    """
    return verify_supabase_token(credentials.credentials)
```

---

## Testing Decisions

- **Tested Seam**: `verify_supabase_token` function & `get_current_user` FastAPI dependency.
- **Good Test Criteria**:
  - Test 1: Valid JWT token returns correct `UserPayload` with expected `user_id` and `email`.
  - Test 2: Expired JWT token raises HTTP 401 Unauthorized.
  - Test 3: Malformed / tampered JWT token signature raises HTTP 401 Unauthorized.
  - Test 4: Missing `sub` claim raises HTTP 401 Unauthorized.
- **Test Command**: `pytest backend/tests/test_auth.py -v`

---

## Out of Scope

- Direct communication with Supabase Auth HTTP Admin API (verification is performed staticaly/offline via JWT secret for max performance).
- Handling OAuth refresh token exchange (managed on Next.js frontend via `@supabase/ssr`).

---

## Further Notes

Verifikasi JWT lokal di FastAPI berbasis `SUPABASE_JWT_SECRET` mengeliminasi *latency round-trip* HTTP ke Supabase server pada setiap API call, menjaga kecepatan respon RAG tetap di bawah beberapa milidetik.
