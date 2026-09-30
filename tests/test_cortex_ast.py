# tests/test_cortex_ast.py
"""Dedicated Unit Test Suite for Track 4: Platform AST Parser & Sentinel Invariants.

Verifies deterministic Tree-sitter AST queries, context manager scoping (with and async with),
foundational architecture rules, and the sub-50ms execution latency budget.
"""
import time
import pytest
from apps.api.cortex.ast_parser import TarsASTParser
from apps.api.cortex.invariants import InvariantsEngine


@pytest.fixture
def parser():
    return TarsASTParser()


@pytest.fixture
def engine():
    return InvariantsEngine()


# =============================================================================
# TEST 1: KILLER RULE 1 (Sync Scope) - HTTP inside DB Transaction (INV-017)
# =============================================================================
def test_inv_017_sync_with_transaction_detected(parser):
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


# =============================================================================
# TEST 2: KILLER RULE 1 (Async Scope) - Async With DB Transaction (INV-017)
# =============================================================================
def test_inv_017_async_with_transaction_detected(parser):
    bad_code_py = """
async def process_async_order(user_id, amount):
    async with db.transaction():
        user = await db.query(User).get(user_id)
        # Antipattern: Async external HTTP call inside async transaction scope
        res = await httpx.post("https://api.external.com/v1/charge", json={"amount": amount})
        order = await Order.create(user=user, charge_id=res.json()["id"])
    return order
"""
    violations = parser.check_http_in_transaction(bad_code_py, "apps/api/core/routes.py")
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-017"


# =============================================================================
# TEST 3: KILLER RULE 1 - Clean Outbox Pattern Passes Cleanly
# =============================================================================
def test_inv_017_clean_outbox_pattern_passes(parser):
    clean_code_py = """
def process_order_clean(user_id, amount):
    with db.transaction():
        # Clean: Outbox pattern - persist event to database outbox table
        event = OutboxEvent.create(topic="payment.charge", payload={"amount": amount})
    return event
"""
    violations = parser.check_http_in_transaction(clean_code_py, "apps/api/core/routes.py")
    assert len(violations) == 0


# =============================================================================
# TEST 4: Outbox Pattern Helper Function Method
# =============================================================================
def test_check_outbox_pattern_method_support(parser):
    code_with_http = """
async def handle_checkout():
    async with db.transaction():
        await stripe.charges.create(amount=100)
"""
    violations = parser.check_outbox_pattern(code_with_http, "services/checkout.py")
    assert len(violations) == 1
    assert violations[0]["rule_id"] == "INV-017"


# =============================================================================
# TEST 5: KILLER RULE 2 - Parameter Count Mismatch (INV-021)
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
# TEST 6: KILLER RULE 3 - Pruned Feature Flag Resuscitation (INV-014)
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
# TEST 7: KILLER RULE 4 - Plaintext Password / Token Logging (INV-008)
# =============================================================================
def test_inv_008_plaintext_password_logging_detected(parser):
    bad_code_py = """
def authenticate_user(email, password):
    user = auth_service.verify(email, password)
    # Antipattern: Plaintext password logging
    logger.info("User login attempt: email=%s, password=%s", email, password)
    return user
"""
    violations = parser.check_plaintext_token_logging(bad_code_py, "auth/login.py")
    assert len(violations) > 0
    assert violations[0]["rule_id"] == "INV-008"


# =============================================================================
# TEST 8: FOUNDATIONAL RULE - LocalStorage Token Invariant (INV-004)
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


# =============================================================================
# TEST 9: FOUNDATIONAL RULE - Presentation DB Direct Coupling (INV-001)
# =============================================================================
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
# TEST 10: SUB-50MS LATENCY BUDGET VERIFICATION
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
    violations = engine.evaluate_code("apps/api/core/routes.py", sample_code)
    elapsed_ms = (time.perf_counter() - start) * 1000

    print(f"\n[LATENCY TEST] AST Diff Scan completed in: {elapsed_ms:.2f}ms")
    assert elapsed_ms < 50.0  # Must be well under the 50ms pre-commit ceiling
    assert len(violations) == 0
