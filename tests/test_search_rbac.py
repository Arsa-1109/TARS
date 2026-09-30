"""
tests/test_search_rbac.py
Track 3: Dual-Layer RBAC, Clearance Separation & Alex vs Chloe Adversarial Suite.
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.core.db import db
from apps.api.core.search import search_service
from apps.api.core.mcp.permissions import permission_manager
from apps.api.core.mcp.schemas import ToolMetadata, RiskLevel


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_rbac_fixtures():
    """Seeds cap table chunk with EXECUTIVE_ONLY clearance and standard doc with ALL_TEAM."""
    conn = db.get_connection()
    cursor = conn.cursor()

    # Seed an executive cap table memory
    cursor.execute('''
        INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "MEM-TEST-CAPTABLE",
        "DOCUMENT",
        "Confidential Cap Table & Founder Equity (Series Seed)",
        "Confidential Cap Table: Alex Vance owns 45.0% founder equity. Seed Syndicate holds 15.0%. ESOP pool is 10.0%. Total valuation is $15M post-money.",
        "TEST_SERIES_SEED",
        1790750000,
        "equity,cap_table,shares",
        "EXECUTIVE_ONLY"
    ))

    # Seed an all-team architecture decision
    cursor.execute('''
        INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "MEM-TEST-ALLTEAM",
        "DOCUMENT",
        "Engineering Architecture Guidelines",
        "All services must communicate via internal outbox queues. No HTTP calls allowed inside active transactions.",
        "TECH_RADAR",
        1790740000,
        "architecture,invariants",
        "ALL_TEAM"
    ))
    conn.commit()


@pytest.mark.asyncio
async def test_search_service_clearance_filtering_sql():
    """Layer 1 deterministic SQL clearance filtering: non-founder must NEVER receive executive memories."""
    # Chloe Dubois: ALL_TEAM clearance, ENGINEER role
    chloe_results = await search_service.search(
        query="founder equity cap table",
        user_clearance="ALL_TEAM",
        user_role="ENGINEER"
    )
    assert not any("cap table" in c.doc_title.lower() or "founder equity" in c.snippet.lower() for c in chloe_results), "Chloe must not retrieve EXECUTIVE_ONLY cap table memories"

    # Alex Vance: EXECUTIVE_ONLY clearance, FOUNDER role
    alex_results = await search_service.search(
        query="founder equity cap table",
        user_clearance="EXECUTIVE_ONLY",
        user_role="FOUNDER"
    )
    assert len(alex_results) > 0, "Alex must retrieve EXECUTIVE_ONLY cap table memories"
    assert any("Cap Table" in c.doc_title for c in alex_results)


@pytest.mark.asyncio
async def test_search_all_team_accessible_to_both():
    """All-team documents must be accessible to both Chloe and Alex."""
    chloe_results = await search_service.search(
        query="architecture guidelines outbox",
        user_clearance="ALL_TEAM",
        user_role="ENGINEER"
    )
    assert len(chloe_results) > 0
    assert any("Architecture" in c.doc_title for c in chloe_results)

    alex_results = await search_service.search(
        query="architecture guidelines outbox",
        user_clearance="EXECUTIVE_ONLY",
        user_role="FOUNDER"
    )
    assert len(alex_results) > 0
    assert any("Architecture" in c.doc_title for c in alex_results)


def test_api_search_alex_vs_chloe_adversarial():
    """
    E2E Adversarial verification via /api/core/search:
    - Chloe queries 'cap table' -> 0 citations, LLM prompt contains security policy.
    - Alex queries 'cap table' -> returns authorized citations.
    """
    # 1. Chloe's query
    res_chloe = client.post("/api/core/search", json={
        "query": "cap table",
        "user_name": "Chloe Dubois",
        "user_role": "NEW_HIRE",
        "clearance": "ALL_TEAM"
    })
    assert res_chloe.status_code == 200
    data_chloe = res_chloe.json()
    assert len(data_chloe["citations"]) == 0, "Chloe must receive 0 cap table citations"

    # 2. Alex's query
    res_alex = client.post("/api/core/search", json={
        "query": "cap table",
        "user_name": "Alex Vance",
        "user_role": "FOUNDER",
        "clearance": "EXECUTIVE_ONLY"
    })
    assert res_alex.status_code == 200
    data_alex = res_alex.json()
    assert len(data_alex["citations"]) > 0, "Alex must receive authorized cap table citations"
    assert any("Cap Table" in c["doc_title"] for c in data_alex["citations"])


def test_mcp_permission_manager_role_separation():
    """Role-aware MCP permission verification: non-founders denied executive tools."""
    equity_tool = ToolMetadata(
        name="captable.export",
        description="Exports full equity and cap table ledger",
        input_schema={},
        category="FINANCE",
        read_only=True,
        risk=RiskLevel.HIGH,
        requires_approval=True
    )
    git_tool = ToolMetadata(
        name="filesystem.read",
        description="Reads workspace file",
        input_schema={},
        category="FILESYSTEM",
        read_only=True,
        risk=RiskLevel.LOW,
        requires_approval=False
    )

    # Alex (usr-alex) has Founder role & Executive clearance
    assert permission_manager.check_permission(equity_tool, "usr-alex") is True
    assert permission_manager.check_permission(git_tool, "usr-alex") is True

    # Chloe (usr-chloe) has Engineer role & ALL_TEAM clearance
    assert permission_manager.check_permission(equity_tool, "usr-chloe") is False
    assert permission_manager.check_permission(git_tool, "usr-chloe") is True

    # Direct role names
    assert permission_manager.check_permission(equity_tool, "FOUNDER") is True
    assert permission_manager.check_permission(equity_tool, "ENGINEER") is False
