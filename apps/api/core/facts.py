# apps/api/core/facts.py
"""
Fact-Confidence Lifecycle Manager (Point 4)
Guarantees that model extractions, transcripts, and newly ingested facts
do not silently become institutional truth.
States:
EXTRACTED -> UNVERIFIED -> REVIEW_REQUIRED -> CONFIRMED / REJECTED / SUPERSEDED.
Only CONFIRMED facts are authoritative.
"""

import logging
import sqlite3
import time
from typing import Dict, Any, List, Optional

from apps.api.core.db import db
from apps.api.core.audit_ledger import audit_ledger
from apps.api.schemas.core_contracts import (
    FactLifecycleState,
    FactTransitionRequest,
    FactTransitionResponse,
)
from apps.api.core.errors import TARSException

logger = logging.getLogger("tars.core.facts")

VALID_FACT_STATES = {
    FactLifecycleState.EXTRACTED,
    FactLifecycleState.UNVERIFIED,
    FactLifecycleState.REVIEW_REQUIRED,
    FactLifecycleState.CONFIRMED,
    FactLifecycleState.REJECTED,
    FactLifecycleState.SUPERSEDED,
}


class FactLifecycleManager:
    """Manages fact verification workflows and confidence state transitions."""

    def __init__(self):
        pass

    def transition_confidence(
        self,
        entity_type: str,
        entity_id: str,
        new_state: str,
        actor: str = "SYSTEM",
        reason: Optional[str] = None,
        organisation_id: str = "CMP-GENESIS-01",
    ) -> FactTransitionResponse:
        """
        Transitions the confidence state of a document, memory, decision, or glossary entity.
        Enforces Point 4: Unverified extractions cannot be authoritative without confirmation.
        """
        new_state_norm = new_state.upper().strip()
        if new_state_norm not in VALID_FACT_STATES:
            raise TARSException(
                status_code=400,
                code="INVALID_FACT_LIFECYCLE_STATE",
                message=f"Invalid fact lifecycle state '{new_state}'. Permitted states: {sorted(list(VALID_FACT_STATES))}",
                component="fact_lifecycle_manager",
                retryable=False,
            )

        now_ts = int(time.time())
        conn = db.get_connection()
        cursor = conn.cursor()

        previous_state = "UNKNOWN"
        is_auth = 1 if new_state_norm == FactLifecycleState.CONFIRMED else 0
        etype = entity_type.upper().strip()

        if etype in ("MEMORY", "MEMORIES"):
            cursor.execute("SELECT confidence_state FROM memories WHERE id = ?;", (entity_id,))
            row = cursor.fetchone()
            if not row:
                raise TARSException(status_code=404, code="FACT_NOT_FOUND", message=f"Memory {entity_id} not found.")
            previous_state = row[0] or FactLifecycleState.UNVERIFIED
            cursor.execute(
                "UPDATE memories SET confidence_state = ?, is_authoritative = ? WHERE id = ?;",
                (new_state_norm, is_auth, entity_id),
            )
        elif etype in ("DOCUMENT", "DOCUMENTS"):
            cursor.execute("SELECT confidence_state FROM documents WHERE doc_id = ?;", (entity_id,))
            row = cursor.fetchone()
            if not row:
                raise TARSException(status_code=404, code="FACT_NOT_FOUND", message=f"Document {entity_id} not found.")
            previous_state = row[0] or FactLifecycleState.UNVERIFIED
            cursor.execute(
                "UPDATE documents SET confidence_state = ?, is_authoritative = ? WHERE doc_id = ?;",
                (new_state_norm, is_auth, entity_id),
            )
        elif etype in ("COMMITMENT", "ACTION", "ACTION_ITEM"):
            cursor.execute("SELECT confidence_state FROM action_items WHERE id = ?;", (entity_id,))
            row = cursor.fetchone()
            if not row:
                raise TARSException(status_code=404, code="FACT_NOT_FOUND", message=f"Action/Commitment {entity_id} not found.")
            previous_state = row[0] or FactLifecycleState.UNVERIFIED
            cursor.execute(
                "UPDATE action_items SET confidence_state = ?, is_authoritative = ? WHERE id = ?;",
                (new_state_norm, is_auth, entity_id),
            )
        elif etype in ("GLOSSARY", "TERM"):
            cursor.execute("SELECT clearance FROM institutional_glossary WHERE term = ? AND organisation_id = ?;", (entity_id, organisation_id))
            row = cursor.fetchone()
            if not row:
                raise TARSException(status_code=404, code="FACT_NOT_FOUND", message=f"Glossary term {entity_id} not found.")
            previous_state = FactLifecycleState.UNVERIFIED
            cursor.execute(
                "UPDATE institutional_glossary SET updated_at = ? WHERE term = ? AND organisation_id = ?;",
                (now_ts, entity_id, organisation_id),
            )
        else:
            raise TARSException(
                status_code=400,
                code="UNSUPPORTED_ENTITY_TYPE",
                message=f"Entity type '{entity_type}' is not supported for fact lifecycle management.",
            )

        conn.commit()

        # Log cryptographic audit event
        audit_res = audit_ledger.append_event(
            actor=actor,
            organisation_id=organisation_id,
            action="FACT_CONFIDENCE_TRANSITION",
            source="FACT_LIFECYCLE_MANAGER",
            payload={
                "entity_type": etype,
                "entity_id": entity_id,
                "previous_state": previous_state,
                "current_state": new_state_norm,
                "reason": reason or "Lifecycle transition executed",
            },
        )
        block_hash = audit_res.get("block_hash")

        return FactTransitionResponse(
            entity_id=entity_id,
            entity_type=etype,
            previous_state=previous_state,
            current_state=new_state_norm,
            audit_block_id=block_hash,
            timestamp=now_ts,
        )

    def list_unverified_facts(
        self,
        organisation_id: str = "CMP-GENESIS-01",
        limit: int = 50,
    ) -> List[Dict[str, Any]]:
        """Lists all items in review queue (confidence_state in EXTRACTED, UNVERIFIED, REVIEW_REQUIRED)."""
        conn = db.get_connection()
        cursor = conn.cursor()

        results = []
        cursor.execute("""
            SELECT id, title, content, confidence_state, timestamp, source
            FROM memories
            WHERE confidence_state IN ('EXTRACTED', 'UNVERIFIED', 'REVIEW_REQUIRED')
              AND (organisation_id = ? OR organisation_id = 'CMP-GENESIS-01' OR organisation_id IS NULL)
            ORDER BY timestamp DESC
            LIMIT ?;
        """, (organisation_id, limit))
        for r in cursor.fetchall():
            results.append({
                "entity_type": "MEMORY",
                "entity_id": r["id"],
                "title": r["title"],
                "content_preview": (r["content"] or "")[:200],
                "confidence_state": r["confidence_state"],
                "timestamp": r["timestamp"],
                "source": r["source"],
            })

        cursor.execute("""
            SELECT id, title, description, confidence_state, created_at, source
            FROM action_items
            WHERE confidence_state IN ('EXTRACTED', 'UNVERIFIED', 'REVIEW_REQUIRED')
              AND (organisation_id = ? OR organisation_id = 'CMP-GENESIS-01' OR organisation_id IS NULL)
            ORDER BY created_at DESC
            LIMIT ?;
        """, (organisation_id, limit))
        for r in cursor.fetchall():
            results.append({
                "entity_type": "ACTION",
                "entity_id": r["id"],
                "title": r["title"] or (r["description"][:40] if r["description"] else "Action Item"),
                "content_preview": (r["description"] or "")[:200],
                "confidence_state": r["confidence_state"],
                "timestamp": r["created_at"],
                "source": r["source"],
            })

        return results


fact_manager = FactLifecycleManager()
