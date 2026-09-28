# apps/api/core/action_hub.py
"""
Track 1 & Track 3 Consolidated Action Hub Repository.
Provides unified SQLite persistence connected to the canonical .tars/action_hub.sqlite3 database.
Re-routes to the thread-safe connection pool from apps.api.ingestion.action_hub to prevent database split-brain.
"""
from apps.api.ingestion.action_hub import (
    ActionHubRepository,
    action_hub_repo,
    DEFAULT_DB_PATH,
)

__all__ = ["ActionHubRepository", "action_hub_repo", "DEFAULT_DB_PATH"]
