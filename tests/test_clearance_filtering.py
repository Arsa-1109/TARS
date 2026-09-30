"""
tests/test_clearance_filtering.py
Validates:
1. Server-authoritative clearance and multi-tenant isolation pushed into candidate generation.
2. Zero leakage of EXECUTIVE_ONLY and CONFIDENTIAL documents to non-executive users.
3. Multi-tenant isolation: Organization A users never retrieve Organization B records.
"""
import pytest
from apps.api.core.db import db
from apps.api.core.search import search_service


@pytest.fixture(autouse=True)
def seed_multi_tenant_clearance_fixtures():
    conn = db.get_connection()
    cursor = conn.cursor()

    # Tenant A - Executive document
    cursor.execute("""
        INSERT OR REPLACE INTO memories (
            id, record_type, title, content, source, timestamp, clearance, organisation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "MEM-TENANT-A-EXEC",
        "DOCUMENT",
        "Tenant A M&A Acquisition Strategy",
        "Confidential acquisition target: Buy Competitor X for $50M cash.",
        "ACQ_MEMO",
        1790000000,
        "EXECUTIVE_ONLY",
        "TENANT_A"
    ))

    # Tenant A - All Team document
    cursor.execute("""
        INSERT OR REPLACE INTO memories (
            id, record_type, title, content, source, timestamp, clearance, organisation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "MEM-TENANT-A-TEAM",
        "DOCUMENT",
        "Tenant A Onboarding Guide",
        "Welcome to Tenant A engineering team. Set up your dev environment.",
        "ONBOARDING",
        1790000000,
        "ALL_TEAM",
        "TENANT_A"
    ))

    # Tenant B - All Team document
    cursor.execute("""
        INSERT OR REPLACE INTO memories (
            id, record_type, title, content, source, timestamp, clearance, organisation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "MEM-TENANT-B-TEAM",
        "DOCUMENT",
        "Tenant B Product Roadmap",
        "Confidential product roadmap for Tenant B customers only.",
        "ROADMAP_B",
        1790000000,
        "ALL_TEAM",
        "TENANT_B"
    ))
    conn.commit()


@pytest.mark.asyncio
async def test_executive_clearance_filtering():
    """Non-executive user in Tenant A must NEVER see Tenant A executive memo in candidates."""
    results = await search_service.search(
        query="Acquisition Strategy Competitor",
        user_clearance="ALL_TEAM",
        user_role="ENGINEER",
        organisation_id="TENANT_A"
    )
    doc_ids = [c.doc_id for c in results]
    assert "MEM-TENANT-A-EXEC" not in doc_ids

    # Founder/Executive MUST see Tenant A executive memo
    exec_results = await search_service.search(
        query="Acquisition Strategy Competitor",
        user_clearance="EXECUTIVE_ONLY",
        user_role="FOUNDER",
        organisation_id="TENANT_A"
    )
    exec_doc_ids = [c.doc_id for c in exec_results]
    assert "MEM-TENANT-A-EXEC" in exec_doc_ids


@pytest.mark.asyncio
async def test_multi_tenant_isolation_boundary():
    """Tenant A query must never retrieve Tenant B records even if clearance is ALL_TEAM."""
    results = await search_service.search(
        query="Product Roadmap",
        user_clearance="ALL_TEAM",
        user_role="ENGINEER",
        organisation_id="TENANT_A"
    )
    doc_ids = [c.doc_id for c in results]
    assert "MEM-TENANT-B-TEAM" not in doc_ids
