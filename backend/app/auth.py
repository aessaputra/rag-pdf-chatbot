"""
Authentication Module

Verifies Supabase JWT access tokens using JWKS (asymmetric) or HMAC (symmetric) strategies.
Extracts and validates user identity claims into a UserPayload DTO for downstream FastAPI dependencies.
"""

import logging
from functools import lru_cache
from typing import Annotated, Optional

import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.schemas import UserPayload

logger = logging.getLogger(__name__)

security = HTTPBearer()

ASYMMETRIC_PREFIXES = ("RS", "ES", "PS")
HMAC_ALGORITHMS = ["HS256", "HS384", "HS512"]


@lru_cache(maxsize=1)
def get_jwks_client() -> Optional[PyJWKClient]:
    """Returns a cached JWKS client if the JWKS URL is configured."""
    jwks_url = getattr(settings, "SUPABASE_JWKS_URL", None)
    if not jwks_url:
        return None
    try:
        return PyJWKClient(jwks_url)
    except Exception:
        logger.warning("Failed to initialize JWKS client from %s", jwks_url)
        return None


def _is_asymmetric_algorithm(algorithm: str) -> bool:
    """Checks if the JWT algorithm uses asymmetric key signing."""
    return algorithm.startswith(ASYMMETRIC_PREFIXES) or algorithm == "EdDSA"


def _decode_jwt_token(token: str, secret: str, audience: str) -> dict:
    """
    Decodes and verifies a JWT token.

    Uses JWKS for asymmetric algorithms (RS256, ES256, etc.) when a kid header is present.
    Falls back to HMAC symmetric verification with the shared secret.

    Raises:
        jwt.ExpiredSignatureError: Token has expired.
        jwt.PyJWTError: Token is invalid (bad signature, malformed, etc.).
    """
    header = jwt.get_unverified_header(token)
    algorithm = header.get("alg", "HS256")
    kid = header.get("kid")

    jwks_client = get_jwks_client() if kid and _is_asymmetric_algorithm(algorithm) else None

    if jwks_client:
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[algorithm],
            audience=audience,
        )

    return jwt.decode(
        token,
        secret,
        algorithms=HMAC_ALGORITHMS,
        audience=audience,
    )


def _extract_user_payload(payload: dict) -> UserPayload:
    """
    Extracts and validates user identity claims from a decoded JWT payload.

    Raises:
        HTTPException: If the required 'sub' or 'email' claims are missing.
    """
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing required 'sub' claim.",
        )

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token payload is missing required 'email' claim.",
        )

    role = payload.get("role", "authenticated")
    return UserPayload(user_id=user_id, email=email, role=role)


def verify_supabase_token(token: str, secret: Optional[str] = None) -> UserPayload:
    """
    Verifies a Supabase JWT access token and returns the authenticated user payload.

    Args:
        token: Raw JWT access token string.
        secret: Optional override for the HMAC signing secret (used in testing).

    Returns:
        UserPayload DTO with user_id, email, and role.

    Raises:
        HTTPException: 401 if the token is expired, invalid, or missing required claims.
    """
    effective_secret = secret or settings.SUPABASE_JWT_SECRET
    audience = settings.SUPABASE_JWT_AUDIENCE

    try:
        payload = _decode_jwt_token(token, effective_secret, audience)
        return _extract_user_payload(payload)
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired.",
        )
    except (jwt.PyJWTError, ValueError, KeyError) as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token.",
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> UserPayload:
    """FastAPI dependency that extracts and verifies the current user from the Bearer token."""
    return verify_supabase_token(credentials.credentials)


# FastAPI Annotated Dependency Type Alias
CurrentUserDep = Annotated[UserPayload, Depends(get_current_user)]
