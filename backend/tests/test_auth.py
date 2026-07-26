"""
Authentication Middleware Tests

Verifies Supabase JWT token decoding, signature validation, expiration checks,
audience verification, and missing claim error handling.
"""

import time

import jwt
import pytest
from fastapi import HTTPException

from app.auth import verify_supabase_token
from app.schemas import UserPayload

TEST_SECRET = "super-secret-jwt-key-for-unit-testing-32-bytes"
TEST_AUDIENCE = "authenticated"
TEST_USER_ID = "12345678-1234-1234-1234-123456789012"
TEST_EMAIL = "user@example.com"

pytestmark = pytest.mark.asyncio


def create_mock_jwt(
    user_id: str = TEST_USER_ID,
    email: str = TEST_EMAIL,
    expires_in: int = 3600,
    secret: str = TEST_SECRET,
    algorithm: str = "HS256",
    audience: str = TEST_AUDIENCE,
    include_sub: bool = True,
    include_email: bool = True,
) -> str:
    """Helper to generate a valid Supabase-like JWT access token for testing."""
    payload = {
        "role": "authenticated",
        "aud": audience,
        "exp": int(time.time()) + expires_in,
    }
    if include_sub:
        payload["sub"] = user_id
    if include_email:
        payload["email"] = email
    return jwt.encode(payload, secret, algorithm=algorithm)


async def test_verify_valid_supabase_token():
    """Verify that a valid token decodes successfully into a UserPayload DTO."""
    token = create_mock_jwt()
    user: UserPayload = await verify_supabase_token(token, secret=TEST_SECRET)

    assert user.user_id == TEST_USER_ID
    assert user.email == TEST_EMAIL
    assert user.role == "authenticated"


async def test_verify_expired_supabase_token_raises_http_401():
    """Verify that an expired JWT token raises an HTTP 401 Unauthorized exception."""
    expired_token = create_mock_jwt(expires_in=-3600)

    with pytest.raises(HTTPException) as exc_info:
        await verify_supabase_token(expired_token, secret=TEST_SECRET)

    assert exc_info.value.status_code == 401
    assert "expired" in exc_info.value.detail.lower()


async def test_verify_invalid_signature_raises_http_401():
    """Verify that a token with an invalid signature raises HTTP 401 Unauthorized."""
    tampered_token = create_mock_jwt(secret="wrong-secret-key-for-unit-testing-32-bytes")

    with pytest.raises(HTTPException) as exc_info:
        await verify_supabase_token(tampered_token, secret=TEST_SECRET)

    assert exc_info.value.status_code == 401


async def test_verify_missing_sub_claim_raises_http_401():
    """Verify that a token missing the 'sub' (user_id) claim raises HTTP 401 Unauthorized."""
    token = create_mock_jwt(include_sub=False)

    with pytest.raises(HTTPException) as exc_info:
        await verify_supabase_token(token, secret=TEST_SECRET)

    assert exc_info.value.status_code == 401
    assert "sub" in exc_info.value.detail.lower()


async def test_verify_missing_email_claim_raises_http_401():
    """Verify that a token missing the 'email' claim raises HTTP 401 Unauthorized."""
    token = create_mock_jwt(include_email=False)

    with pytest.raises(HTTPException) as exc_info:
        await verify_supabase_token(token, secret=TEST_SECRET)

    assert exc_info.value.status_code == 401
    assert "email" in exc_info.value.detail.lower()


async def test_verify_wrong_audience_raises_http_401():
    """Verify that a token with a mismatched audience claim raises HTTP 401."""
    token = create_mock_jwt(audience="wrong-audience")

    with pytest.raises(HTTPException) as exc_info:
        await verify_supabase_token(token, secret=TEST_SECRET)

    assert exc_info.value.status_code == 401
