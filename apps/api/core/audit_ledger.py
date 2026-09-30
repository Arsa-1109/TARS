# apps/api/core/audit_ledger.py
"""
TARS Core Invariant Foundation: Tamper-Evident Chained SHA-256 Audit Ledger
Enforces cryptographically verifiable provenance across all sovereign company mutations.
Chain formula: H_i = SHA256(H_{i-1} | seq | ts | actor | org | action | src | H_in | H_res)
"""
import hashlib
import json
import logging
import time
import uuid
from typing import Dict, Any, Optional, List

from apps.api.core.db import db
from apps.api.core.errors import TARSException, ErrorCodes

logger = logging.getLogger("tars.core.audit_ledger")

GENESIS_HASH = "0" * 64


class AuditLedger:
    def __init__(self):
        self._ensure_genesis_block()

    def _ensure_genesis_block(self):
        """Ensures the Genesis block (sequence 0) is persisted in the ledger."""
        try:
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT sequence_id FROM audit_ledger WHERE sequence_id = 0 LIMIT 1")
            if not cursor.fetchone():
                cursor.execute(
                    """
                    INSERT OR IGNORE INTO audit_ledger (
                        sequence_id, event_id, timestamp, actor, organisation_id, action,
                        source, input_hash, result_hash, previous_hash, event_hash, is_valid
                    ) VALUES (0, 'AUD-GENESIS-000', 0, 'SYSTEM', 'CMP-GENESIS-01', 'GENESIS',
                              'GENESIS', ?, ?, ?, ?, 1)
                    """,
                    (GENESIS_HASH, GENESIS_HASH, GENESIS_HASH, GENESIS_HASH)
                )
                conn.commit()
        except Exception:
            pass

    @staticmethod
    def compute_sha256(payload: Any) -> str:
        """Serializes payload deterministically and returns hexadecimal SHA-256 digest."""
        if payload is None:
            return hashlib.sha256(b"").hexdigest()
        if isinstance(payload, str):
            serialized = payload
        else:
            try:
                serialized = json.dumps(payload, sort_keys=True, default=str)
            except Exception:
                serialized = str(payload)
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def append_event(
        self,
        actor: Optional[str] = None,
        organisation_id: Optional[str] = None,
        action: Optional[str] = None,
        source: Optional[str] = None,
        input_data: Any = None,
        result_data: Any = None,
        # Backward-compatible and test alias parameters
        actor_id: Optional[str] = None,
        event_type: Optional[str] = None,
        entity_id: Optional[str] = None,
        details: Any = None,
    ) -> Dict[str, Any]:
        """
        Appends a cryptographically linked event block to the tenant's audit ledger.
        Guarantees that any post-facto database tampering breaks the hash chain.
        """
        actual_actor = actor or actor_id or "SYSTEM"
        actual_action = action or event_type or "MUTATION"
        actual_source = source or entity_id or "SYSTEM"
        actual_input = input_data if input_data is not None else details
        actual_result = result_data if result_data is not None else {"status": "SUCCESS"}

        org_id = organisation_id or "CMP-GENESIS-01"
        now_ts = int(time.time())
        event_id = f"AUD-{uuid.uuid4().hex[:12].upper()}"

        input_hash = self.compute_sha256(actual_input)
        result_hash = self.compute_sha256(actual_result)

        conn = db.get_connection()
        cursor = conn.cursor()

        # Retrieve the latest sequence block for this organisation
        cursor.execute(
            """
            SELECT sequence_id, event_hash
            FROM audit_ledger
            WHERE organisation_id = ?
            ORDER BY sequence_id DESC
            LIMIT 1
            """,
            (org_id,),
        )
        last_row = cursor.fetchone()

        if last_row:
            prev_hash = last_row["event_hash"]
            next_seq = last_row["sequence_id"] + 1
        else:
            prev_hash = GENESIS_HASH
            next_seq = 1

        # Chained hash construction
        chain_token = (
            f"{prev_hash}|{next_seq}|{now_ts}|{actual_actor}|{org_id}|{actual_action}|{actual_source}|{input_hash}|{result_hash}"
        )
        event_hash = hashlib.sha256(chain_token.encode("utf-8")).hexdigest()

        cursor.execute(
            """
            INSERT INTO audit_ledger (
                event_id, timestamp, actor, organisation_id, action,
                source, input_hash, result_hash, previous_hash, event_hash, is_valid
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
            """,
            (
                event_id,
                now_ts,
                actual_actor,
                org_id,
                actual_action,
                actual_source,
                input_hash,
                result_hash,
                prev_hash,
                event_hash,
            ),
        )
        conn.commit()

        logger.info(f"Audit event recorded: {event_id} (seq={next_seq}, action={actual_action}, hash={event_hash[:12]})")

        return {
            "event_id": event_id,
            "sequence_id": next_seq,
            "sequence": next_seq,
            "timestamp": now_ts,
            "organisation_id": org_id,
            "action": actual_action,
            "actor": actual_actor,
            "source": actual_source,
            "previous_hash": prev_hash,
            "event_hash": event_hash,
            "current_hash": event_hash,
            "status": "RECORDED",
        }

    def verify_chain(self, organisation_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Independently walks the cryptographic hash ledger from Genesis block to tip.
        Returns AUDIT_VALID if all signatures and sequence links are mathematically intact.
        Returns AUDIT_INTEGRITY_FAILURE if any record was modified, deleted, or injected.
        """
        conn = db.get_connection()
        cursor = conn.cursor()

        if organisation_id:
            cursor.execute(
                """
                SELECT sequence_id, event_id, timestamp, actor, organisation_id,
                       action, source, input_hash, result_hash, previous_hash, event_hash
                FROM audit_ledger
                WHERE organisation_id = ?
                ORDER BY sequence_id ASC
                """,
                (organisation_id,),
            )
        else:
            cursor.execute(
                """
                SELECT sequence_id, event_id, timestamp, actor, organisation_id,
                       action, source, input_hash, result_hash, previous_hash, event_hash
                FROM audit_ledger
                ORDER BY sequence_id ASC
                """
            )

        rows = cursor.fetchall()

        if not rows:
            return {
                "status": "AUDIT_VALID",
                "total_events": 0,
                "tip_hash": GENESIS_HASH,
                "message": "Audit ledger is pristine and empty (Genesis state).",
            }

        expected_prev_hash = GENESIS_HASH
        for idx, row in enumerate(rows):
            seq = row["sequence_id"]
            ev_id = row["event_id"]
            stored_prev = row["previous_hash"]
            stored_hash = row["event_hash"]

            if seq == 0:
                expected_prev_hash = stored_hash
                continue

            # 1. Validate previous_hash link
            if stored_prev != expected_prev_hash:
                logger.error(f"Audit chain broken at seq {seq} ({ev_id}): expected prev {expected_prev_hash}, got {stored_prev}")
                return {
                    "status": "AUDIT_INTEGRITY_FAILURE",
                    "broken_at_sequence": seq,
                    "event_id": ev_id,
                    "reason": f"Hash continuity broken at sequence {seq}. Previous hash does not match prior block.",
                    "expected_previous_hash": expected_prev_hash,
                    "stored_previous_hash": stored_prev,
                }

            # 2. Recompute current block hash
            token = (
                f"{stored_prev}|{seq}|{row['timestamp']}|{row['actor']}|{row['organisation_id']}|"
                f"{row['action']}|{row['source']}|{row['input_hash']}|{row['result_hash']}"
            )
            recomputed = hashlib.sha256(token.encode("utf-8")).hexdigest()

            if recomputed != stored_hash:
                logger.error(f"Audit record signature invalid at seq {seq} ({ev_id}): payload altered post-commit")
                return {
                    "status": "AUDIT_INTEGRITY_FAILURE",
                    "broken_at_sequence": seq,
                    "event_id": ev_id,
                    "reason": f"Payload tamper detected at sequence {seq}. Signature recalculation mismatch.",
                    "recomputed_hash": recomputed,
                    "stored_hash": stored_hash,
                }

            expected_prev_hash = stored_hash

        return {
            "status": "AUDIT_VALID",
            "total_events": len(rows),
            "tip_hash": expected_prev_hash,
            "message": "Audit trail verified cryptographically. Zero tampering detected.",
        }

    def get_events(
        self,
        organisation_id: Optional[str] = None,
        limit: int = 50,
        action: Optional[str] = None,
        entity_id: Optional[str] = None,
        event_type: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Returns recent audit events with hash signatures."""
        conn = db.get_connection()
        cursor = conn.cursor()

        query = "SELECT * FROM audit_ledger WHERE 1=1"
        params: List[Any] = []

        if organisation_id:
            query += " AND organisation_id = ?"
            params.append(organisation_id)
        if action or event_type:
            query += " AND action = ?"
            params.append(action or event_type)
        if entity_id:
            query += " AND (source = ? OR event_id = ?)"
            params.extend([entity_id, entity_id])

        query += " ORDER BY sequence_id DESC LIMIT ?"
        params.append(limit)

        cursor.execute(query, params)
        rows = cursor.fetchall()
        result = []
        for r in rows:
            d = dict(r)
            d["sequence"] = d.get("sequence_id")
            d["current_hash"] = d.get("event_hash")
            result.append(d)
        return result


audit_ledger = AuditLedger()
