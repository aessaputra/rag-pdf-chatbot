"""
Database Connection Module

Provides thread-safe, cached access to the Supabase client instance using modern Secret Key per @supabase/server.
"""

from functools import lru_cache
from supabase import create_client, Client
from app.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Creates and returns a singleton Supabase Client instance.
    Uses lru_cache to prevent redundant connection initializations across requests.
    """
    secret_key = settings.SUPABASE_SECRET_KEY or settings.SUPABASE_SERVICE_ROLE_KEY
    if not settings.SUPABASE_URL or not secret_key:
        raise ValueError("Supabase URL and Secret Key must be configured.")

    return create_client(settings.SUPABASE_URL, secret_key)
