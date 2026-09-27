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


def test_sync_invariant_and_code_entity(graph_engine):
    """Verify Invariant and CodeEntity nodes can be registered in graph."""
    success_inv = graph_engine.sync_invariant(
        invariant_id="INV-008",
        name="Zero Unencrypted Secrets in Commits",
        rule="git_pre_commit_hook.sh must reject raw API keys or tokens",
        rationale="SOC-2 compliance and customer secret sovereignty",
        adr_ref="ADR-014",
    )
    assert success_inv

    success_code = graph_engine.sync_code_entity(
        entity_id="CODE-PRECOMMIT",
        file_path=".git/hooks/pre-commit",
        symbol_name="verify_zero_secrets",
        entity_type="SCRIPT",
    )
    assert success_code

    stats = graph_engine.get_stats()
    assert stats["nodes"].get("Invariant", 0) >= 1
    assert stats["nodes"].get("CodeEntity", 0) >= 1


def test_expanded_graph_relationships(graph_engine):
    """Verify RELATES_TO, ASSIGNED_TO, and ENFORCES edges."""
    # 1. Document -> Decision (RELATES_TO)
    graph_engine.sync_document(doc_id="DOC-ADR01", title="ADR Document")
    graph_engine.sync_decision(decision_id="DEC-01", title="Use SQLite for Fallback")
    rel_doc = graph_engine.link_document_to_decision("DOC-ADR01", "DEC-01")
    assert rel_doc

    decisions = graph_engine.get_document_decisions("DOC-ADR01")
    assert len(decisions) >= 1
    assert decisions[0]["id"] == "DEC-01"

    # 2. ActionItem -> Document (ASSIGNED_TO)
    graph_engine.sync_action_item(item_id="ACT-99", description="Review spec document")
    rel_act = graph_engine.link_action_to_document("ACT-99", "DOC-ADR01")
    assert rel_act

    # 3. Invariant -> CodeEntity (ENFORCES)
    graph_engine.sync_invariant(invariant_id="INV-001", name="Air Gap Rule", rule="Enet == 0.00 KB")
    graph_engine.sync_code_entity(entity_id="CODE-FIREWALL", file_path="core/firewall.py", symbol_name="block_egress")
    rel_inv = graph_engine.link_invariant_to_code("INV-001", "CODE-FIREWALL")
    assert rel_inv

    invariants = graph_engine.get_invariants_for_code("CODE-FIREWALL")
    assert len(invariants) >= 1
    assert invariants[0]["name"] == "Air Gap Rule"

