# tests/test_governed_action_engine.py
"""
Phase 3 Comprehensive Verification Suite:
- Governed Action Hub Engine (Points 11, 12, 90-94)
- Deterministic Policy Engine (Points 13, 14)
- Fact-Confidence Lifecycle (Point 4)
- Action Receipts & Chained Audit Logging (Points 4, 145-160)
"""
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.core.actions import action_hub
from apps.api.core.policies import policy_engine
from apps.api.core.facts import fact_manager
from apps.api.core.audit_ledger import audit_ledger
from apps.api.core.db import db
from apps.api.schemas.contracts import ActionItemDTO
from apps.api.schemas.core_contracts import (
    ActionLifecycleState,
    PolicyRule,
    FactLifecycleState,
    FactTransitionRequest,
)
from apps.api.core.errors import TARSException

client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_teardown():
    """Clean up actions and audit records between tests."""
    action_hub.clear()
    yield
    action_hub.clear()


# ==============================================================================
# 1. FACT-CONFIDENCE LIFECYCLE TESTS (Point 4)
# ==============================================================================

def test_fact_lifecycle_transitions_and_authoritative_rule():
    """
    Tests that memories start unverified and only become authoritative
    when explicitly transitioned to CONFIRMED.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO memories (
            id, record_type, title, content, source, timestamp, tags, clearance, confidence_state, is_authoritative, organisation_id
        ) VALUES (
            'MEM-TEST-001', 'FACT', 'Seed Cap Table', 'Founder equity 45%', 'DOCUMENT', 1700000000,
            'equity', 'ALL_TEAM', 'UNVERIFIED', 0, 'CMP-GENESIS-01'
        );
    """)
    conn.commit()

    # Initial state verification
    cursor.execute("SELECT confidence_state, is_authoritative FROM memories WHERE id = 'MEM-TEST-001';")
    row = cursor.fetchone()
    assert row[0] == "UNVERIFIED"
    assert row[1] == 0

    # 1. Transition to REVIEW_REQUIRED
    resp1 = fact_manager.transition_confidence(
        entity_type="MEMORY",
        entity_id="MEM-TEST-001",
        new_state=FactLifecycleState.REVIEW_REQUIRED,
        actor="ALICE_QA",
        reason="Needs founder review",
    )
    assert resp1.current_state == FactLifecycleState.REVIEW_REQUIRED
    assert resp1.audit_block_id is not None

    cursor.execute("SELECT confidence_state, is_authoritative FROM memories WHERE id = 'MEM-TEST-001';")
    row = cursor.fetchone()
    assert row[0] == "REVIEW_REQUIRED"
    assert row[1] == 0  # Still not authoritative!

    # 2. Transition to CONFIRMED
    resp2 = fact_manager.transition_confidence(
        entity_type="MEMORY",
        entity_id="MEM-TEST-001",
        new_state=FactLifecycleState.CONFIRMED,
        actor="ALEX_FOUNDER",
        reason="Verified against series seed paperwork",
    )
    assert resp2.current_state == FactLifecycleState.CONFIRMED
    assert resp2.audit_block_id is not None

    cursor.execute("SELECT confidence_state, is_authoritative FROM memories WHERE id = 'MEM-TEST-001';")
    row = cursor.fetchone()
    assert row[0] == "CONFIRMED"
    assert row[1] == 1  # Authoritative company truth!

    # 3. Transition to SUPERSEDED
    resp3 = fact_manager.transition_confidence(
        entity_type="MEMORY",
        entity_id="MEM-TEST-001",
        new_state=FactLifecycleState.SUPERSEDED,
        actor="ALEX_FOUNDER",
        reason="Series A round closed",
    )
    assert resp3.current_state == FactLifecycleState.SUPERSEDED
    cursor.execute("SELECT confidence_state, is_authoritative FROM memories WHERE id = 'MEM-TEST-001';")
    row = cursor.fetchone()
    assert row[0] == "SUPERSEDED"
    assert row[1] == 0  # Deprecated from authoritative truth


def test_fact_lifecycle_invalid_state_rejection():
    """Transitions with invalid fact lifecycle states must be rejected."""
    with pytest.raises(TARSException) as exc_info:
        fact_manager.transition_confidence(
            entity_type="MEMORY",
            entity_id="MEM-TEST-001",
            new_state="BOGUS_STATE",
        )
    assert exc_info.value.code == "INVALID_FACT_LIFECYCLE_STATE"


