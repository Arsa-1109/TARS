# apps/api/ingestion/action_hub.py
"""
Track 3: Unified Action Hub Persistence Layer
SQLite storage and CRUD service for ActionItemDTO objects.
Thread-safe, parameterized queries preventing SQL injection.
"""
import os
import sqlite3
import time
import uuid
from typing import List, Optional, Dict, Any
from apps.api.schemas.contracts import ActionItemDTO

# Default local database file path
DB_DIR = os.path.join(os.getcwd(), ".tars")
DEFAULT_DB_PATH = os.path.join(DB_DIR, "action_hub.sqlite3")


class ActionHubRepository:
    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        self._ensure_tables()

    def _get_connection(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        conn = sqlite3.connect(self.db_path, timeout=10.0)
        conn.row_factory = sqlite3.Row
        return conn

    def _ensure_tables(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS action_items (
                    id TEXT PRIMARY KEY,
                    description TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    deadline INTEGER,
                    status TEXT NOT NULL DEFAULT 'OPEN',
                    source_type TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    source_offset TEXT NOT NULL,
                    created_at INTEGER NOT NULL
                );
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_status ON action_items(status);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_owner ON action_items(owner);"
            )
            conn.commit()

    def create(self, item: ActionItemDTO) -> ActionItemDTO:
        item_id = item.id if item.id else f"ACT-{uuid.uuid4().hex[:8].upper()}"
        now = int(time.time())
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO action_items (
                    id, description, owner, deadline, status,
                    source_type, source_id, source_offset, created_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item_id,
                    item.description,
                    item.owner,
                    item.deadline,
                    item.status or "OPEN",
                    item.source_type,
                    item.source_id,
                    item.source_offset,
                    now,
                ),
            )
            conn.commit()
        return ActionItemDTO(
            id=item_id,
            description=item.description,
            owner=item.owner,
            deadline=item.deadline,
            status=item.status or "OPEN",
            source_type=item.source_type,
            source_id=item.source_id,
            source_offset=item.source_offset,
        )

    def get_by_id(self, item_id: str) -> Optional[ActionItemDTO]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM action_items WHERE id = ?", (item_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return ActionItemDTO(
                id=row["id"],
                description=row["description"],
                owner=row["owner"],
                deadline=row["deadline"],
                status=row["status"],
                source_type=row["source_type"],
                source_id=row["source_id"],
                source_offset=row["source_offset"],
            )

    def list_items(
        self,
        status: Optional[str] = None,
        owner: Optional[str] = None,
        source_type: Optional[str] = None,
    ) -> List[ActionItemDTO]:
        query = "SELECT * FROM action_items WHERE 1=1"
        params: List[Any] = []

        if status:
            query += " AND status = ?"
            params.append(status.upper())
        if owner:
            query += " AND owner = ?"
            params.append(owner)
        if source_type:
            query += " AND source_type = ?"
            params.append(source_type.upper())

        query += " ORDER BY created_at DESC"

        with self._get_connection() as conn:
            cursor = conn.execute(query, params)
            rows = cursor.fetchall()
            return [
                ActionItemDTO(
                    id=row["id"],
                    description=row["description"],
                    owner=row["owner"],
                    deadline=row["deadline"],
                    status=row["status"],
                    source_type=row["source_type"],
                    source_id=row["source_id"],
                    source_offset=row["source_offset"],
                )
                for row in rows
            ]

    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[ActionItemDTO]:
        allowed_fields = {
            "description",
            "owner",
            "deadline",
            "status",
            "source_type",
            "source_id",
            "source_offset",
        }
        filtered_updates = {
            k: v for k, v in updates.items() if k in allowed_fields and v is not None
        }

        if not filtered_updates:
            return self.get_by_id(item_id)

        set_clause = ", ".join(f"{k} = ?" for k in filtered_updates.keys())
        params = list(filtered_updates.values())
        params.append(item_id)

        with self._get_connection() as conn:
            cursor = conn.execute(
                f"UPDATE action_items SET {set_clause} WHERE id = ?", params
            )
            conn.commit()
            if cursor.rowcount == 0:
                return None

        return self.get_by_id(item_id)

    def delete(self, item_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "DELETE FROM action_items WHERE id = ?", (item_id,)
            )
            conn.commit()
            return cursor.rowcount > 0

    def clear(self) -> None:
        with self._get_connection() as conn:
            conn.execute("DELETE FROM action_items")
            conn.commit()


# Singleton repository instance
action_hub_repo = ActionHubRepository()
