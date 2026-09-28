# tests/test_cortex.py
"""Comprehensive Unit Tests for TARS Cortex Engine (Role 2).

Verifies the 4 Killer Rules + Foundational Rules + Kùzu Graph operations.
"""
import time
import pytest
from pathlib import Path
from apps.api.cortex.ast_parser import TarsASTParser
from apps.api.cortex.invariants import InvariantsEngine
from apps.api.cortex.graph import TarsGraph


@pytest.fixture
def parser():
    return TarsASTParser()


@pytest.fixture
def engine():
    return InvariantsEngine()


@pytest.fixture
def graph():
    return TarsGraph()


# =============================================================================
# TEST 1: KILLER RULE 1 - HTTP inside DB Transaction (INV-017)
# =============================================================================
def test_inv_017_http_in_transaction_detected(parser):
    bad_code_py = """
def process_order(user_id, amount):
    with db.transaction():
        user = db.query(User).get(user_id)
        # Antipattern: External payment API inside DB transaction
        response = requests.post("https://api.stripe.com/v1/charges", data={"amount": amount})
        order = Order.create(user=user, charge_id=response.json()["id"])
    return order
"""
    violations = parser.check_http_in_transaction(bad_code_py, "services/order_service.py")
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-017"


def test_inv_017_clean_code_passes(parser):
    clean_code_py = """
def process_order_clean(user_id, amount):
    with db.transaction():
        # Clean: Outbox pattern - write event to DB first
        event = OutboxEvent.create(topic="payment.charge", payload={"amount": amount})
    return event
"""
    violations = parser.check_http_in_transaction(clean_code_py, "services/order_service.py")
    assert len(violations) == 0


# =============================================================================
# TEST 2: KILLER RULE 2 - Parameter Count Mismatch (INV-021)
# =============================================================================
def test_inv_021_parameter_count_mismatch_detected(parser):
    bad_code_py = """
def execute_channel_rules(packet):
    # Channel 291 expects 21 parameters, but only 20 provided
    return interpret_content_channel(
        p1, p2, p3, p4, p5, p6, p7, p8, p9, p10,
        p11, p12, p13, p14, p15, p16, p17, p18, p19, p20
    )
"""
    violations = parser.check_parameter_count_mismatch(bad_code_py, "kernel/interpreter.py")
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-021"
    assert violations[0]["expected_count"] == 21
    assert violations[0]["actual_count"] == 20


# =============================================================================
# TEST 3: KILLER RULE 3 - Pruned Feature Flag Resuscitation (INV-014)
# =============================================================================
def test_inv_014_dormant_flag_detected(parser):
    bad_code_py = """
def route_trade_execution(order):
    # Antipattern: Knight Capital style resuscitation of pruned Power Peg flag
    if config.get("POWER_PEG_ALGO"):
        return execute_dormant_algorithm(order)
    return execute_standard_trade(order)
"""
    pruned_flags = ["POWER_PEG_ALGO", "LEGACY_JWT_LOCALSTORAGE"]
    violations = parser.check_dormant_flag_resuscitation(bad_code_py, "trading/router.py", pruned_flags)
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-014"
    assert "POWER_PEG_ALGO" in violations[0]["flag"]


# =============================================================================
# TEST 4: KILLER RULE 4 - Plaintext Password / Token Logging (INV-008)
# =============================================================================
def test_inv_008_plaintext_password_logging_detected(parser):
    bad_code_py = """
def authenticate_user(email, password):
    user = auth_service.verify(email, password)
    # Antipattern: Twitter/X style plaintext password logging
    logger.info("User login attempt: email=%s, password=%s", email, password)
    return user
"""
    violations = parser.check_plaintext_token_logging(bad_code_py, "auth/login.py")
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-008"


