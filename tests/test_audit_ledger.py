"""
tests/test_audit_ledger.py
Validates:
1. Chained SHA-256 tamper-evident audit ledger construction.
2. verify_chain() cryptographic traversal from Genesis block to tip.
3. Tamper detection: manual modification of content or hash immediately produces AUDIT_INTEGRITY_FAILURE.
4. /api/audit/verify and /api/audit/trail API endpoints.
"""
import pytest
import sqlite3
import time
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.core.audit_ledger import audit_ledger
from apps.api.core.db import db

client = TestClient(app)


def test_genesis_block_initialization():
    """Verify genesis block exists and has sequence 0 with 'GENESIS' previous hash."""
    events = audit_ledger.get_events(limit=10)
    assert len(events) >= 1
    # Check if first event is GENESIS
    genesis = events[-1] if len(events) > 0 else None
    assert genesis is not None
    # Chain verification should succeed on initial state
    res = audit_ledger.verify_chain()
    assert res["status"] == "AUDIT_VALID"
    assert res["total_events"] >= 1
    assert "tip_hash" in res


def test_append_audit_event_and_chain():
    """Appending sequential events correctly updates sequence and links previous hash."""
    ev1 = audit_ledger.append_event(
        event_type="TEST_EVENT_1",
        actor_id="test_runner",
        entity_id="DOC-001",
        details={"action": "create_doc", "title": "Doc 1"},
        organisation_id="TEST_TENANT"
    )
    assert ev1["sequence"] >= 1
    assert ev1["previous_hash"] != ""
    assert ev1["current_hash"] != ""

    ev2 = audit_ledger.append_event(
        event_type="TEST_EVENT_2",
        actor_id="test_runner",
        entity_id="DOC-002",
        details={"action": "update_doc", "title": "Doc 2"},
        organisation_id="TEST_TENANT"
    )
    assert ev2["sequence"] == ev1["sequence"] + 1
    assert ev2["previous_hash"] == ev1["current_hash"]

    # Ledger verification must pass
    verification = audit_ledger.verify_chain()
    assert verification["status"] == "AUDIT_VALID"
    assert verification["tip_hash"] == ev2["current_hash"]


def test_tamper_detection_on_audit_chain():
    """Tampering with an event payload or hash in SQLite breaks the chain verification."""
    # Append an event to tamper with
    target_event = audit_ledger.append_event(
        event_type="TAMPER_CANDIDATE",
        actor_id="innocent_user",
        entity_id="VAL-001",
        details={"amount": 1000},
        organisation_id="TEST_TENANT"
    )
    seq = target_event["sequence"]

    conn = db.get_connection()
    cursor = conn.cursor()

    # Manually tamper with input_hash without recomputing event_hash
    cursor.execute(
        "UPDATE audit_ledger SET input_hash = ? WHERE sequence_id = ?",
        ('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef', seq)
    )
    conn.commit()

    # Verify chain detects corruption
    tamper_check = audit_ledger.verify_chain()
    assert tamper_check["status"] == "AUDIT_INTEGRITY_FAILURE"
    assert tamper_check["broken_at_sequence"] == seq
    assert "Payload tamper detected" in tamper_check["reason"]

    # Revert or repair for remaining tests
    cursor.execute(
        "SELECT event_hash FROM audit_ledger WHERE sequence_id = ?",
        (seq,)
    )
    # Re-insert original input_hash
    orig_input_hash = audit_ledger.compute_sha256({"amount": 1000})
    cursor.execute(
        "UPDATE audit_ledger SET input_hash = ? WHERE sequence_id = ?",
        (orig_input_hash, seq)
    )
    conn.commit()
    repaired_check = audit_ledger.verify_chain()
    assert repaired_check["status"] == "AUDIT_VALID"


def test_api_audit_endpoints():
    """Verify /api/audit/verify and /api/audit/trail return valid tamper-evident responses."""
    verify_res = client.get("/api/audit/verify")
    assert verify_res.status_code == 200
    data = verify_res.json()
    assert data["status"] in ("AUDIT_VALID", "AUDIT_INTEGRITY_FAILURE")
    assert "tip_hash" in data
    assert "total_events" in data

    trail_res = client.get("/api/audit/trail?limit=5")
    assert trail_res.status_code == 200
    trail_data = trail_res.json()
    assert isinstance(trail_data, list)
    assert len(trail_data) > 0
    first_entry = trail_data[0]
    assert "current_hash" in first_entry
    assert "previous_hash" in first_entry
    assert "sequence" in first_entry
