"""
Database Connection Module

Provides cached access to the async Supabase admin client instance.
The admin client uses the service role key and bypasses RLS — use only for
server-side operations that intentionally require elevated privileges.
"""

import asyncio
import inspect
from collections.abc import Callable
from typing import Any

from asyncer import asyncify
from supabase import AsyncClient, create_async_client

from app.config import settings

_async_supabase_client: AsyncClient | None = None
_async_client_lock = asyncio.Lock()


async def get_supabase_client() -> AsyncClient:
    """
    Creates and returns a singleton async Supabase admin client.

    WARNING: This client uses the service role key and bypasses Row Level Security.
    All user-scoped queries MUST include explicit `.eq("user_id", ...)` filters
    to prevent cross-tenant data access.
    """
    global _async_supabase_client

    if not settings.SUPABASE_URL or not settings.SUPABASE_SECRET_KEY:
        raise ValueError("SUPABASE_URL and SUPABASE_SECRET_KEY must be configured.")

    if _async_supabase_client is None:
        async with _async_client_lock:
            if _async_supabase_client is None:
                _async_supabase_client = await create_async_client(
                    settings.SUPABASE_URL,
                    settings.SUPABASE_SECRET_KEY,
                )

    return _async_supabase_client


async def maybe_await(result: Any) -> Any:
    if inspect.isawaitable(result):
        return await result
    return result


async def maybe_await_call(func: Callable[..., Any], *args: Any, **kwargs: Any) -> Any:
    return await maybe_await(await asyncify(func)(*args, **kwargs))


async def execute_query(builder: Any) -> Any:
    return await maybe_await_call(builder.execute)
