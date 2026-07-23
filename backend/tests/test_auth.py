"""
Authentication Middleware Tests

Verifies Supabase JWT token decoding, signature validation, expiration checks, and error handling.
"""

import time
import jwt
import pytest
from fastapi import HTTPException
from app.auth import verify_supabase_token
from app.schemas import UserPayload

TEST_SECRET = "super-secret-jwt-key-for-unit-testing-32-bytes"
TEST_USER_ID = "12345678-1234-1234-1234-123456789012"
TEST_EMAIL = "user@example.com"


def create_mock_jwt(
    user_id: str = TEST_USER_ID,
    email: str = TEST_EMAIL,
    expires_in: int = 3600,
    secret: str = TEST_SECRET,
    algorithm: str = "HS256"
) -> str:
    """Helper to generate a valid Supabase-like JWT access token for testing."""
    payload = {
        "sub": user_id,
        "email": email,
        "role": "authenticated",
        "aud": "authenticated",
        "exp": int(time.time()) + expires_in
    }
    return jwt.encode(payload, secret, algorithm=algorithm)


def test_verify_valid_supabase_token():
    """Verify that a valid token decodes successfully into a UserPayload DTO."""
    token = create_mock_jwt()
    user: UserPayload = verify_supabase_token(token, secret=TEST_SECRET)
    
    assert user.user_id == TEST_USER_ID
    assert user.email == TEST_EMAIL
    assert user.role == "authenticated"


def test_verify_expired_supabase_token_raises_http_401():
    """Verify that an expired JWT token raises an HTTP 401 Unauthorized exception."""
    expired_token = create_mock_jwt(expires_in=-3600)
    
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token(expired_token, secret=TEST_SECRET)
        
    assert exc_info.value.status_code == 401
    assert "Invalid or expired authentication token" in exc_info.value.detail


def test_verify_invalid_signature_raises_http_401():
    """Verify that a token with an invalid signature raises HTTP 401 Unauthorized."""
    tampered_token = create_mock_jwt(secret="wrong-secret-key")
    
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token(tampered_token, secret=TEST_SECRET)
        
    assert exc_info.value.status_code == 401


def test_verify_missing_sub_claim_raises_http_401():
    """Verify that a token missing the 'sub' (user_id) claim raises HTTP 401 Unauthorized."""
    payload = {"email": TEST_EMAIL, "role": "authenticated", "exp": int(time.time()) + 3600}
    token = jwt.encode(payload, TEST_SECRET, algorithm="HS256")
    
    with pytest.raises(HTTPException) as exc_info:
        verify_supabase_token(token, secret=TEST_SECRET)
        
    assert exc_info.value.status_code == 401
