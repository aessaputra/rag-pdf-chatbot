from typing import Annotated, Optional
import jwt
from jwt import PyJWKClient
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import settings
from app.schemas import UserPayload

security = HTTPBearer()

_jwks_client: Optional[PyJWKClient] = None

def get_jwks_client() -> Optional[PyJWKClient]:
    global _jwks_client
    if _jwks_client is None and getattr(settings, "SUPABASE_JWKS_URL", None):
        try:
            _jwks_client = PyJWKClient(settings.SUPABASE_JWKS_URL)
        except Exception:
            _jwks_client = None
    return _jwks_client


def _is_asymmetric_algorithm(alg: str) -> bool:
    return alg.startswith("RS") or alg.startswith("ES") or alg.startswith("PS") or alg == "EdDSA"


def verify_supabase_token(token: str, secret: Optional[str] = None) -> UserPayload:
    if secret is None:
        secret = getattr(settings, "SUPABASE_JWT_SECRET", None) or getattr(settings, "SUPABASE_SECRET_KEY", None)

    try:
        header = jwt.get_unverified_header(token)
        alg = header.get("alg", "HS256")
        kid = header.get("kid")

        # Use JWKS for any asymmetric algorithm (RS256, ES256, PS256, EdDSA)
        jwks_client = get_jwks_client() if kid and _is_asymmetric_algorithm(alg) else None

        if jwks_client:
            signing_key = jwks_client.get_signing_key_from_jwt(token)
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=[alg],
                options={"verify_aud": False}
            )
        else:
            # HMAC symmetric fallback — only allow HS* algorithms with a shared secret
            hmac_algorithms = ["HS256", "HS384", "HS512"]
            payload = jwt.decode(
                token,
                secret,
                algorithms=hmac_algorithms,
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
    except (jwt.PyJWTError, ValueError, KeyError) as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired authentication token: {str(e)}"
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> UserPayload:
    return verify_supabase_token(credentials.credentials)


# FastAPI Annotated Dependency Type Alias per skill guidelines
CurrentUserDep = Annotated[UserPayload, Depends(get_current_user)]
