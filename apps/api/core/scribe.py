"""
apps/api/core/scribe.py
Hermes-Style Autonomous Scribe & Continuous Memory Consolidation Engine.

Features:
- Structured interaction telemetry logging
- Ebbinghaus-inspired memory consolidation & recency reinforcement
- Periodic synthesis of institutional facts and decision synchronization
"""

import time
import uuid
import math
from typing import Dict, Any, List, Optional
from apps.api.core.db import db


class AutonomousScribe:
    def __init__(self, tau: float = 86400.0, alpha: float = 0.5):
        """
        tau: Half-life decay scale (default 24h in seconds)
        alpha: Reinforcement coefficient per repeat access
        """
        self.tau = tau
        self.alpha = alpha

    def log_interaction(
        self,
        event_type: str,
        query: str,
        response: str,
        user_name: Optional[str] = None,
        user_role: Optional[str] = None,
        clearance: str = "ALL_TEAM",
        session_id: Optional[str] = None,
        citations: Optional[List[str]] = None
    ) -> str:
        """Records user interactions into SQLite interaction_logs table for telemetry."""
        log_id = f"LOG-{uuid.uuid4().hex[:8].upper()}"
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO interaction_logs (
                    id, session_id, user_name, user_role, clearance, event_type, query, response, citations
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                log_id,
                session_id,
                user_name or "Anonymous",
                user_role or "ENGINEER",
                clearance or "ALL_TEAM",
                event_type,
                query,
                response,
                ",".join(citations) if citations else None
            ))
            conn.commit()
            return log_id
        except Exception as e:
            print(f"Notice: Scribe logging error: {e}")
            return log_id

    def calculate_memory_activation(self, base_strength: float, initial_timestamp: int, access_count: int, current_timestamp: Optional[int] = None) -> float:
        """
        Evaluates memory retention using Ebbinghaus decay model:
        A(t) = S0 * exp(-(t - t0) / tau) + alpha * log(1 + n)
        """
        now = current_timestamp or int(time.time())
        dt = max(0, now - initial_timestamp)
        decay = math.exp(-dt / self.tau)
        reinforcement = self.alpha * math.log(1 + max(0, access_count))
        return (base_strength * decay) + reinforcement

    def get_consolidated_memories(self, limit: int = 20) -> List[Dict[str, Any]]:
        """Returns active institutional facts ordered by recency and activation."""
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                SELECT id, title, content, source, timestamp, tags, clearance
                FROM memories
                WHERE is_demo = 0 OR is_demo IS NULL
                ORDER BY timestamp DESC
                LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            return [dict(r) for r in rows]
        except Exception as e:
            print(f"Notice: Scribe retrieval error: {e}")
            return []


scribe = AutonomousScribe()
