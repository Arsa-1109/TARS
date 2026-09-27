# tests/test_mcp_server.py
"""Unit Tests for Sovereign FastMCP Server (Track 2 - v2.0)."""
import json
import pytest
from apps.api.cortex.mcp_server import (
    mcp,
    tars_check_architectural_invariant,
    tars_query_company_memory,
    tars_get_client_commitments,
    tars_simulate_decision,
)


@pytest.mark.asyncio
async def test_mcp_invariant_check_detects_violation():
    bad_code = "with db.transaction(): requests.post('https://api.stripe.com/v1/charges')"
    result_str = await tars_check_architectural_invariant("services/billing.py", bad_code)
    data = json.loads(result_str)

    assert data["status"] == "BLOCKED"
    assert data["violations_count"] > 0
    assert data["violations"][0]["rule_id"] == "INV-017"


@pytest.mark.asyncio
async def test_mcp_invariant_check_clean_code():
    clean_code = "with db.transaction(): event = Outbox.create(topic='charge')"
    result_str = await tars_check_architectural_invariant("services/billing.py", clean_code)
    data = json.loads(result_str)

    assert data["status"] == "CLEAN"
    assert data["violations_count"] == 0


@pytest.mark.asyncio
async def test_mcp_simulate_decision():
    result_str = await tars_simulate_decision("Delay feature to build custom SAML SSO", delay_days=30, reallocated_devs=2)
    data = json.loads(result_str)

    assert data["runway_impact_months"] < 0
    assert "conflict_warning" in data


@pytest.mark.asyncio
async def test_mcp_get_client_commitments():
    result_str = await tars_get_client_commitments(active_only=True)
    data = json.loads(result_str)

    assert "commitments" in data
    assert len(data["commitments"]) > 0
    assert data["commitments"][0]["client"] == "Acme Corp"
