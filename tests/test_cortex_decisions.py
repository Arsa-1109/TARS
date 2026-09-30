import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.cortex.graph import TarsGraph


@pytest.fixture
def graph():
    return TarsGraph()


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
    Track 2 / Track 1 Golden Demo State Verification:
    Asserts Decision #14 is pre-seeded in the Kùzu graph and that
    POST /api/cortex/contradiction-check with 'Build bespoke SAML SSO for Acme Corp'
    returns has_conflict=True and conflicting_decision_id='DEC-014'.
    """
    client = TestClient(app)

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
    res = client.post(
        "/api/cortex/contradiction-check",
        json={"proposal": "Build bespoke SAML SSO for Acme Corp"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["has_conflict"] is True
    assert data["conflicting_decision_id"] == "DEC-014"
    assert "DEC-014" in data["explanation"]