# =============================================================================
# TEST 5: FOUNDATIONAL RULES (INV-004 & INV-001)
# =============================================================================
def test_inv_004_localstorage_token_detected(parser):
    bad_code_ts = """
export function storeAuthSession(token: string) {
    localStorage.setItem('authToken', token);
}
"""
    violations = parser.check_localstorage_token(bad_code_ts, "src/auth/session.ts")
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-004"


def test_inv_001_presentation_db_coupling_detected(parser):
    bad_code_tsx = """
import { prisma } from '@/lib/db';

export default function UserCard({ id }: { id: string }) {
    const user = prisma.user.findUnique({ where: { id } });
    return <div>{user.name}</div>;
}
"""
    violations = parser.check_presentation_db_coupling(bad_code_tsx, "apps/web/components/UserCard.tsx")
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-001"


# =============================================================================
# TEST 6: SUB-50MS LATENCY BUDGET VERIFICATION
# =============================================================================
def test_sub_50ms_evaluation_latency(engine):
    sample_code = """
def transfer_funds(source_id, target_id, amount):
    with db.transaction():
        # Outbox pattern
        event = OutboxEvent.create(topic="funds.transfer", payload={"amt": amount})
    return event
"""
    start = time.perf_counter()
    violations = engine.evaluate_code("services/transfer.py", sample_code)
    elapsed_ms = (time.perf_counter() - start) * 1000

    print(f"\n[LATENCY TEST] AST Diff Scan completed in: {elapsed_ms:.2f}ms")
    assert elapsed_ms < 50.0  # Must be well under the 50ms pre-commit ceiling
    assert len(violations) == 0


# =============================================================================
# TEST 7: KÙZU GRAPH CONTRADICTION ENGINE
# =============================================================================
def test_kuzu_graph_contradiction_check(graph):
    # Add historical decision
    graph.add_decision(
        decision_id="DEC-002",
        title="Session Security Policy",
        category="security/auth",
        context="Prevent XSS leakage and race conditions on tokens",
        chosen_option="Tokens must be stored exclusively in HttpOnly SameSite cookies",
    )

    # Contradictory proposal
    conflict_result = graph.check_contradiction("Refactor auth to store tokens in localStorage for convenience")
    assert conflict_result["has_conflict"] is True
    assert conflict_result["conflicting_decision_id"] == "DEC-002"

    # Non-contradictory proposal
    clean_result = graph.check_contradiction("Add email notification worker with Redis queue")
    assert clean_result["has_conflict"] is False


def test_preseeded_decision_14_and_contradiction_api_endpoint(graph):
    """
    Track 2 Golden Demo State Verification:
    Asserts Decision #14 is pre-seeded in the Kùzu graph and that
    POST /api/cortex/contradiction-check with 'Build bespoke SAML SSO for Acme Corp'
    returns has_conflict=True and conflicting_decision_id='DEC-014'.
    """
    from fastapi.testclient import TestClient
    from apps.api.main import app

    # 1. Assert pre-seeded Decision #14
    decisions = graph.get_all_decisions()
    dec_14 = next((d for d in decisions if d["id"] == "DEC-014"), None)
    assert dec_14 is not None
    assert dec_14["title"] == "Zero enterprise customisations before Q4"
    assert dec_14["category"] == "STRATEGY"
    assert dec_14["status"] == "ACTIVE"

    # 2. Assert pre-seeded Acme Corp commitment
    commitments = graph.get_all_commitments()
    acme_comm = next((c for c in commitments if c.get("client") == "Acme Corp"), None)
    assert acme_comm is not None
    assert "$80,000" in acme_comm.get("value", "") or "$80,000" in acme_comm.get("commitment", "")

    # 3. Test HTTP POST /api/cortex/contradiction-check
    client = TestClient(app)
    res = client.post(
        "/api/cortex/contradiction-check",
        json={"proposal": "Build bespoke SAML SSO for Acme Corp"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["has_conflict"] is True
    assert data["conflicting_decision_id"] == "DEC-014"
    assert "DEC-014" in data["explanation"]

