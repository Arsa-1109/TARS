# apps/api/core/actions.py
"""
Track 1 & Track 3: Governed Action Hub Engine (Points 11, 12, 90–94)
Unified persistence in primary SQLite database (eliminates action_hub.sqlite3 split-brain).
Deterministic lifecycle:
DETECTED -> PROPOSED -> REVIEW_REQUIRED -> APPROVED/REJECTED -> QUEUED -> EXECUTING -> COMPLETED/FAILED/ROLLED_BACK.
Strict transition validation, zero implicit auto-approvals, full provenance, and cryptographic receipts.
"""

import hashlib
import json
import logging
import sqlite3
import time
import uuid
from typing import Dict, Any, List, Optional

from apps.api.core.db import db
from apps.api.core.audit_ledger import audit_ledger
from apps.api.core.policies import policy_engine
from apps.api.schemas.contracts import ActionItemDTO
from apps.api.schemas.core_contracts import ActionLifecycleState, ActionReceipt
from apps.api.core.errors import TARSException

logger = logging.getLogger("tars.core.actions")

LEGAL_TRANSITIONS: Dict[str, set] = {
    ActionLifecycleState.DETECTED: {
        ActionLifecycleState.PROPOSED,
        ActionLifecycleState.REVIEW_REQUIRED,
        ActionLifecycleState.REJECTED,
    },
    ActionLifecycleState.PROPOSED: {
        ActionLifecycleState.REVIEW_REQUIRED,
        ActionLifecycleState.APPROVED,
        ActionLifecycleState.REJECTED,
    },
    ActionLifecycleState.REVIEW_REQUIRED: {
        ActionLifecycleState.APPROVED,
        ActionLifecycleState.REJECTED,
    },
    ActionLifecycleState.APPROVED: {
        ActionLifecycleState.QUEUED,
        ActionLifecycleState.EXECUTING,
        ActionLifecycleState.REJECTED,
    },
    ActionLifecycleState.QUEUED: {
        ActionLifecycleState.EXECUTING,
        ActionLifecycleState.REJECTED,
    },
    ActionLifecycleState.EXECUTING: {
        ActionLifecycleState.COMPLETED,
        ActionLifecycleState.FAILED,
    },
    ActionLifecycleState.COMPLETED: {
        ActionLifecycleState.ROLLED_BACK,
    },
    ActionLifecycleState.FAILED: {
        ActionLifecycleState.PROPOSED,
        ActionLifecycleState.QUEUED,
    },
    ActionLifecycleState.REJECTED: {
        ActionLifecycleState.PROPOSED,
    },
    ActionLifecycleState.ROLLED_BACK: set(),
}


