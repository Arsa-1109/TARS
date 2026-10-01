# tests/test_strategic_advisor_isolation.py
"""
Test suite for multi-tenant isolation of Strategic Recommendations & Growth Radar.
Ensures zero cross-tenant contamination between AetherFlow and other tenants (e.g. Verdant).
"""
import pytest
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.core.db import db
from apps.api.core.strategic_advisor import strategic_advisor


@pytest.fixture
def client():
    return TestClient(app)


def test_strategic_recommendations_schema_tenant_partitioning():
    """Verify that strategic_recommendations table has company_name and organisation_id columns and indexes."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA table_info(strategic_recommendations)")
    columns = {row["name"]: row["type"] for row in cursor.fetchall()}

    assert "company_name" in columns, "strategic_recommendations missing company_name column"
    assert "organisation_id" in columns, "strategic_recommendations missing organisation_id column"

    # Check for tenant indexing
    cursor.execute("PRAGMA index_list(strategic_recommendations)")
    indices = [row["name"] for row in cursor.fetchall()]
    assert any("company" in idx for idx in indices), "Missing index on company_name"
    assert any("org" in idx for idx in indices), "Missing index on organisation_id"


def test_strategic_advisor_aetherflow_isolation():
    """Verify that querying AetherFlow recommendations returns only AetherFlow data, never Verdant data."""
    recs = strategic_advisor.list_recommendations(status="ACTIVE", company_name="AetherFlow Technologies, Inc.")
    assert len(recs) > 0, "Expected active recommendations for AetherFlow"

    for r in recs:
        assert r["company_name"] == "AetherFlow" or "AetherFlow" in r["company_name"]
        assert r["organisation_id"] == "CMP-GENESIS-01"
        # Zero cross-tenant leakage of Verdant domain facts
        assert "fssai" not in r["title"].lower(), f"Leaked FSSAI in title: {r['title']}"
        assert "fssai" not in r["rationale"].lower(), f"Leaked FSSAI in rationale: {r['rationale']}"
        assert "cold-chain" not in r["title"].lower(), f"Leaked cold-chain in title: {r['title']}"
        assert "verdant" not in r["title"].lower(), f"Leaked Verdant in title: {r['title']}"
        assert "verdant" not in r["rationale"].lower(), f"Leaked Verdant in rationale: {r['rationale']}"


def test_strategic_advisor_verdant_isolation():
    """Verify that querying Verdant recommendations returns only Verdant data, never AetherFlow data."""
    recs = strategic_advisor.list_recommendations(status="ACTIVE", company_name="Verdant")
    assert len(recs) > 0, "Expected active recommendations for Verdant"

    for r in recs:
        assert r["company_name"] == "Verdant" or "Verdant" in r["company_name"]
        assert r["organisation_id"] == "CMP-F357B89B"
        # Zero cross-tenant leakage of AetherFlow domain facts
        assert "saml" not in r["title"].lower(), f"Leaked SAML in title: {r['title']}"
        assert "bdr-018" not in r["title"].lower(), f"Leaked BDR-018 in title: {r['title']}"
        assert "inv-017" not in r["title"].lower(), f"Leaked INV-017 in title: {r['title']}"
        assert "aetherflow" not in r["title"].lower(), f"Leaked AetherFlow in title: {r['title']}"
        assert "aetherflow" not in r["rationale"].lower(), f"Leaked AetherFlow in rationale: {r['rationale']}"


def test_core_api_recommendations_tenant_isolation(client):
    """Verify GET /api/core/decisions/recommendations strictly isolates results by tenant header and query."""
    # 1. Query with AetherFlow in query param
    res_aether = client.get("/api/core/decisions/recommendations?company_name=AetherFlow%20Technologies,%20Inc.")
    assert res_aether.status_code == 200
    aether_items = res_aether.json()
    assert len(aether_items) > 0
    for item in aether_items:
        assert "FSSAI" not in item["title"]
        assert "Verdant" not in item["title"]

    # 2. Query with Verdant in Header
    res_verdant = client.get("/api/core/decisions/recommendations", headers={"X-Company-Name": "Verdant"})
    assert res_verdant.status_code == 200
    verdant_items = res_verdant.json()
    assert len(verdant_items) > 0
    for item in verdant_items:
        assert "SAML" not in item["title"]
        assert "AetherFlow" not in item["title"]


def test_cortex_api_recommendations_tenant_isolation(client):
    """Verify GET /api/cortex/decisions/recommendations strictly isolates results by tenant header and query."""
    # AetherFlow query
    res_aether = client.get("/api/cortex/decisions/recommendations?company_name=AetherFlow")
    assert res_aether.status_code == 200
    aether_items = res_aether.json()
    assert len(aether_items) > 0
    for item in aether_items:
        assert "FSSAI" not in item["title"]

    # Verdant query
    res_verdant = client.get("/api/cortex/decisions/recommendations?company_name=Verdant")
    assert res_verdant.status_code == 200
    verdant_items = res_verdant.json()
    assert len(verdant_items) > 0
    for item in verdant_items:
        assert "SAML" not in item["title"]


def test_fallback_domain_recommendations_for_unknown_company():
    """Verify that a brand new company receives domain-appropriate fallback advice without leaking existing tenant records."""
    new_company = "Helios Quantum Labs"
    recs = strategic_advisor.list_recommendations(status="ACTIVE", company_name=new_company)
    assert len(recs) > 0

    for r in recs:
        assert r["company_name"] == new_company
        # Must not contain Verdant or AetherFlow bespoke details
        assert "fssai" not in r["title"].lower()
        assert "verdant" not in r["title"].lower()
        assert "saml exception" not in r["title"].lower()
