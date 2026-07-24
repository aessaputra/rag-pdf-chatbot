"""
Database Connection Module

Provides thread-safe, cached access to the Supabase admin client instance.
The admin client uses the service role key and bypasses RLS — use only for
server-side operations that intentionally require elevated privileges.
"""

from functools import lru_cache
from supabase import create_client, Client
from app.config import settings


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """
    Creates and returns a singleton Supabase admin client.

    WARNING: This client uses the service role key and bypasses Row Level Security.
    All user-scoped queries MUST include explicit `.eq("user_id", ...)` filters
    to prevent cross-tenant data access.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured.")

    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
