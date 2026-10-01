"""
apps/api/core/telemetry.py
Interaction Telemetry and Metrics Normalization Service (Item 118).
Enforces:
- Strict numerical typing for latency_ms (float) and token_count (int)
- Case preservation for user queries and prompts
- Immutable SQLite telemetry audit logging
"""
import uuid
from typing import Optional, List, Dict, Any, Union
from apps.api.core.db import db


class TelemetryService:
    def normalize_metrics(self, latency_ms: Any, token_count: Any) -> tuple[float, int]:
        """Normalizes latency as float and token_count as int without type drift."""
        try:
            norm_latency = float(latency_ms) if latency_ms is not None else 0.0
        except (ValueError, TypeError):
            norm_latency = 0.0

        try:
            norm_tokens = int(token_count) if token_count is not None else 0
        except (ValueError, TypeError):
            norm_tokens = 0

        return norm_latency, norm_tokens

    def log_interaction(
        self,
        event_type: str,
        query: str,
        response: str,
        user_name: Optional[str] = None,
        user_role: Optional[str] = None,
        clearance: str = "ALL_TEAM",
        session_id: Optional[str] = None,
        user_id: Optional[str] = None,
        citations: Optional[List[str]] = None,
        latency_ms: Optional[Union[float, int]] = None,
        token_count: Optional[int] = None,
    ) -> str:
        """
        Records interaction telemetry preserving exact original casing of queries
        and normalizing latency and token metrics to strict numeric types.
        """
        log_id = f"LOG-{uuid.uuid4().hex[:8].upper()}"
        norm_latency, norm_tokens = self.normalize_metrics(latency_ms, token_count)

        # Preserve original query without lowercasing or mutation (Item 118)
        preserved_query = str(query) if query is not None else ""

        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO interaction_logs (
                    id, session_id, user_id, user_name, user_role, clearance,
                    event_type, query, response, citations
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    log_id,
                    session_id,
                    user_id,
                    user_name or "Anonymous",
                    user_role or "ENGINEER",
                    clearance or "ALL_TEAM",
                    event_type,
                    preserved_query,
                    response,
                    ",".join(citations) if citations else None,
                ),
            )
            conn.commit()
        except Exception as e:
            print(f"Notice: Telemetry logging error: {e}")

        return log_id


telemetry_service = TelemetryService()