def test_unverified_facts_queue():
    """Verify listing unverified facts for human review."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO memories (
            id, record_type, title, content, source, timestamp, tags, clearance, confidence_state, is_authoritative, organisation_id
        ) VALUES (
            'MEM-QUEUE-01', 'FACT', 'Unreviewed Transcript Fact', 'Client mentioned Q3 deadline', 'TRANSCRIPT',
            1700000000, 'sales', 'ALL_TEAM', 'UNVERIFIED', 0, 'CMP-GENESIS-01'
        );
    """)
    conn.commit()

    unverified = fact_manager.list_unverified_facts(organisation_id="CMP-GENESIS-01")
    ids = [item["entity_id"] for item in unverified]
    assert "MEM-QUEUE-01" in ids


# ==============================================================================
# 2. GOVERNED ACTION HUB STATE MACHINE & ZERO AUTO-APPROVAL (Points 11, 12, 90-94)
# ==============================================================================

def test_zero_implicit_auto_approval_rejection():
    """
    Point 12: An AI model or automated scraper attempting to auto-approve or auto-complete
    an action must be blocked with 403 UNAUTHORIZED_AUTO_APPROVAL.
    """
    # 1. AI source attempts to create an APPROVED action directly
    ai_item = ActionItemDTO(
        id="ACT-AI-001",
        title="Deploy smart contract to mainnet",
        description="Autonomous model executing transaction",
        action_type="DEPLOY_PROD",
        source="LLM_PROPOSAL",
        status="APPROVED",
    )
    with pytest.raises(TARSException) as exc_info:
        action_hub.create(ai_item, actor_id="QWEN_AGENT", actor_role="AI")
    assert exc_info.value.code == "UNAUTHORIZED_AUTO_APPROVAL"
    assert exc_info.value.status_code == 403

    # 2. AI model attempting to create COMPLETED action directly
    ai_item_completed = ActionItemDTO(
        id="ACT-AI-002",
        title="Delete production database records",
        description="Autonomous model cleanup",
        action_type="DB_MIGRATION",
        source="AI",
        status="COMPLETED",
    )
    with pytest.raises(TARSException) as exc_info:
        action_hub.create(ai_item_completed, actor_id="QWEN_AGENT", actor_role="AI")
    assert exc_info.value.code == "UNAUTHORIZED_AUTO_APPROVAL"

    # 3. AI proposal is correctly accepted as PROPOSED for human review
    ai_valid_proposal = ActionItemDTO(
        id="ACT-AI-003",
        title="Propose SAML SSO upgrade",
        description="Model identified missing SSO requirement",
        action_type="GENERIC",
        source="LLM_PROPOSAL",
        status="PROPOSED",
    )
    created = action_hub.create(ai_valid_proposal, actor_id="QWEN_AGENT", actor_role="AI")
    assert created.id == "ACT-AI-003"
    assert created.status == "PROPOSED"
    assert created.lifecycle_status == ActionLifecycleState.PROPOSED


def test_deterministic_action_lifecycle_transitions():
    """
    Point 11: Complete valid lifecycle execution:
    DETECTED -> PROPOSED -> REVIEW_REQUIRED -> APPROVED -> QUEUED -> EXECUTING -> COMPLETED
    """
    item = ActionItemDTO(
        id="ACT-FSM-001",
        title="Staging deployment pipeline",
        description="Deploy commit abc to staging cluster",
        action_type="DEPLOY_STAGING",
        owner="DevOps",
        status="DETECTED",
        parameters={"service": "api-gateway", "target": "staging"},
    )
    action_hub.create(item)
    assert action_hub.get_by_id("ACT-FSM-001").status == "DETECTED"

    # DETECTED -> PROPOSED
    t1 = action_hub.transition_action("ACT-FSM-001", ActionLifecycleState.PROPOSED)
    assert t1.status == ActionLifecycleState.PROPOSED

    # PROPOSED -> REVIEW_REQUIRED
    t2 = action_hub.transition_action("ACT-FSM-001", ActionLifecycleState.REVIEW_REQUIRED)
    assert t2.status == ActionLifecycleState.REVIEW_REQUIRED

    # REVIEW_REQUIRED -> APPROVED (Human Lead approves)
    t3 = action_hub.transition_action(
        "ACT-FSM-001",
        ActionLifecycleState.APPROVED,
        actor_id="LEAD_ARCHITECT",
        actor_role="LEAD",
        reason="Changes verified on preview environment",
    )
    assert t3.status == ActionLifecycleState.APPROVED
    assert t3.approver_id == "LEAD_ARCHITECT"
    assert t3.approved_at is not None

    # AI attempt to approve an action must fail
    with pytest.raises(TARSException) as ai_err:
        action_hub.transition_action(
            "ACT-FSM-001",
            ActionLifecycleState.APPROVED,
            actor_id="AUTONOMOUS_AGENT",
            actor_role="AI",
        )
    assert ai_err.value.code == "UNAUTHORIZED_AUTO_APPROVAL"


