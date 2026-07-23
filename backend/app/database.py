"""
Database Connection Module

Provides thread-safe, cached access to the Supabase client instance using Service Role Key.
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
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        raise ValueError("Supabase URL and Service Role Key must be configured.")

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
