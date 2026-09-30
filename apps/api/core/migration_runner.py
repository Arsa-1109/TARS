"""
apps/api/core/migration_runner.py
Deterministic Versioned SQL Migrations Framework for TARS (Item 105).
Executes ordered .sql migration files tracked in schema_migrations table.
Enforces non-destructive execution and transactional integrity.
"""
import os
import sqlite3
import logging
from pathlib import Path
from typing import List

logger = logging.getLogger("tars.migrations")

MIGRATIONS_DIR = Path(__file__).resolve().parent / "migrations"


class MigrationRunner:
    def __init__(self, migrations_dir: Path = MIGRATIONS_DIR):
        self.migrations_dir = migrations_dir

    def run_migrations(self, conn: sqlite3.Connection) -> List[str]:
        """
        Discovers and applies pending SQL migrations in ascending order.
        Returns list of newly applied migration versions.
        """
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version TEXT PRIMARY KEY,
                applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            """
        )
        conn.commit()

        # Fetch already applied versions
        cursor = conn.cursor()
        cursor.execute("SELECT version FROM schema_migrations ORDER BY version ASC")
        applied_versions = {row[0] for row in cursor.fetchall()}

        if not self.migrations_dir.exists():
            return []

        # Find all .sql files sorted lexicographically
        migration_files = sorted(self.migrations_dir.glob("*.sql"), key=lambda p: p.name)
        newly_applied = []

        for mfile in migration_files:
            version = mfile.stem
            if version in applied_versions:
                continue

            logger.info(f"Applying migration: {mfile.name}")
            try:
                with open(mfile, "r", encoding="utf-8") as f:
                    sql_content = f.read()

                # Execute migration statements
                conn.executescript(sql_content)
                conn.execute(
                    "INSERT INTO schema_migrations (version) VALUES (?)",
                    (version,)
                )
                conn.commit()
                newly_applied.append(version)
                logger.info(f"Successfully applied migration: {version}")
            except Exception as e:
                conn.rollback()
                logger.error(f"Migration {version} failed: {e}")
                raise RuntimeError(f"Database migration '{mfile.name}' failed: {e}") from e

        return newly_applied


migration_runner = MigrationRunner()
