"""
Supabase Authentication Module

Verifies incoming Bearer access tokens sent by Next.js frontend via PyJWT.
Supports modern Supabase JWKS (JSON Web Key Set) endpoint URL validation and fallback HMAC secret verification.
"""

from typing import Optional
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.schemas import UserPayload

security = HTTPBearer()

# Cache PyJWKClient for modern Supabase JWKS endpoint
_jwks_client: Optional[PyJWKClient] = None

def get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and getattr(settings, "SUPABASE_JWKS_URL", None):
        try:
            _jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL)
        except Exception:
            _jwks_client = None
    return _jwks_client


def verify_supabase_token(token: str, secret: Optional[str] = None) -> UserPayload:
    """
    Verifies a Supabase JWT access token.
    Uses modern JWKS endpoint if token has 'kid' header and SUPABASE_JWKS_URL is provided,
    otherwise falls back to HMAC secret decoding.
    """
    if secret is None:
        secret = getattr(settings, "SUPABASE_JWT_SECRET", None) or getattr(settings, "SUPABASE_SECRET_KEY", None)

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        kid = header.get("kid")

        jwks_client = get_jwks_client() if kid and alg.startswith("RS") else None

        if jwks_client:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=["RS256", "ES256", "HS256"],
                options={"verify_aud": False}
            )
        else:
            payload = jwt.decode(
                token,
                secret,
                algorithms=["HS256", "RS256"],
                options={"verify_aud": False}
            )

        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "authenticated")

        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token payload is missing 'sub' claim."
            )

        return UserPayload(
            user_id=user_id,
            email=email or "user@supabase.local",
            role=role
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token."
        )
    except jwt.PyJWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}"
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserPayload:
    """FastAPI Dependency for protected endpoints."""
    return verify_supabase_token(credentials.credentials)