def test_illegal_state_transition_raises_error():
    """Illegal jumps (e.g. PROPOSED directly to COMPLETED or EXECUTING) must be rejected."""
    item = ActionItemDTO(
        id="ACT-ILLEGAL-01",
        title="Critical infra change",
        description="Direct jump test",
        action_type="GENERIC",
        status="PROPOSED",
    )
    action_hub.create(item)

    with pytest.raises(TARSException) as exc_info:
        action_hub.transition_action("ACT-ILLEGAL-01", ActionLifecycleState.COMPLETED)
    assert exc_info.value.code == "INVALID_ACTION_STATE_TRANSITION"
    assert exc_info.value.status_code == 400


# ==============================================================================
# 3. DETERMINISTIC POLICY ENGINE & EXECUTION (Points 13, 14)
# ==============================================================================

def test_deterministic_policy_evaluation_allow_and_deny():
    """
    Points 13 & 14: Rules-based evaluation deterministically grants or denies permissions.
    """
    # 1. DEPLOY_STAGING evaluated with ENGINEER role -> ALLOWED
    dec1 = policy_engine.evaluate(
        action_type="DEPLOY_STAGING",
        risk_level="MEDIUM",
        actor_role="ENGINEER",
        actor_clearance="ALL_TEAM",
        parameters={"env": "staging"},
    )
    assert dec1.is_allowed is True
    assert dec1.matching_policy_id == "POL-DEPLOY-STAGING"

    # 2. DEPLOY_PROD evaluated with regular ENGINEER role -> DENIED (requires FOUNDER or LEAD)
    dec2 = policy_engine.evaluate(
        action_type="DEPLOY_PROD",
        risk_level="HIGH",
        actor_role="ENGINEER",
        actor_clearance="ALL_TEAM",
    )
    assert dec2.is_allowed is False
    assert any("Role 'ENGINEER' is not in allowed roles" in r for r in dec2.denial_reasons)

    # 3. DEPLOY_PROD evaluated with FOUNDER role -> ALLOWED
    dec3 = policy_engine.evaluate(
        action_type="DEPLOY_PROD",
        risk_level="HIGH",
        actor_role="FOUNDER",
        actor_clearance="ALL_TEAM",
    )
    assert dec3.is_allowed is True
    assert dec3.matching_policy_id == "POL-DEPLOY-PROD"

    # 4. Action exceeding max permitted risk level -> DENIED
    dec4 = policy_engine.evaluate(
        action_type="DEPLOY_STAGING",
        risk_level="CRITICAL",  # Max for staging is HIGH
        actor_role="ENGINEER",
        actor_clearance="ALL_TEAM",
    )
    assert dec4.is_allowed is False
    assert any("exceeds policy ceiling" in r for r in dec4.denial_reasons)


def test_action_execution_and_receipt_logging():
    """
    Points 4, 145-160: Executing an approved action records an ActionReceipt
    and a SHA-256 audit ledger entry.
    """
    item = ActionItemDTO(
        id="ACT-EXEC-001",
        title="Deploy to Staging Cluster",
        description="Build container 1.0.4",
        action_type="DEPLOY_STAGING",
        status="PROPOSED",
        risk_level="LOW",
        parameters={"image": "tars-core:1.0.4", "replicas": 3},
        rollback_handler={"type": "K8S_ROLLBACK", "target_version": "1.0.3"},
    )
    action_hub.create(item)

    # Attempting to execute unapproved action must fail
    with pytest.raises(TARSException) as not_appr:
        action_hub.execute_action("ACT-EXEC-001", actor_id="BOB_ENG", actor_role="ENGINEER")
    assert not_appr.value.code == "ACTION_NOT_APPROVED"

    # Approve action
    action_hub.transition_action("ACT-EXEC-001", ActionLifecycleState.APPROVED, actor_id="LEAD_ALICE", actor_role="LEAD")

    # Execute action
    receipt = action_hub.execute_action(
        action_id="ACT-EXEC-001",
        actor_id="BOB_ENG",
        actor_role="ENGINEER",
        actor_clearance="ALL_TEAM",
    )
    assert receipt.receipt_id.startswith("RCP-")
    assert receipt.status == "EXECUTED"
    assert receipt.parameters_hash is not None
    assert receipt.audit_block_id is not None
    assert receipt.duration_ms >= 0

    # Verify action record updated to COMPLETED
    executed_item = action_hub.get_by_id("ACT-EXEC-001")
    assert executed_item.status == ActionLifecycleState.COMPLETED

    # Verify audit ledger block was cryptographically chained
    verify_res = audit_ledger.verify_chain("CMP-GENESIS-01")
    assert verify_res["is_valid"] is True


