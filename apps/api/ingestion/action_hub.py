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

# Canonical local database file path
# Canonical local database file path: defaults to primary tars_local.db (Item 92)
DB_DIR = os.getenv(
    "TARS_DATA_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".tars")),
)
DEFAULT_DB_PATH = os.getenv(
    "TARS_ACTION_HUB_DB",
    os.getenv("TARS_DB_PATH", os.path.abspath(os.path.join(os.getcwd(), "tars_local.db"))),
)



class ActionHubRepository:
    VALID_TRANSITIONS: Dict[str, set] = {
        "DETECTED": {"PROPOSED", "REVIEW_REQUIRED", "REJECTED", "OPEN"},
        "PROPOSED": {"REVIEW_REQUIRED", "APPROVED", "REJECTED", "OPEN"},
        "REVIEW_REQUIRED": {"APPROVED", "REJECTED", "PROPOSED", "OPEN"},
        "APPROVED": {"EXECUTING", "REJECTED", "FAILED", "COMPLETED", "OPEN"},
        "EXECUTING": {"COMPLETED", "FAILED", "OPEN"},
        "COMPLETED": {"REVIEW_REQUIRED", "OPEN"},
        "FAILED": {"PROPOSED", "REVIEW_REQUIRED", "EXECUTING", "OPEN"},
        "REJECTED": {"REVIEW_REQUIRED", "PROPOSED", "OPEN"},
        "OPEN": {"DETECTED", "PROPOSED", "REVIEW_REQUIRED", "APPROVED", "EXECUTING", "COMPLETED", "FAILED", "REJECTED", "IN_PROGRESS", "DONE", "PENDING"},
        "IN_PROGRESS": {"DONE", "COMPLETED", "FAILED", "OPEN", "REVIEW_REQUIRED"},
        "DONE": {"OPEN", "REVIEW_REQUIRED"},
        "PENDING": {"APPROVED", "REJECTED", "OPEN", "IN_PROGRESS", "REVIEW_REQUIRED"},
    }

    def validate_transition(self, current_status: str, new_status: str) -> None:
        cur = (current_status or "OPEN").upper().strip()
        nxt = (new_status or "OPEN").upper().strip()
        if cur == nxt:
            return
        # OPEN -> any state
        if cur == "OPEN":
            return
        allowed = self.VALID_TRANSITIONS.get(cur, set())
        if nxt not in allowed:
            raise ValueError(f"Illegal status transition from {cur} to {nxt}")

    def __init__(self, db_path: str = DEFAULT_DB_PATH):
        self.db_path = db_path
        self._ensure_tables()

    def _get_connection(self) -> sqlite3.Connection:
        os.makedirs(os.path.dirname(os.path.abspath(self.db_path)), exist_ok=True)
        conn = sqlite3.connect(self.db_path, timeout=15.0)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA journal_mode=WAL;")
        conn.execute("PRAGMA busy_timeout = 5000;")
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _ensure_tables(self) -> None:
        with self._get_connection() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS action_items (
                    id TEXT PRIMARY KEY,
                    title TEXT,
                    description TEXT NOT NULL,
                    owner TEXT NOT NULL,
                    assignee TEXT,
                    department TEXT DEFAULT 'General',
                    priority TEXT DEFAULT 'MEDIUM',
                    deadline INTEGER,
                    status TEXT NOT NULL DEFAULT 'OPEN',
                    source_type TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    source_offset TEXT NOT NULL,
                    created_at INTEGER NOT NULL,
                    expires_at INTEGER,
                    policy_version TEXT,
                    approval_scope TEXT,
                    is_demo INTEGER DEFAULT 0,
                    organisation_id TEXT DEFAULT 'CMP-GENESIS-01'
                );
                """
            )
            # Schema parity migrations for newly added DTO columns (Item 90)
            cursor = conn.execute("PRAGMA table_info(action_items);")
            cols = {row["name"] for row in cursor.fetchall()}
            for col_name, col_type in [
                ("title", "TEXT"),
                ("assignee", "TEXT"),
                ("department", "TEXT DEFAULT 'General'"),
                ("priority", "TEXT DEFAULT 'MEDIUM'"),
                ("expires_at", "INTEGER"),
                ("policy_version", "TEXT"),
                ("approval_scope", "TEXT"),
                ("is_demo", "INTEGER DEFAULT 0"),
                ("organisation_id", "TEXT DEFAULT 'CMP-GENESIS-01'"),
            ]:
                if col_name not in cols:
                    try:
                        conn.execute(f"ALTER TABLE action_items ADD COLUMN {col_name} {col_type};")
                    except Exception:
                        pass

            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_status ON action_items(status);"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_owner ON action_items(owner);"
            )
            conn.commit()

    def create(self, item: ActionItemDTO) -> ActionItemDTO:
        item_id = item.id if item.id else f"ACT-{uuid.uuid4().hex[:8].upper()}"
        item.id = item_id
        now = int(time.time())
        title = item.title or (item.description[:60] if item.description else "Action Item")
        assignee = item.assignee or item.owner
        department = item.department or "General"
        priority = item.priority or "MEDIUM"
        status_val = (item.status or "OPEN").upper()
        created_at_val = item.created_at or now

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO action_items (
                    id, title, description, owner, assignee, department, priority,
                    deadline, status, source_type, source_id, source_offset, created_at,
                    expires_at, policy_version, approval_scope, is_demo, organisation_id
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    item_id,
                    title,
                    item.description,
                    item.owner,
                    assignee,
                    department,
                    priority,
                    item.deadline,
                    status_val,
                    item.source_type,
                    item.source_id,
                    item.source_offset or "",
                    created_at_val,
                    item.expires_at,
                    item.policy_version,
                    item.approval_scope,
                    item.is_demo or 0,
                    item.organisation_id or "CMP-GENESIS-01",
                ),
            )
            conn.commit()
        return ActionItemDTO(
            id=item_id,
            title=title,
            description=item.description,
            owner=item.owner,
            assignee=assignee,
            department=department,
            priority=priority,
            deadline=item.deadline,
            status=status_val,
            source_type=item.source_type,
            source_id=item.source_id,
            source_offset=item.source_offset or "",
            created_at=created_at_val,
            expires_at=item.expires_at,
            policy_version=item.policy_version,
            approval_scope=item.approval_scope,
            is_demo=item.is_demo or 0,
            organisation_id=item.organisation_id or "CMP-GENESIS-01",
        )

    def _row_to_dto(self, row: sqlite3.Row) -> ActionItemDTO:
        keys = row.keys()
        return ActionItemDTO(
            id=row["id"],
            title=row["title"] if "title" in keys else None,
            description=row["description"],
            owner=row["owner"],
            assignee=row["assignee"] if "assignee" in keys else row["owner"],
            department=row["department"] if "department" in keys else "General",
            priority=row["priority"] if "priority" in keys else "MEDIUM",
            deadline=row["deadline"],
            status=row["status"],
            source_type=row["source_type"],
            source_id=row["source_id"],
            source_offset=row["source_offset"],
            created_at=row["created_at"] if "created_at" in keys else None,
            expires_at=row["expires_at"] if "expires_at" in keys else None,
            policy_version=row["policy_version"] if "policy_version" in keys else None,
            approval_scope=row["approval_scope"] if "approval_scope" in keys else None,
            is_demo=row["is_demo"] if "is_demo" in keys else 0,
            organisation_id=row["organisation_id"] if "organisation_id" in keys else "CMP-GENESIS-01",
        )

    def get_by_id(self, item_id: str) -> Optional[ActionItemDTO]:
        with self._get_connection() as conn:
            cursor = conn.execute(
                "SELECT * FROM action_items WHERE id = ?", (item_id,)
            )
            row = cursor.fetchone()
            if not row:
                return None
            return self._row_to_dto(row)

    def get(self, item_id: str) -> Optional[ActionItemDTO]:
        """Alias for get_by_id to maintain interface compatibility with core repository."""
        return self.get_by_id(item_id)

    def list_all(self) -> List[ActionItemDTO]:
        """Alias for list_items to maintain interface compatibility with core repository."""
        return self.list_items()

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
            return [self._row_to_dto(row) for row in rows]

    def update(self, item_id: str, updates: Dict[str, Any]) -> Optional[ActionItemDTO]:
        allowed_fields = {
            "title",
            "description",
            "owner",
            "assignee",
            "department",
            "priority",
            "deadline",
            "status",
            "source_type",
            "source_id",
            "source_offset",
            "expires_at",
            "policy_version",
            "approval_scope",
        }
        filtered_updates = {
            k: v for k, v in updates.items() if k in allowed_fields and v is not None
        }

        if not filtered_updates:
            return self.get_by_id(item_id)

        # Enforce status transition validation (Item 91)
        if "status" in filtered_updates:
            existing = self.get_by_id(item_id)
            if not existing:
                return None
            next_status = str(filtered_updates["status"]).upper()
            self.validate_transition(existing.status, next_status)
            filtered_updates["status"] = next_status

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

    def invalidate_actions_for_policy_version(self, outdated_version: str) -> int:
        """Item 152 & 153: Invalidates all pending/proposed actions referencing an outdated policy version."""
        with self._get_connection() as conn:
            cursor = conn.execute("""
                UPDATE action_items
                SET status = 'REJECTED'
                WHERE policy_version = ?
                  AND status IN ('PROPOSED', 'REVIEW_REQUIRED', 'APPROVED')
            """, (outdated_version,))
            conn.commit()
            return cursor.rowcount


# Singleton repository instance
action_hub_repo = ActionHubRepository()
