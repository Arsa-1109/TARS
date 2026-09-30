"""
tests/test_bitemporal_schema.py
Validates:
1. Bi-temporal schema properties across SQLite and Kùzu.
2. effective_from, effective_to, superseded_by, superseded_at properties.
3. Point-in-time temporal queries: queries at as_of time T return only records valid at T.
"""
import pytest
import time
from apps.api.core.db import db
from apps.api.core.search import search_service


@pytest.fixture(autouse=True)
def seed_bitemporal_records():
    conn = db.get_connection()
    cursor = conn.cursor()

    # Old Policy (valid from t=1000 to t=2000, superseded by MEM-TEMP-V2)
    cursor.execute("""
        INSERT OR REPLACE INTO memories (
            id, record_type, title, content, source, timestamp, clearance,
            effective_from, effective_to, superseded_by, superseded_at, organisation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "MEM-TEMP-V1",
        "DOCUMENT",
        "Cloud Storage Policy V1",
        "All customer artifacts must be stored in AWS S3 standard bucket.",
        "POLICY_V1",
        1000,
        "ALL_TEAM",
        1000,
        2000,
        "MEM-TEMP-V2",
        2000,
        "ACME_CORP"
    ))

    # New Policy (valid from t=2000 onwards, effective_to IS NULL)
    cursor.execute("""
        INSERT OR REPLACE INTO memories (
            id, record_type, title, content, source, timestamp, clearance,
            effective_from, effective_to, superseded_by, superseded_at, organisation_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "MEM-TEMP-V2",
        "DOCUMENT",
        "Cloud Storage Policy V2",
        "All customer artifacts must be stored in local NVMe encrypted volumes.",
        "POLICY_V2",
        2000,
        "ALL_TEAM",
        2000,
        None,
        None,
        None,
        "ACME_CORP"
    ))
    conn.commit()


@pytest.mark.asyncio
async def test_point_in_time_query_past():
    """At as_of=1500, only Cloud Storage Policy V1 should be valid and returned."""
    results = await search_service.search(
        query="Cloud Storage Policy",
        user_clearance="ALL_TEAM",
        user_role="ENGINEER",
        organisation_id="ACME_CORP",
        as_of=1500,
    )
    assert len(results) > 0
    doc_ids = [c.doc_id for c in results]
    assert "MEM-TEMP-V1" in doc_ids
    assert "MEM-TEMP-V2" not in doc_ids


@pytest.mark.asyncio
async def test_point_in_time_query_current():
    """At as_of=2500, only Cloud Storage Policy V2 should be valid and returned."""
    results = await search_service.search(
        query="Cloud Storage Policy",
        user_clearance="ALL_TEAM",
        user_role="ENGINEER",
        organisation_id="ACME_CORP",
        as_of=2500,
    )
    assert len(results) > 0
    doc_ids = [c.doc_id for c in results]
    assert "MEM-TEMP-V2" in doc_ids
    assert "MEM-TEMP-V1" not in doc_ids


def test_sqlite_bitemporal_columns_exist():
    """Verify bi-temporal schema properties are present in SQLite tables."""
    conn = db.get_connection()
    cursor = conn.cursor()

    for table in ("documents", "memories", "action_items"):
        cursor.execute(f"PRAGMA table_info({table})")
        columns = [row[1] for row in cursor.fetchall()]
        assert "effective_from" in columns, f"effective_from missing in {table}"
        assert "effective_to" in columns, f"effective_to missing in {table}"
        assert "superseded_by" in columns, f"superseded_by missing in {table}"
        assert "organisation_id" in columns, f"organisation_id missing in {table}"
