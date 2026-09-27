# tests/test_ingestion/test_kuzu_sync.py
"""
Unit tests for embedded Kùzu graph engine, nodes, and temporal [:SUPERSEDES] edges.
"""
import os
import tempfile
import pytest

from apps.api.ingestion.kuzu_sync import KuzuGraphEngine


@pytest.fixture
def graph_engine():
    import shutil
    temp_dir = tempfile.mkdtemp()
    db_path = os.path.join(temp_dir, "graph.kuzu")
    engine = KuzuGraphEngine(db_path=db_path, read_only=False)
    yield engine
    try:
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception:
        pass


def test_sync_document_node(graph_engine):
    success = graph_engine.sync_document(
        doc_id="DOC-99AA11",
        title="Architecture Decision Record 001",
        department="ENGINEERING",
        clearance="ALL_TEAM",
    )
    assert success
    stats = graph_engine.get_stats()
    assert stats["nodes"].get("Document", 0) >= 1


def test_sync_client_call_and_action_item(graph_engine):
    call_id = "CALL-TEST101"
    success_call = graph_engine.sync_client_call(
        call_id=call_id,
        client_name="Acme Health",
        sentiment="POSITIVE",
        audio_path="drop/call_01.wav",
        transcript_summary="Discussion on HIPAA compliance.",
    )
    assert success_call

    success_action = graph_engine.sync_action_item(
        item_id="ACT-01",
        description="Send HIPAA security whitepaper to Acme Health",
        owner="Sales Lead",
        status="OPEN",
        source_type="CLIENT_CALL",
        source_id=call_id,
        timestamp_offset="01:15",
    )
    assert success_action

    stats = graph_engine.get_stats()
    assert stats["nodes"].get("ClientCall", 0) >= 1
    assert stats["nodes"].get("ActionItem", 0) >= 1


def test_supersedes_temporal_relationship(graph_engine):
    """
    Verify that when Decision B supersedes Decision A, the temporal edge
    is created and Decision A is marked as SUPERSEDED.
    """
    # 1. First decision: Use REST API
    graph_engine.sync_decision(
        decision_id="ADR-001",
        title="Use REST for external endpoints",
        category="ARCHITECTURE",
        status="ACTIVE",
        context="Simpler to set up for MVP",
        chosen_option="REST",
        timestamp=1000,
    )

    # 2. Second decision superseding the first: Upgrade to gRPC
    graph_engine.sync_decision(
        decision_id="ADR-002",
        title="Adopt gRPC for internal service communications",
        category="ARCHITECTURE",
        status="ACTIVE",
        context="Latency reduction required",
        chosen_option="gRPC",
        timestamp=2000,
        supersedes_id="ADR-001",
        supersedes_reason="High throughput requirements",
    )

    # 3. Traverse superseded history from ADR-002
    chain = graph_engine.get_superseded_chain("ADR-002")
    assert len(chain) == 1
    assert chain[0]["id"] == "ADR-001"
    assert chain[0]["status"] == "SUPERSEDED"


def test_graph_stats_structure(graph_engine):
    stats = graph_engine.get_stats()
    assert "engine" in stats
    assert "nodes" in stats
    assert "edges" in stats
