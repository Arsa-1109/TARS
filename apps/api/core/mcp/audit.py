import hashlib
import json
import time
import uuid
from typing import Optional, Dict, Any, List
from apps.api.core.db import db
from apps.api.schemas.contracts import ToolAuditRecord
from .schemas import RiskLevel

class AuditLogger:
    GENESIS_HASH = "0" * 64

    def log(self, tool_name: str, arguments: dict, actor: str, approval_state: str, result: Optional[str] = None, error: Optional[str] = None) -> str:
        record_id = str(uuid.uuid4())
        record = ToolAuditRecord(
            id=record_id,
            tool_name=tool_name,
            arguments=arguments,
            actor=actor,
            timestamp=int(time.time()),
            approval_state=approval_state,
            result=result,
            error=error
        )
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO mcp_audit (id, tool_name, arguments, actor, timestamp, approval_state, result, error)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ''', (record.id, record.tool_name, str(record.arguments), record.actor, record.timestamp, record.approval_state, record.result, record.error))
        conn.commit()
        return record_id

    def create_receipt(
        self,
        action_id: str,
        actor: str,
        tool: str,
        payload: Dict[str, Any],
        policy_version: str = "v1.0",
        rollback_hook: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Creates an immutable, SHA-256 linear hash-chained action receipt (Item 150)."""
        receipt_id = f"rcpt-{uuid.uuid4().hex[:8]}"
        timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        payload_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        payload_hash = hashlib.sha256(payload_bytes).hexdigest()

        conn = db.get_connection()
        cursor = conn.cursor()
        try:
            cursor.execute("ALTER TABLE action_receipts ADD COLUMN prev_chain_hash TEXT;")
            conn.commit()
        except Exception:
            pass
        cursor.execute("SELECT chain_hash FROM action_receipts ORDER BY rowid DESC LIMIT 1")
        last_row = cursor.fetchone()
        prev_chain_hash = last_row["chain_hash"] if last_row and "chain_hash" in last_row.keys() else self.GENESIS_HASH

        # Compute chain hash: H_N = Hash(H_N-1 || Action)
        chain_input = f"{prev_chain_hash}{action_id}{actor}{tool}{payload_hash}{timestamp}{policy_version}"
        chain_hash = hashlib.sha256(chain_input.encode("utf-8")).hexdigest()

        cursor.execute("""
            INSERT INTO action_receipts (
                receipt_id, action_id, actor, tool, payload_hash,
                timestamp, policy_version, rollback_hook, chain_hash, prev_chain_hash
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            receipt_id, action_id, actor, tool, payload_hash,
            timestamp, policy_version, rollback_hook, chain_hash, prev_chain_hash
        ))
        conn.commit()

        return {
            "receipt_id": receipt_id,
            "action_id": action_id,
            "actor": actor,
            "tool": tool,
            "payload_hash": payload_hash,
            "timestamp": timestamp,
            "policy_version": policy_version,
            "rollback_hook": rollback_hook,
            "chain_hash": chain_hash,
        }

    def verify_chain(self) -> bool:
        """Verifies the integrity of the linear SHA-256 receipt chain."""
        conn = db.get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM action_receipts ORDER BY rowid ASC")
        rows = cursor.fetchall()
        expected_prev = self.GENESIS_HASH
        for row in rows:
            if row["prev_chain_hash"] != expected_prev:
                return False
            chain_input = f"{expected_prev}{row['action_id']}{row['actor']}{row['tool']}{row['payload_hash']}{row['timestamp']}{row['policy_version']}"
            computed_hash = hashlib.sha256(chain_input.encode("utf-8")).hexdigest()
            if computed_hash != row["chain_hash"]:
                return False
            expected_prev = row["chain_hash"]
        return True

audit_logger = AuditLogger()
