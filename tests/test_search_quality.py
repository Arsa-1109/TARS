"""
tests/test_search_quality.py
Track 3: Search Quality, Joel's "hi" Failure, Deduplication & Federated Kùzu Decision Search.
"""

import pytest
import asyncio
from unittest.mock import patch, AsyncMock
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.core.db import db
from apps.api.core.search import search_service
from apps.api.cortex.graph import TarsGraph


client = TestClient(app)


@pytest.fixture(autouse=True)
def setup_search_quality_fixtures():
    """Seeds test memories with substrings containing 'hi'."""
    conn = db.get_connection()
    cursor = conn.cursor()

    # Seed documents containing substring "hi" inside words (Historical, Whitepaper, This, Architecture)
    cursor.execute('''
        INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "MEM-SUBSTRING-TEST-1",
        "DOCUMENT",
        "AetherFlow Technical Whitepaper",
        "This architectural specification describes our historical distributed microservice topology.",
        "WHITEPAPER",
        1790740000,
        "whitepaper,architecture",
        "ALL_TEAM"
    ))

    # Seed duplicate chunks of the same title
    cursor.execute('''
        INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "MEM-DUP-1",
        "DOCUMENT",
        "Policy Pricing 2026",
        "Enterprise usage-based pricing schedule and customer billing thresholds chunk 1.",
        "PRICING",
        1790741000,
        "pricing,policy",
        "ALL_TEAM"
    ))
    cursor.execute('''
        INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        "MEM-DUP-2",
        "DOCUMENT",
        "Policy Pricing 2026",
        "Enterprise usage-based pricing schedule and customer billing thresholds chunk 2.",
        "PRICING",
        1790742000,
        "pricing,policy",
        "ALL_TEAM"
    ))
    conn.commit()


@pytest.mark.asyncio
async def test_word_boundary_short_token_hi():
    """Whole-word matching: 'hi' must NOT match 'Whitepaper', 'This', 'Historical', or 'Architecture'."""
    results = await search_service.search("hi")
    matching_titles = [r.doc_title for r in results]
    assert "AetherFlow Technical Whitepaper" not in matching_titles
    assert len(results) == 0


def test_conversational_greeting_interception():
    """Greetings ('hi', 'hello', 'hey') must return direct conversational greeting with 0 citations."""
    greetings = ["hi", "hello", "hey", "good morning"]
    for g in greetings:
        res = client.post("/api/core/search", json={"query": g, "user_name": "Joel"})
        assert res.status_code == 200
        data = res.json()
        assert len(data["citations"]) == 0, f"Greeting '{g}' must not return document citations"
        assert "Hello Joel!" in data["answer"] or "I am TARS" in data["answer"]
        assert data["latency_ms"] < 25.0


@pytest.mark.asyncio
async def test_citation_deduplication():
    """Duplicate document chunks with identical doc_title must be deduplicated to 1 citation."""
    results = await search_service.search("pricing schedule billing")
    titles = [r.doc_title for r in results]
    pricing_count = sum(1 for t in titles if "Policy Pricing 2026" in t)
    assert pricing_count <= 1, "Duplicate chunks for Policy Pricing 2026 must be deduplicated"


@pytest.mark.asyncio
async def test_federated_kuzu_decision_search():
    """Federated search: Kùzu decisions must be searchable and returned in citations."""
    graph = TarsGraph()
    graph.add_decision(
        decision_id="DEC-FED-TEST",
        title="Migrate Payment Engine to Razorpay",
        category="STRATEGY",
        context="We switched from legacy Stripe to Razorpay for international latency optimization.",
        chosen_option="Adopt Razorpay across all payment flows.",
        clearance="ALL_TEAM"
    )

    results = await search_service.search("Razorpay payment")
    assert len(results) > 0
    decision_citations = [r for r in results if "DEC-FED-TEST" in r.doc_id or "Razorpay" in r.doc_title]
    assert len(decision_citations) > 0
    assert "Decision:" in decision_citations[0].doc_title or "Razorpay" in decision_citations[0].doc_title


def test_truthful_ollama_outage_behavior():
    """When Ollama is unavailable, response must truthfully state local AI is offline without fake Company Answer."""
    with patch("apps.api.core.ollama_client.ollama_client.is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = False
        res = client.post("/api/core/search", json={
            "query": "pricing schedule",
            "user_name": "Test User"
        })
        assert res.status_code == 200
        data = res.json()
        assert "Local AI unavailable — Ollama is not running" in data["answer"]
