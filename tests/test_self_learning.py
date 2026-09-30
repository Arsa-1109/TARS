"""
tests/test_self_learning.py
Track 3: Explicit "Teach TARS", Memory Supersession, Telemetry & Scribe Ebbinghaus Suite.
"""

import pytest
import asyncio
import time
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.core.db import db
from apps.api.core.search import search_service
from apps.api.core.scribe import scribe


client = TestClient(app)


@pytest.fixture(autouse=True)
def clean_teach_memories():
    """Purge past teach test records."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM memories WHERE source LIKE 'TEACH:%'")
    cursor.execute("DELETE FROM interaction_logs WHERE event_type IN ('TEACH', 'SEARCH')")
    conn.commit()


def test_teach_tars_endpoint_persists_memory():
    """POST /api/core/teach stores institutional memory and returns status 'LEARNED'."""
    res = client.post("/api/core/teach", json={
        "content": "Our main CI runner uses GitHub Actions with self-hosted runners.",
        "title": "CI/CD Infrastructure",
        "category": "ENGINEERING",
        "clearance": "ALL_TEAM",
        "user_name": "Dr. Elena Rostova",
        "user_role": "CTO"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "LEARNED"
    assert data["title"] == "CI/CD Infrastructure"
    assert data["memory_id"].startswith("MEM-TEACH-")

    # Verify directly in SQLite
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT content, source, clearance FROM memories WHERE id = ?", (data["memory_id"],))
    row = cursor.fetchone()
    assert row is not None
    assert "GitHub Actions" in row["content"]
    assert row["source"] == "TEACH:Dr. Elena Rostova"
    assert row["clearance"] == "ALL_TEAM"


@pytest.mark.asyncio
async def test_taught_memory_retrieval_and_supersession():
    """
    Mandatory prompt test:
    1. Teach: 'Our payment provider is Stripe.'
    2. Search: 'payment provider' -> verify Stripe appears.
    3. Teach: 'We switched from Stripe to Razorpay.'
    4. Search: 'payment provider' -> verify Razorpay ranks first (superseding Stripe).
    """
    # Step 1: Teach Stripe
    res1 = client.post("/api/core/teach", json={
        "content": "Our payment provider is Stripe for credit card checkout.",
        "title": "Payment Provider Configuration",
        "category": "FINANCE",
        "clearance": "ALL_TEAM"
    })
    assert res1.status_code == 200

    # Step 2: Verify Stripe appears in search
    stripe_search = await search_service.search("payment provider")
    assert len(stripe_search) > 0
    assert "Stripe" in stripe_search[0].snippet or "Stripe" in stripe_search[0].doc_title

    # Wait 1 second to ensure distinct timestamp for supersession recency bonus
    await asyncio.sleep(1.0)

    # Step 3: Teach Razorpay switch
    res2 = client.post("/api/core/teach", json={
        "content": "We switched from Stripe to Razorpay for all active enterprise billing.",
        "title": "Active Payment Provider",
        "category": "FINANCE",
        "clearance": "ALL_TEAM"
    })
    assert res2.status_code == 200

    # Step 4: Search again, verify Razorpay is the top-ranked result
    razorpay_search = await search_service.search("payment provider")
    assert len(razorpay_search) > 0
    assert "Razorpay" in razorpay_search[0].snippet or "Razorpay" in razorpay_search[0].doc_title


def test_interaction_telemetry_logging():
    """Verify Teach submissions and searches create audit logs in interaction_logs."""
    client.post("/api/core/teach", json={
        "content": "Office hours are Wednesdays at 2 PM.",
        "title": "Office Hours",
        "clearance": "ALL_TEAM"
    })

    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT event_type, query, response FROM interaction_logs WHERE event_type = 'TEACH'")
    row = cursor.fetchone()
    assert row is not None
    assert row["event_type"] == "TEACH"
    assert "Office Hours" in row["query"]


def test_scribe_ebbinghaus_activation_calculation():
    """Verify Autonomous Scribe calculates decay and reinforcement mathematically."""
    now = int(time.time())
    base_strength = 10.0

    # Fresh memory with 0 repeats
    act_fresh = scribe.calculate_memory_activation(
        base_strength=base_strength,
        initial_timestamp=now,
        access_count=0,
        current_timestamp=now
    )
    assert act_fresh == pytest.approx(10.0, rel=1e-2)

    # Decayed memory after 1 day (86400s)
    act_decayed = scribe.calculate_memory_activation(
        base_strength=base_strength,
        initial_timestamp=now,
        access_count=0,
        current_timestamp=now + 86400
    )
    assert act_decayed < act_fresh
    assert act_decayed == pytest.approx(10.0 * 0.3678, rel=1e-2)

    # Reinforced memory after multiple accesses
    act_reinforced = scribe.calculate_memory_activation(
        base_strength=base_strength,
        initial_timestamp=now,
        access_count=10,
        current_timestamp=now + 86400
    )
    assert act_reinforced > act_decayed
