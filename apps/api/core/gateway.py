"""
apps/api/core/gateway.py
Canonical entrypoint re-export for TARS (Item 73).
The sole authoritative FastAPI application instance is apps/api/main:app.
This module preserves backward compatibility for existing callers.
"""
from apps.api.main import app

__all__ = ["app"]