def ensure_action_items_schema(conn: sqlite3.Connection) -> None:
    """Ensures all columns exist in the action_items table across primary and isolated test databases."""
    cursor = conn.cursor()
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS action_items (
            id TEXT PRIMARY KEY,
            title TEXT,
            description TEXT NOT NULL,
            action_type TEXT NOT NULL DEFAULT 'GENERIC',
            owner TEXT NOT NULL DEFAULT 'Unassigned',
            assignee TEXT,
            department TEXT DEFAULT 'General',
            priority TEXT NOT NULL DEFAULT 'MEDIUM',
            deadline INTEGER,
            status TEXT NOT NULL DEFAULT 'PROPOSED',
            source_type TEXT NOT NULL DEFAULT 'CALL',
            source_id TEXT NOT NULL DEFAULT '',
            source_offset TEXT,
            source TEXT NOT NULL DEFAULT 'HUMAN',
            reason TEXT,
            evidence_ref TEXT,
            tool TEXT,
            parameters TEXT,
            risk_level TEXT NOT NULL DEFAULT 'LOW',
            approver_id TEXT,
            approved_at INTEGER,
            execution_time_ms INTEGER,
            rollback_handler TEXT,
            audit_block_id TEXT,
            organisation_id TEXT NOT NULL DEFAULT 'CMP-GENESIS-01',
            lifecycle_status TEXT DEFAULT 'OPEN',
            effective_from INTEGER,
            effective_to INTEGER,
            confidence_state TEXT NOT NULL DEFAULT 'CONFIRMED',
            source_mode TEXT NOT NULL DEFAULT 'LIVE',
            is_authoritative INTEGER NOT NULL DEFAULT 1,
            created_at INTEGER NOT NULL DEFAULT 0,
            updated_at INTEGER NOT NULL DEFAULT 0
        );
        """
    )
    cursor.execute("PRAGMA table_info(action_items);")
    cols = {r[1] for r in cursor.fetchall()}
    col_defs = {
        "title": "TEXT",
        "action_type": "TEXT NOT NULL DEFAULT 'GENERIC'",
        "assignee": "TEXT",
        "department": "TEXT DEFAULT 'General'",
        "priority": "TEXT NOT NULL DEFAULT 'MEDIUM'",
        "source": "TEXT NOT NULL DEFAULT 'HUMAN'",
        "reason": "TEXT",
        "evidence_ref": "TEXT",
        "tool": "TEXT",
        "parameters": "TEXT",
        "risk_level": "TEXT NOT NULL DEFAULT 'LOW'",
        "approver_id": "TEXT",
        "approved_at": "INTEGER",
        "execution_time_ms": "INTEGER",
        "rollback_handler": "TEXT",
        "audit_block_id": "TEXT",
        "organisation_id": "TEXT NOT NULL DEFAULT 'CMP-GENESIS-01'",
        "lifecycle_status": "TEXT DEFAULT 'OPEN'",
        "effective_from": "INTEGER",
        "effective_to": "INTEGER",
        "confidence_state": "TEXT NOT NULL DEFAULT 'CONFIRMED'",
        "source_mode": "TEXT NOT NULL DEFAULT 'LIVE'",
        "is_authoritative": "INTEGER NOT NULL DEFAULT 1",
        "created_at": "INTEGER NOT NULL DEFAULT 0",
        "updated_at": "INTEGER NOT NULL DEFAULT 0",
        "expires_at": "INTEGER",
        "policy_version": "TEXT",
        "approval_scope": "TEXT",
        "is_demo": "INTEGER DEFAULT 0",
    }
    for col_name, col_type in col_defs.items():
        if col_name not in cols:
            cursor.execute(f"ALTER TABLE action_items ADD COLUMN {col_name} {col_type};")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_status ON action_items(status);")
    cursor.execute("CREATE INDEX IF NOT EXISTS idx_action_items_owner ON action_items(owner);")
    conn.commit()


class GovernedActionHub:
    """Server-authoritative, governed action hub repository and lifecycle engine."""

    def __init__(self, get_connection_fn=None):
        self._get_connection_fn = get_connection_fn
        self._schema_verified = False

    def _get_conn(self) -> sqlite3.Connection:
        if self._get_connection_fn:
            conn = self._get_connection_fn()
        else:
            conn = db.get_connection()
        if not self._schema_verified:
            try:
                ensure_action_items_schema(conn)
                self._schema_verified = True
            except Exception as e:
                logger.debug(f"Schema verification note: {e}")
        return conn

    def validate_transition(self, current_status: str, target_status: str) -> None:
        """Validates that a state transition is legal in the finite state machine."""
        curr_norm = ActionLifecycleState.normalize(current_status)
        target_norm = ActionLifecycleState.normalize(target_status)

        if curr_norm == target_norm:
            return

        valid_targets = LEGAL_TRANSITIONS.get(curr_norm, set())
        if target_norm not in valid_targets:
            raise TARSException(
                status_code=400,
                code="INVALID_ACTION_STATE_TRANSITION",
                message=f"Illegal state transition from '{curr_norm}' to '{target_norm}'. Permitted next states: {sorted(list(valid_targets))}",
                component="governed_action_hub",
                retryable=False,
            )

    def transition_action(
        self,
        action_id: str,
        target_status: str,
        actor_id: str = "SYSTEM",
        actor_role: str = "ENGINEER",
        reason: Optional[str] = None,
    ) -> ActionItemDTO:
        """
        Executes an audited state transition validating FSM rules and authorization.
        """
        action = self.get_by_id(action_id)
        if not action:
            raise TARSException(status_code=404, code="ACTION_NOT_FOUND", message=f"Action {action_id} not found.")

        target_norm = ActionLifecycleState.normalize(target_status)
        self.validate_transition(action.status, target_norm)

        # Enforce no auto-approval by AI
        if target_norm == ActionLifecycleState.APPROVED:
            if actor_role.upper() in ("AI", "AGENT", "AUTOMATED", "LLM"):
                raise TARSException(
                    status_code=403,
                    code="UNAUTHORIZED_AUTO_APPROVAL",
                    message="AI and automated agents cannot approve actions. Server-authoritative human approval required.",
                    component="governed_action_hub",
                    retryable=False,
                )

        updates: Dict[str, Any] = {"status": target_norm}
        if target_norm == ActionLifecycleState.APPROVED:
            updates["approver_id"] = actor_id
            updates["approved_at"] = int(time.time())
        if reason:
            updates["reason"] = reason

        updated = self.update(action_id, updates, actor_id=actor_id, actor_role=actor_role, validate_fsm=False)
        return updated

    def create(self, item: ActionItemDTO, actor_id: str = "SYSTEM", actor_role: str = "ENGINEER") -> ActionItemDTO:
        """
        Creates a new action in the action hub.
        Enforces Point 12: No internal or AI source can implicitly auto-approve actions.
        """
        now = int(time.time())
        item_id = item.id if item.id else f"ACT-{uuid.uuid4().hex[:8].upper()}"
        item.id = item_id

        # Normalize status
        raw_status = (item.status or "PROPOSED").upper().strip()
        canonical_status = ActionLifecycleState.normalize(raw_status)

        # Zero implicit auto-approval rule (Point 12)
        source_upper = (item.source or "").upper()
        if source_upper in ("LLM_PROPOSAL", "AI", "CLIENT_CALL", "AUTOMATED") or actor_role.upper() in ("AI", "AGENT", "AUTOMATED"):
            if canonical_status in (ActionLifecycleState.APPROVED, ActionLifecycleState.EXECUTING, ActionLifecycleState.COMPLETED):
                raise TARSException(
                    status_code=403,
                    code="UNAUTHORIZED_AUTO_APPROVAL",
                    message="AI models and automated extractions cannot auto-approve actions. Actions must be proposed for review.",
                    component="governed_action_hub",
                    retryable=False,
                )
            if canonical_status not in (ActionLifecycleState.DETECTED, ActionLifecycleState.REVIEW_REQUIRED):
                canonical_status = ActionLifecycleState.PROPOSED
                raw_status = item.status or "PROPOSED"

        # If approved directly, ensure approver is recorded
        approver = item.approver_id
        approved_at = item.approved_at
        if canonical_status == ActionLifecycleState.APPROVED:
            if not approver:
                approver = actor_id
                approved_at = now

        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT OR REPLACE INTO action_items (
                id, title, description, action_type, owner, assignee, department,
                priority, deadline, status, source_type, source_id, source_offset,
                source, reason, evidence_ref, tool, parameters, risk_level,
                approver_id, approved_at, execution_time_ms, rollback_handler,
                audit_block_id, organisation_id, lifecycle_status, effective_from,
                effective_to, confidence_state, source_mode, is_authoritative,
                created_at, updated_at, expires_at, policy_version, approval_scope, is_demo
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item_id,
                item.title or f"Action: {item.description[:40]}",
                item.description,
                item.action_type or "GENERIC",
                item.owner or "Unassigned",
                item.assignee,
                item.department or "General",
                item.priority or "MEDIUM",
                item.deadline,
                raw_status,
                item.source_type or "CALL",
                item.source_id or "",
                item.source_offset or "",
                item.source or "HUMAN",
                item.reason,
                item.evidence_ref,
                item.tool,
                json.dumps(item.parameters or {}),
                item.risk_level or "LOW",
                approver,
                approved_at,
                item.execution_time_ms,
                json.dumps(item.rollback_handler) if item.rollback_handler else None,
                item.audit_block_id,
                item.organisation_id or "CMP-GENESIS-01",
                canonical_status,
                item.effective_from or now,
                item.effective_to,
                item.confidence_state or "CONFIRMED",
                item.source_mode or "LIVE",
                1 if item.is_authoritative else 0,
                item.created_at or now,
                now,
                item.expires_at,
                item.policy_version,
                item.approval_scope,
                item.is_demo or 0,
            ),
        )
        conn.commit()

        # Append audit event
        try:
            audit_res = audit_ledger.append_event(
                actor=actor_id,
                organisation_id=item.organisation_id or "CMP-GENESIS-01",
                action="ACTION_PROPOSED",
                source="ACTION_HUB",
                payload={"action_id": item_id, "action_type": item.action_type, "status": canonical_status},
            )
            item.audit_block_id = audit_res.get("block_hash")
        except Exception as aud_err:
            logger.debug(f"Action creation audit notice: {aud_err}")

        item.status = raw_status
        item.lifecycle_status = canonical_status
        return item

    def get_by_id(self, item_id: str) -> Optional[ActionItemDTO]:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM action_items WHERE id = ?;", (item_id,))
        row = cursor.fetchone()
        if not row:
            return None
        return self._row_to_dto(row)

    def get(self, item_id: str) -> Optional[ActionItemDTO]:
        return self.get_by_id(item_id)

    def list_items(
        self,
        status: Optional[str] = None,
        owner: Optional[str] = None,
        source_type: Optional[str] = None,
        organisation_id: Optional[str] = None,
    ) -> List[ActionItemDTO]:
        query = "SELECT * FROM action_items WHERE 1=1"
        params: List[Any] = []

        if status:
            norm_status = ActionLifecycleState.normalize(status)
            query += " AND (status = ? OR lifecycle_status = ? OR status = ?)"
            params.extend([norm_status, norm_status, status.upper()])
        if owner:
            query += " AND owner = ?"
            params.append(owner)
        if source_type:
            query += " AND source_type = ?"
            params.append(source_type.upper())
        if organisation_id and organisation_id not in ("ALL", "*"):
            query += " AND (organisation_id = ? OR organisation_id = 'CMP-GENESIS-01' OR organisation_id IS NULL)"
            params.append(organisation_id)

        query += " ORDER BY created_at DESC"

        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(query, params)
        return [self._row_to_dto(r) for r in cursor.fetchall()]

    def list_all(self) -> List[ActionItemDTO]:
        return self.list_items()

    def update(
        self,
        item_id: str,
        updates: Dict[str, Any],
        actor_id: str = "SYSTEM",
        actor_role: str = "ENGINEER",
        validate_fsm: bool = True,
    ) -> Optional[ActionItemDTO]:
        """
        Updates an action item with strict finite state machine transition validation.
        """
        current_item = self.get_by_id(item_id)
        if not current_item:
            return None

        now = int(time.time())

        # If status transition requested, validate state machine rules
        if "status" in updates and updates["status"]:
            target_raw = str(updates["status"]).strip()
            target_status = ActionLifecycleState.normalize(target_raw)
            if validate_fsm:
                self.validate_transition(current_item.lifecycle_status or current_item.status, target_status)

            # Enforce approver identity when moving to APPROVED
            if target_status == ActionLifecycleState.APPROVED:
                if not updates.get("approver_id") and not current_item.approver_id:
                    updates["approver_id"] = actor_id
                updates["approved_at"] = now

            updates["status"] = target_raw
            updates["lifecycle_status"] = target_status

        allowed_fields = {
            "title",
            "description",
            "action_type",
            "owner",
            "assignee",
            "department",
            "priority",
            "deadline",
            "status",
            "lifecycle_status",
            "source_type",
            "source_id",
            "source_offset",
            "source",
            "reason",
            "evidence_ref",
            "tool",
            "parameters",
            "risk_level",
            "approver_id",
            "approved_at",
            "execution_time_ms",
            "rollback_handler",
            "audit_block_id",
            "organisation_id",
            "confidence_state",
            "expires_at",
            "policy_version",
            "approval_scope",
            "is_demo",
        }

        filtered = {}
        for k, v in updates.items():
            if k in allowed_fields:
                if k in ("parameters", "rollback_handler") and isinstance(v, (dict, list)):
                    filtered[k] = json.dumps(v)
                else:
                    filtered[k] = v

        if not filtered:
            return current_item

        filtered["updated_at"] = now

        set_clause = ", ".join(f"{k} = ?" for k in filtered.keys())
        params = list(filtered.values())
        params.append(item_id)

        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(f"UPDATE action_items SET {set_clause} WHERE id = ?", params)
        conn.commit()

        # Append audit event for update/transition
        try:
            audit_action = "ACTION_UPDATED"
            if "status" in filtered:
                audit_action = f"ACTION_TRANSITION_{filtered['status']}"
            audit_ledger.append_event(
                actor=actor_id,
                organisation_id=current_item.organisation_id,
                action=audit_action,
                source="ACTION_HUB",
                payload={"action_id": item_id, "updates": {k: str(v)[:80] for k, v in filtered.items()}},
            )
        except Exception as aud_err:
            logger.debug(f"Action update audit notice: {aud_err}")

        return self.get_by_id(item_id)

    def execute_action(
        self,
        action_id: str,
        actor_id: str = "SYSTEM",
        actor_role: str = "ENGINEER",
        actor_clearance: str = "ALL_TEAM",
        rollback_handler: Optional[Dict[str, Any]] = None,
    ) -> ActionReceipt:
        """
        Executes a pre-approved action under deterministic policy control.
        1. Verifies APPROVED state.
        2. Evaluates action against policy rules.
        3. Transitions: APPROVED -> QUEUED -> EXECUTING -> COMPLETED (or FAILED).
        4. Records cryptographic receipt in action_receipts and audit ledger.
        """
        action = self.get_by_id(action_id)
        if not action:
            raise TARSException(status_code=404, code="ACTION_NOT_FOUND", message=f"Action {action_id} not found.")

        current_norm = ActionLifecycleState.normalize(action.status)
        if current_norm not in (ActionLifecycleState.APPROVED, ActionLifecycleState.QUEUED):
            raise TARSException(
                status_code=400,
                code="ACTION_NOT_APPROVED",
                message=f"Action must be in APPROVED state before execution (currently '{current_norm}').",
            )

        start_time = time.perf_counter()
        now_ts = int(time.time())

        # 1. Evaluate deterministic policy engine (Points 13 & 14)
        policy_decision = policy_engine.evaluate(
            action_type=action.action_type,
            risk_level=action.risk_level,
            actor_role=actor_role,
            actor_clearance=actor_clearance,
            parameters=action.parameters,
            tool=action.tool,
            organisation_id=action.organisation_id,
        )

        if not policy_decision.is_allowed:
            # Transition to FAILED due to policy denial
            self.update(action_id, {"status": ActionLifecycleState.FAILED}, actor_id=actor_id, validate_fsm=False)
            raise TARSException(
                status_code=403,
                code="POLICY_EXECUTION_DENIED",
                message=f"Action execution prohibited by policy: {'; '.join(policy_decision.denial_reasons)}",
            )

        # 2. Transition through execution pipeline
        self.update(action_id, {"status": ActionLifecycleState.QUEUED}, actor_id=actor_id)
        self.update(action_id, {"status": ActionLifecycleState.EXECUTING}, actor_id=actor_id)

        # 3. Simulate execution & compute parameters hash
        param_str = json.dumps(action.parameters or {}, sort_keys=True)
        param_hash = hashlib.sha256(param_str.encode("utf-8")).hexdigest()[:16]
        duration_ms = int((time.perf_counter() - start_time) * 1000)

        # Set rollback handler if provided
        active_rollback = rollback_handler or action.rollback_handler

        # 4. Transition to COMPLETED
        self.update(
            action_id,
            {
                "status": ActionLifecycleState.COMPLETED,
                "execution_time_ms": duration_ms,
                "rollback_handler": active_rollback,
            },
            actor_id=actor_id,
        )

        # 5. Commit cryptographic audit event & receipt
        receipt_id = f"RCP-{uuid.uuid4().hex[:8].upper()}"
        audit_res = audit_ledger.append_event(
            actor=actor_id,
            organisation_id=action.organisation_id,
            action="ACTION_EXECUTED",
            source="GOVERNED_ACTION_HUB",
            payload={
                "action_id": action_id,
                "action_type": action.action_type,
                "parameters_hash": param_hash,
                "duration_ms": duration_ms,
                "receipt_id": receipt_id,
            },
        )
        block_hash = audit_res.get("block_hash")

        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO action_receipts (
                receipt_id, action_id, status, actor, executed_at, duration_ms,
                parameters_hash, result_summary, rollback_payload, audit_block_id, organisation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                receipt_id,
                action_id,
                "EXECUTED",
                actor_id,
                now_ts,
                duration_ms,
                param_hash,
                f"Action '{action.title}' executed successfully under policy '{policy_decision.matching_policy_id}'.",
                json.dumps(active_rollback) if active_rollback else None,
                block_hash,
                action.organisation_id,
            ),
        )
        conn.commit()

        return ActionReceipt(
            receipt_id=receipt_id,
            action_id=action_id,
            status="EXECUTED",
            actor=actor_id,
            executed_at=now_ts,
            duration_ms=duration_ms,
            parameters_hash=param_hash,
            result_summary=f"Action '{action.title}' executed successfully.",
            rollback_payload=active_rollback,
            audit_block_id=block_hash,
            organisation_id=action.organisation_id,
        )

    def rollback_action(
        self,
        action_id: str,
        actor_id: str = "SYSTEM",
        reason: str = "COMPENSATION_TRIGGERED",
    ) -> ActionReceipt:
        """
        Executes a compensating rollback for a completed action (Points 4 & 145-160).
        """
        action = self.get_by_id(action_id)
        if not action:
            raise TARSException(status_code=404, code="ACTION_NOT_FOUND", message=f"Action {action_id} not found.")

        current_norm = ActionLifecycleState.normalize(action.status)
        if current_norm != ActionLifecycleState.COMPLETED:
            raise TARSException(
                status_code=400,
                code="ACTION_NOT_ROLLBACKABLE",
                message=f"Only COMPLETED actions can be rolled back (currently '{current_norm}').",
            )

        now_ts = int(time.time())
        # Transition state
        self.update(action_id, {"status": ActionLifecycleState.ROLLED_BACK}, actor_id=actor_id)

        receipt_id = f"RCP-RB-{uuid.uuid4().hex[:8].upper()}"
        param_hash = hashlib.sha256(reason.encode("utf-8")).hexdigest()[:16]

        audit_res = audit_ledger.append_event(
            actor=actor_id,
            organisation_id=action.organisation_id,
            action="ACTION_ROLLED_BACK",
            source="GOVERNED_ACTION_HUB",
            payload={
                "action_id": action_id,
                "reason": reason,
                "receipt_id": receipt_id,
                "rollback_handler": action.rollback_handler,
            },
        )
        block_hash = audit_res.get("block_hash")

        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute(
            """
            INSERT INTO action_receipts (
                receipt_id, action_id, status, actor, executed_at, duration_ms,
                parameters_hash, result_summary, rollback_payload, audit_block_id, organisation_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                receipt_id,
                action_id,
                "ROLLED_BACK",
                actor_id,
                now_ts,
                0,
                param_hash,
                f"Compensating rollback applied for {action_id}: {reason}",
                json.dumps(action.rollback_handler) if action.rollback_handler else None,
                block_hash,
                action.organisation_id,
            ),
        )
        conn.commit()

        return ActionReceipt(
            receipt_id=receipt_id,
            action_id=action_id,
            status="ROLLED_BACK",
            actor=actor_id,
            executed_at=now_ts,
            duration_ms=0,
            parameters_hash=param_hash,
            result_summary=f"Compensating rollback applied: {reason}",
            rollback_payload=action.rollback_handler,
            audit_block_id=block_hash,
            organisation_id=action.organisation_id,
        )

    def delete(self, item_id: str) -> bool:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM action_items WHERE id = ?;", (item_id,))
        conn.commit()
        return cursor.rowcount > 0

    def clear(self) -> None:
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM action_items;")
        conn.commit()

    def invalidate_actions_for_policy_version(self, outdated_version: str) -> int:
        """Invalidates all pending/proposed actions referencing an outdated policy version."""
        conn = self._get_conn()
        cursor = conn.cursor()
        cursor.execute("""
            UPDATE action_items
            SET status = 'REJECTED', lifecycle_status = 'REJECTED'
            WHERE policy_version = ?
              AND status IN ('PROPOSED', 'REVIEW_REQUIRED', 'APPROVED', 'OPEN')
        """, (outdated_version,))
        conn.commit()
        return cursor.rowcount

    def _row_to_dto(self, row: sqlite3.Row) -> ActionItemDTO:
        d = dict(row)
        params = {}
        if d.get("parameters"):
            try:
                params = json.loads(d["parameters"])
            except Exception:
                pass
        rollback = None
        if d.get("rollback_handler"):
            try:
                rollback = json.loads(d["rollback_handler"])
            except Exception:
                pass

        return ActionItemDTO(
            id=d["id"],
            title=d.get("title"),
            description=d.get("description", ""),
            action_type=d.get("action_type") or "GENERIC",
            owner=d.get("owner", "Unassigned"),
            assignee=d.get("assignee"),
            department=d.get("department", "General"),
            priority=d.get("priority", "MEDIUM"),
            deadline=d.get("deadline"),
            status=d.get("status", "OPEN"),
            source_type=d.get("source_type", "CALL"),
            source_id=d.get("source_id", ""),
            source_offset=d.get("source_offset"),
            source=d.get("source", "HUMAN"),
            reason=d.get("reason"),
            evidence_ref=d.get("evidence_ref"),
            tool=d.get("tool"),
            parameters=params,
            risk_level=d.get("risk_level", "LOW"),
            approver_id=d.get("approver_id"),
            approved_at=d.get("approved_at"),
            execution_time_ms=d.get("execution_time_ms"),
            rollback_handler=rollback,
            audit_block_id=d.get("audit_block_id"),
            organisation_id=d.get("organisation_id", "CMP-GENESIS-01"),
            lifecycle_status=d.get("lifecycle_status", "OPEN"),
            effective_from=d.get("effective_from"),
            effective_to=d.get("effective_to"),
            confidence_state=d.get("confidence_state", "CONFIRMED"),
            source_mode=d.get("source_mode", "LIVE"),
            is_authoritative=bool(d.get("is_authoritative", 1)),
            created_at=d.get("created_at"),
            expires_at=d.get("expires_at"),
            policy_version=d.get("policy_version"),
            approval_scope=d.get("approval_scope"),
            is_demo=d.get("is_demo", 0),
        )


action_hub = GovernedActionHub()
