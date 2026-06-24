"""Supabase client for database operations.

Uses the service_role key for server-side operations (bypasses RLS).
Falls back gracefully if supabase package is not installed.
"""

import logging
from functools import lru_cache

from app.config import get_settings

logger = logging.getLogger(__name__)

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None
    logger.warning("supabase package not installed — database features disabled. Run: pip install supabase")


@lru_cache
def get_supabase_service():
    """Get Supabase client with service_role key (bypasses RLS)."""
    if not SUPABASE_AVAILABLE:
        return None
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_service_key:
        logger.warning("Supabase not configured — database features disabled")
        return None
    return create_client(settings.supabase_url, settings.supabase_service_key)


@lru_cache
def get_supabase_anon():
    """Get Supabase client with anon key (respects RLS)."""
    if not SUPABASE_AVAILABLE:
        return None
    settings = get_settings()
    if not settings.supabase_url or not settings.supabase_anon_key:
        return None
    return create_client(settings.supabase_url, settings.supabase_anon_key)
