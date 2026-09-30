import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.cortex.graph import TarsGraph


@pytest.fixture
def graph():
    return TarsGraph()


def test_decisions_create_optimistic_and_fast(graph):
    """Bug 1 / Latency Fix: Creating a decision must return in < 50ms with 201 status."""
    client = TestClient(app)
    res = client.post(
        "/api/cortex/decisions",
        json={
            "title": "Adopt Event-Driven WebSocket Architecture",
            "category": "ENGINEERING",
            "context": "High-concurrency updates require sub-10ms delivery to clients",
            "chosen_option": "Use Redis Pub/Sub backplane with WebSocket connection pool",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["id"].startswith("DEC-")
    assert data["title"] == "Adopt Event-Driven WebSocket Architecture"
    assert data["lifecycle_status"] == "ACTIVE"


def test_decisions_patch_update(graph):
    """Bug 10 / Problem 11: Decisions can be updated via PATCH."""
    client = TestClient(app)

    # 1. Create initial decision
    res = client.post(
        "/api/cortex/decisions",
        json={
            "title": "Use PostgreSQL Connection Pooling",
            "category": "ENGINEERING",
            "context": "Prevent connection starvation",
            "chosen_option": "PgBouncer in transaction mode",
        },
    )
    assert res.status_code == 201
    dec_id = res.json()["id"]

    # 2. Patch the decision
    patch_res = client.patch(
        f"/api/cortex/decisions/{dec_id}",
        json={
            "title": "Use PgBouncer Session Pooling",
            "chosen_option": "PgBouncer in session mode for prepared statement support",
            "lifecycle_status": "ACTIVE",
        },
    )
    assert patch_res.status_code == 200
    patched_data = patch_res.json()
    assert patched_data["title"] == "Use PgBouncer Session Pooling"
    assert "session mode" in patched_data["chosen_option"]


def test_decisions_soft_delete_and_supersede(graph):
    """Bug 10: Decisions can be marked as SUPERSEDED or hard purged."""
    client = TestClient(app)

    # 1. Create initial decision
    res = client.post(
        "/api/cortex/decisions",
        json={
            "title": "Temporary Cloud Logging Strategy",
            "category": "STRATEGY",
            "context": "Fast startup telemetry",
            "chosen_option": "Log directly to standard stdout",
        },
    )
    assert res.status_code == 201
    dec_id = res.json()["id"]

    # 2. Soft-delete (mark superseded)
    del_res = client.delete(f"/api/cortex/decisions/{dec_id}?hard_purge=false&superseded_by=DEC-015")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["status"] == "SUPERSEDED"
    assert del_data["superseded_by"] == "DEC-015"

    # Verify decision still exists in graph but with SUPERSEDED status
    get_res = client.get(f"/api/cortex/decisions/{dec_id}")
    assert get_res.status_code == 200
    assert get_res.json()["lifecycle_status"] == "SUPERSEDED"


def test_simulation_scenario_endpoint():
    """Bug 16: Counterfactual What-If simulation scenario endpoint calculates differential runway and compromised deliverables."""
    client = TestClient(app)
    res = client.post(
        "/api/cortex/simulate/scenario",
        json={
            "scenario_prompt": "What if Acme Corp delays SAML SSO delivery by 30 days?",
            "burn_delta_monthly": 15000.0,
            "timeline_shift_days": 30,
            "devs_reallocated": 2,
        },
    )
    assert res.status_code == 200
    data = res.json()
    assert data["baseline_runway_months"] > 0
    assert data["simulated_runway_months"] > 0
    assert "compromised_clients" in data
    assert "strategic_narrative" in data
    assert "pre_populated_adr" in data
    assert data["pre_populated_adr"]["category"] == "STRATEGY"
