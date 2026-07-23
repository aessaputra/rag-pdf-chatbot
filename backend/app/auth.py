"""
Authentication Middleware Module

Provides Supabase JWT token verification and FastAPI HTTPBearer dependency for endpoint security.
"""

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import ValidationError

from app.config import settings
from app.schemas import UserPayload

security_bearer = HTTPBearer(auto_error=True)


def verify_supabase_token(token: str, secret: str = settings.SUPABASE_JWT_SECRET) -> UserPayload:
    """
    Decodes and validates a Supabase JWT access token.

    Args:
        token (str): Raw JWT access token string from Authorization header.
        secret (str): JWT secret key used to verify HMAC signature.

    Returns:
        UserPayload: Authenticated user DTO containing user_id and email.

    Raises:
        HTTPException: HTTP 401 Unauthorized if token is invalid, expired, or missing claims.
    """
    try:
        payload = jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            options={"verify_aud": False}
        )
        
        user_id = payload.get("sub")
        email = payload.get("email")
        role = payload.get("role", "authenticated")

        if not user_id or not email:
            raise ValueError("JWT token is missing required 'sub' or 'email' claims.")

        return UserPayload(user_id=user_id, email=email, role=role)

    except (jwt.PyJWTError, ValidationError, ValueError) as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(err)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_bearer)
) -> UserPayload:
    """
    FastAPI dependency for injecting validated user context into protected router endpoints.

    Usage:
        @router.get("/protected")
        def protected_route(user: UserPayload = Depends(get_current_user)):
            return {"user_id": user.user_id}
    """
    return verify_supabase_token(credentials.credentials)