def test_action_compensating_rollback():
    """
    Points 4 & 145-160: Completed action can be rolled back, issuing a rollback receipt
    and updating state to ROLLED_BACK.
    """
    item = ActionItemDTO(
        id="ACT-ROLLBACK-01",
        title="Apply DB indexing migration",
        description="Run migration 004",
        action_type="DB_MIGRATION",
        status="PROPOSED",
        risk_level="HIGH",
        rollback_handler={"sql": "DROP INDEX idx_test_migration;"},
    )
    action_hub.create(item)

    # Approve and execute as FOUNDER
    action_hub.transition_action("ACT-ROLLBACK-01", ActionLifecycleState.APPROVED, actor_id="ALEX_FOUNDER", actor_role="FOUNDER")
    action_hub.execute_action("ACT-ROLLBACK-01", actor_id="ALEX_FOUNDER", actor_role="FOUNDER")

    # Execute rollback
    rb_receipt = action_hub.rollback_action(
        action_id="ACT-ROLLBACK-01",
        actor_id="ALEX_FOUNDER",
        reason="Query performance degraded on primary index",
    )
    assert rb_receipt.status == "ROLLED_BACK"
    assert rb_receipt.rollback_payload == {"sql": "DROP INDEX idx_test_migration;"}
    assert rb_receipt.audit_block_id is not None

    # Verify state updated to ROLLED_BACK
    rolled_back_item = action_hub.get_by_id("ACT-ROLLBACK-01")
    assert rolled_back_item.status == ActionLifecycleState.ROLLED_BACK


# ==============================================================================
# 4. REST API INTEGRATION TESTS (core/routes.py)
# ==============================================================================

def test_rest_api_action_lifecycle_and_execution_pipeline():
    """End-to-end REST API pipeline test covering transition, policy, and execution."""
    # 1. Create proposed action via API
    create_payload = {
        "id": "ACT-REST-001",
        "title": "Migrate Redis Cache",
        "description": "Upgrade Redis cluster memory",
        "action_type": "DEPLOY_STAGING",
        "owner": "DevOps",
        "status": "PROPOSED",
        "parameters": {"memory_mb": 4096},
        "risk_level": "LOW",
    }
    res = client.post("/api/core/action_hub", json=create_payload)
    assert res.status_code == 200

    # 2. Transition to APPROVED via REST
    trans_res = client.post(
        "/api/core/actions/ACT-REST-001/transition",
        json={"target_status": "APPROVED", "actor_id": "ALICE_LEAD", "actor_role": "LEAD"},
    )
    assert trans_res.status_code == 200
    assert trans_res.json()["status"] == "APPROVED"

    # 3. Policy evaluation endpoint
    eval_res = client.post(
        "/api/core/policies/evaluate",
        json={"action_type": "DEPLOY_STAGING", "risk_level": "LOW", "actor_role": "ENGINEER"},
    )
    assert eval_res.status_code == 200
    assert eval_res.json()["is_allowed"] is True

    # 4. Execute action via REST
    exec_res = client.post(
        "/api/core/actions/ACT-REST-001/execute",
        json={"actor_id": "BOB_ENG", "actor_role": "ENGINEER"},
    )
    assert exec_res.status_code == 200
    receipt = exec_res.json()
    assert receipt["status"] == "EXECUTED"
    assert receipt["receipt_id"].startswith("RCP-")

    # 5. Fetch receipts via REST
    receipts_res = client.get("/api/core/actions/ACT-REST-001/receipts")
    assert receipts_res.status_code == 200
    receipts_list = receipts_res.json()
    assert len(receipts_list) > 0
    assert receipts_list[0]["action_id"] == "ACT-REST-001"

    # 6. Fact transition via REST
    fact_res = client.post(
        "/api/core/facts/transition",
        json={
            "entity_type": "ACTION",
            "entity_id": "ACT-REST-001",
            "new_state": "CONFIRMED",
            "actor": "ALICE_LEAD",
        },
    )
    assert fact_res.status_code == 200
    assert fact_res.json()["current_state"] == "CONFIRMED"
