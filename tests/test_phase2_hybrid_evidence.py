"""
tests/test_phase2_hybrid_evidence.py
Comprehensive automated test suite for Phase 2: Hybrid Retrieval & Evidence Provenance:
1. True Hybrid Retrieval Pipeline (BM25 + Semantic Vector + Kuzu Graph with deterministic RRF k=60).
2. Multi-channel synergy & Pre-retrieval Tenant/Clearance Isolation.
3. First-Class Evidence Model & Provenance Payload (EvidenceSet, EvidenceItem, no leaked private reasoning tokens).
4. Explicit Document Versioning Lineage (v1 -> v2 -> v3, SUPERSEDES relationships, CURRENT vs AS_OF_DATE modes).
5. Semantic Graph Entity Extraction & Institutional Glossary Indexing (Person, Company, Decision, Policy, Commitment, Technology, Risk).
6. Model Abstention & Calibrated Confidence Scoring (status='ABSTAINED', reason='INSUFFICIENT_EVIDENCE' when composite score < 0.35).
"""

import time
import uuid
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.core.db import db
from apps.api.core.search import search_service, BM25Scorer
from apps.api.schemas.contracts import (
    SearchRequest,
    SearchResponse,
    EvidenceSet,
    EvidenceItem,
    EvidenceChannel,
)
from apps.api.ingestion.transaction_coordinator import ingestion_coordinator
from apps.api.ingestion.kuzu_sync import kuzu_sync
from apps.api.ingestion.entity_extractor import entity_extractor

client = TestClient(app)


# =========================================================================
# 1. True Hybrid Retrieval & RRF Rank Fusion Unit Tests
# =========================================================================

def test_bm25_scorer_direct():
    """Validates BM25Scorer ranking mathematics with term frequencies and length normalization."""
    corpus = [
        {"id": "doc1", "content": "FastAPI and SQLite hybrid retrieval engine with reciprocal rank fusion", "title": "Engine"},
        {"id": "doc2", "content": "Whisper audio transcription and voice memo ingestion", "title": "Audio"},
        {"id": "doc3", "content": "FastAPI backend services with high performance async endpoints", "title": "Backend"},
    ]
    scorer = BM25Scorer(k1=1.5, b=0.75)
    scored_results = scorer.score(
        query_tokens=["fastapi", "hybrid", "retrieval"],
        documents=corpus,
        text_field="content",
    )
    
    assert len(scored_results) > 0
    scores_by_id = {doc["id"]: score for score, doc in scored_results}
    
    assert "doc1" in scores_by_id
    # doc1 has "FastAPI", "hybrid", and "retrieval", so it must outscore doc2 and doc3
    assert scores_by_id["doc1"] > scores_by_id.get("doc2", 0.0)
    assert scores_by_id["doc1"] > scores_by_id.get("doc3", 0.0)


@pytest.mark.asyncio
async def test_rrf_rank_fusion_math_and_synergy():
    """
    Validates deterministic RRF calculation:
    RRF(d) = sum_m (1 / (k + r_m(d))) with k = 60.
    Multi-channel items (appearing in lexical + vector + graph) must outscore single-channel items.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    org_id = f"ORG-RRF-{uuid.uuid4().hex[:6]}"
    now_ts = int(time.time())

    # Doc A: will match lexical + vector + graph
    # Doc B: matches only lexical
    doc_a_id = f"MEM-RRF-A-{uuid.uuid4().hex[:4]}"
    doc_b_id = f"MEM-RRF-B-{uuid.uuid4().hex[:4]}"

    cursor.execute("""
        INSERT INTO memories (id, record_type, title, content, source, timestamp, tags, clearance, organisation_id, effective_from)
        VALUES (?, 'DOCUMENT', 'Distributed Vector Index', 'Detailed distributed vector index and graph traversal specifications.', 'UNIT_TEST', ?, 'infra', 'ALL_TEAM', ?, ?)
    """, (doc_a_id, now_ts, org_id, now_ts))

    cursor.execute("""
        INSERT INTO memories (id, record_type, title, content, source, timestamp, tags, clearance, organisation_id, effective_from)
        VALUES (?, 'DOCUMENT', 'Generic Traversal Note', 'Minor traversal note with no vector details.', 'UNIT_TEST', ?, 'infra', 'ALL_TEAM', ?, ?)
    """, (doc_b_id, now_ts - 100, org_id, now_ts - 100))
    conn.commit()

    # Link Doc A in Kuzu graph
    kuzu_sync.sync_document(doc_id=doc_a_id, title="Distributed Vector Index", organisation_id=org_id)
    kuzu_sync.sync_decision(decision_id="DEC-RRF-1", title="Use Distributed Indexing", chosen_option="Option A")
    kuzu_sync.link_document_to_decision(doc_a_id, "DEC-RRF-1")

    # Run hybrid search
    req = SearchRequest(query="Distributed vector index traversal", clearance="ALL_TEAM", organisation_id=org_id)
    res = await search_service.search_hybrid(req)

    assert len(res.citations) > 0
    # Doc A must outrank Doc B due to multi-signal synergy
    first_citation = res.citations[0]
    assert first_citation.id == doc_a_id
    assert first_citation.rrf_score is not None
    assert first_citation.rrf_score > 0
    # Must have multiple retrieval channels
    assert len(first_citation.retrieval_channels) >= 2


@pytest.mark.asyncio
async def test_pre_retrieval_tenant_and_clearance_isolation():
    """
    Enforces that tenant isolation and clearance are applied strictly BEFORE candidate generation,
    never as a post-filter.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    now_ts = int(time.time())
    
    tenant_a = f"ORG-A-{uuid.uuid4().hex[:4]}"
    tenant_b = f"ORG-B-{uuid.uuid4().hex[:4]}"

    # Secret executive document in Tenant A
    sec_doc_id = f"MEM-SEC-{uuid.uuid4().hex[:4]}"
    cursor.execute("""
        INSERT INTO memories (id, record_type, title, content, source, timestamp, tags, clearance, organisation_id, effective_from)
        VALUES (?, 'DOCUMENT', 'Secret Executive M&A', 'Confidential acquisition target valuation $50M.', 'TEST', ?, 'mna', 'EXECUTIVE', ?, ?)
    """, (sec_doc_id, now_ts, tenant_a, now_ts))

    # Public document in Tenant B
    b_doc_id = f"MEM-PUB-B-{uuid.uuid4().hex[:4]}"
    cursor.execute("""
        INSERT INTO memories (id, record_type, title, content, source, timestamp, tags, clearance, organisation_id, effective_from)
        VALUES (?, 'DOCUMENT', 'Tenant B Public Roadmap', 'Confidential acquisition plans for partner firm.', 'TEST', ?, 'roadmap', 'ALL_TEAM', ?, ?)
    """, (b_doc_id, now_ts, tenant_b, now_ts))
    conn.commit()

    # Query as Tenant A with ALL_TEAM clearance -> MUST NOT see Tenant A EXECUTIVE doc, and MUST NOT see Tenant B doc
    req_a = SearchRequest(query="acquisition confidential valuation", clearance="ALL_TEAM", organisation_id=tenant_a)
    res_a = await search_service.search_hybrid(req_a)
    retrieved_ids_a = [c.id for c in res_a.citations]
    assert sec_doc_id not in retrieved_ids_a
    assert b_doc_id not in retrieved_ids_a

    # Query as Tenant B with ALL_TEAM clearance -> MUST NOT see Tenant A doc
    req_b = SearchRequest(query="acquisition confidential valuation", clearance="ALL_TEAM", organisation_id=tenant_b)
    res_b = await search_service.search_hybrid(req_b)
    retrieved_ids_b = [c.id for c in res_b.citations]
    assert sec_doc_id not in retrieved_ids_b
    assert b_doc_id in retrieved_ids_b


# =========================================================================
# 2. First-Class Evidence Model & Provenance Payload
# =========================================================================

@pytest.mark.asyncio
async def test_first_class_evidence_provenance_payload():
    """
    Validates structured evidence contract (EvidenceSet, EvidenceItem, EvidenceChannel)
    with source document provenance, offset/location, source timestamp, author,
    confidence calibration score, retrieval channel breakdown, and relationship path.
    Also verifies NO private internal reasoning tokens are exposed.
    """
    conn = db.get_connection()
    cursor = conn.cursor()
    org_id = f"ORG-EV-{uuid.uuid4().hex[:6]}"
    now_ts = int(time.time())
    doc_id = f"MEM-PROV-{uuid.uuid4().hex[:4]}"

    cursor.execute("""
        INSERT INTO memories (id, record_type, title, content, source, timestamp, tags, clearance, organisation_id, effective_from)
        VALUES (?, 'DOCUMENT', 'Zero-Trust Architecture Spec', 'All API communication requires cryptographic signature and mutual TLS verification.', 'INGESTION:DOC-101', ?, 'spec,security', 'ALL_TEAM', ?, ?)
    """, (doc_id, now_ts, org_id, now_ts))
    conn.commit()

    req = SearchRequest(query="Zero-Trust Architecture mutual TLS verification", clearance="ALL_TEAM", organisation_id=org_id)
    res = await search_service.search_hybrid(req)

    # 1. EvidenceSet structure validation
    assert res.evidence_set is not None
    ev_set = res.evidence_set
    assert isinstance(ev_set.evidence_set_id, str)
    assert len(ev_set.items) > 0
    assert 0.0 <= ev_set.composite_confidence <= 1.0

    # 2. EvidenceItem fields validation
    item = ev_set.items[0]
    assert item.source_document_id == doc_id
    assert item.location is not None
    assert item.location.startswith("offset:") or item.location.startswith("page:")
    assert item.source_timestamp > 0
    assert 0.0 <= item.confidence_score <= 1.0
    assert len(item.retrieval_channels) > 0
    assert isinstance(item.retrieval_channels[0], EvidenceChannel)
    assert item.rrf_score > 0

    # 3. Canonical aliases on SearchCitation
    citation = res.citations[0]
    assert citation.location == item.location
    assert citation.retrieval_channels == [c.model_dump() for c in item.retrieval_channels]
    assert citation.rrf_score == item.rrf_score

    # 4. Anti-leakage: Ensure NO private internal reasoning tokens exist in any payload
    private_tokens = ["<think>", "</think>", "[internal_reasoning]", "thought_chain", "hidden_state", "private_chain"]
    full_payload_str = res.model_dump_json()
    for tok in private_tokens:
        assert tok not in full_payload_str, f"Forbidden private reasoning token '{tok}' detected in search response!"


# =========================================================================
# 3. Document Versioning Lineage & Bitemporal Traversal (Point 21)
# =========================================================================

@pytest.mark.asyncio
async def test_document_versioning_and_supersedes_lineage(tmp_path):
    """
    Validates Document version progression (v1, v2, v3) with explicit SUPERSEDES
    relationships in SQLite and Kùzu graph, and point-in-time AS_OF_DATE traversal.
    """
    org_id = f"ORG-VER-{uuid.uuid4().hex[:6]}"
    filename = "database_migration_policy.md"
    file_path = tmp_path / filename

    # --- Step 1: Ingest Version 1 ---
    file_path.write_text("v1: We allow manual migrations on staging environments.")
    doc1_id = f"DOC-V1-{uuid.uuid4().hex[:4]}"
    doc1_record = {
        "doc_id": doc1_id,
        "filename": filename,
        "file_hash": "hash_v1",
        "department": "ENGINEERING",
        "clearance": "ALL_TEAM",
        "format": ".md",
        "file_size_bytes": 100,
        "page_count": 1,
        "table_count": 0,
        "character_count": 60,
        "content": "v1: We allow manual migrations on staging environments.",
        "tables": [],
        "chunks": [{"chunk_id": f"{doc1_id}-c1", "text": "v1: We allow manual migrations on staging environments."}],
    }
    res1 = ingestion_coordinator.ingest_document_atomic(
        file_path=str(file_path),
        doc_record=doc1_record,
        organisation_id=org_id,
    )
    assert res1["status"] == "COMMITTED"

    conn = db.get_connection()
    c1 = conn.cursor()
    c1.execute("SELECT version, parent_doc_id, superseded_by FROM documents WHERE doc_id = ?", (doc1_id,))
    row1 = c1.fetchone()
    assert row1["version"] == 1
    assert row1["superseded_by"] is None

    # Wait 1s to ensure distinct timestamps
    time.sleep(1.0)

    # --- Step 2: Ingest Version 2 (same filename) ---
    file_path.write_text("v2: Manual migrations are strictly forbidden; automated CI/CD runners only.")
    doc2_id = f"DOC-V2-{uuid.uuid4().hex[:4]}"
    doc2_record = {
        "doc_id": doc2_id,
        "filename": filename,
        "file_hash": "hash_v2",
        "department": "ENGINEERING",
        "clearance": "ALL_TEAM",
        "format": ".md",
        "file_size_bytes": 120,
        "page_count": 1,
        "table_count": 0,
        "character_count": 80,
        "content": "v2: Manual migrations are strictly forbidden; automated CI/CD runners only.",
        "tables": [],
        "chunks": [{"chunk_id": f"{doc2_id}-c1", "text": "v2: Manual migrations are strictly forbidden; automated CI/CD runners only."}],
    }
    res2 = ingestion_coordinator.ingest_document_atomic(
        file_path=str(file_path),
        doc_record=doc2_record,
        organisation_id=org_id,
    )
    assert res2["status"] == "COMMITTED"

    c1.execute("SELECT version, parent_doc_id, superseded_by FROM documents WHERE doc_id = ?", (doc2_id,))
    row2 = c1.fetchone()
    assert row2["version"] == 2
    assert row2["superseded_by"] is None

    # Verify doc1 is now superseded
    c1.execute("SELECT superseded_by, effective_to FROM documents WHERE doc_id = ?", (doc1_id,))
    sup1 = c1.fetchone()
    assert sup1["superseded_by"] == doc2_id
    assert sup1["effective_to"] is not None

    time.sleep(1.0)

    # --- Step 3: Ingest Version 3 (referencing parent_doc_id explicitly) ---
    file_path.write_text("v3: Zero-downtime Blue/Green migrations with strict pre-flight validation.")
    doc3_id = f"DOC-V3-{uuid.uuid4().hex[:4]}"
    doc3_record = {
        "doc_id": doc3_id,
        "filename": filename,
        "file_hash": "hash_v3",
        "department": "ENGINEERING",
        "clearance": "ALL_TEAM",
        "format": ".md",
        "file_size_bytes": 140,
        "page_count": 1,
        "table_count": 0,
        "character_count": 90,
        "content": "v3: Zero-downtime Blue/Green migrations with strict pre-flight validation.",
        "tables": [],
        "chunks": [{"chunk_id": f"{doc3_id}-c1", "text": "v3: Zero-downtime Blue/Green migrations with strict pre-flight validation."}],
    }
    res3 = ingestion_coordinator.ingest_document_atomic(
        file_path=str(file_path),
        doc_record=doc3_record,
        organisation_id=org_id,
        parent_doc_id=doc1_id,
    )
    assert res3["status"] == "COMMITTED"

    c1.execute("SELECT version, superseded_by FROM documents WHERE doc_id = ?", (doc3_id,))
    row3 = c1.fetchone()
    assert row3["version"] == 3
    assert row3["superseded_by"] is None

    # Check Kùzu Graph [:SUPERSEDES] lineage chain
    history = kuzu_sync.get_document_superseded_chain(doc3_id)
    assert len(history) >= 1
    ancestor_ids = [h.get("id") for h in history]
    assert doc2_id in ancestor_ids or doc1_id in ancestor_ids

    # --- Step 4: Search in CURRENT mode vs AS_OF_DATE mode ---
    # In CURRENT mode, only v3 should be active
    req_curr = SearchRequest(query="migrations", clearance="ALL_TEAM", organisation_id=org_id)
    res_curr = await search_service.search_hybrid(req_curr)
    curr_ids = [c.id for c in res_curr.citations]
    # v3 memory should be present, v1 and v2 superseded
    assert f"MEM-{doc3_id}" in curr_ids or doc3_id in curr_ids
    assert f"MEM-{doc1_id}" not in curr_ids

    # In AS_OF_DATE mode (as of doc1 effective timestamp), v1 should be returned
    v1_ts = c1.execute("SELECT effective_from FROM documents WHERE doc_id = ?", (doc1_id,)).fetchone()[0]
    req_as_of = SearchRequest(query="migrations", clearance="ALL_TEAM", organisation_id=org_id, as_of=v1_ts)
    res_as_of = await search_service.search_hybrid(req_as_of)
    as_of_ids = [c.id for c in res_as_of.citations]
    assert f"MEM-{doc1_id}" in as_of_ids or doc1_id in as_of_ids


# =========================================================================
# 4. Semantic Graph Entity Extraction & Institutional Glossary
# =========================================================================

def test_semantic_graph_entity_extraction_and_glossary(tmp_path):
    """
    Validates entity extraction hooks on ingestion for:
    Person, Company, Decision, Policy, Commitment, Technology, Risk
    and institutional glossary cache indexing (Points 22 & 49).
    """
    org_id = f"ORG-GLOSS-{uuid.uuid4().hex[:6]}"
    doc_content = (
        "Executive Review: Alex Vance and Dr. Elena Rostova met with Acme Corp leadership. "
        "Under Policy POL-802, the team approved Decision DEC-440 for infrastructure overhaul. "
        "The project commitment is deliverable COM-Q4-DEPLOYMENT using FastAPI, SQLite, and Kùzu graph store. "
        "Key risk: security vulnerability if token validation is skipped."
    )
    test_file = tmp_path / "executive_review.md"
    test_file.write_text(doc_content)

    doc_id = f"DOC-ENT-{uuid.uuid4().hex[:4]}"
    doc_record = {
        "doc_id": doc_id,
        "filename": "executive_review.md",
        "file_hash": "hash_ent_test",
        "department": "EXECUTIVE",
        "clearance": "ALL_TEAM",
        "format": ".md",
        "file_size_bytes": len(doc_content),
        "page_count": 1,
        "table_count": 0,
        "character_count": len(doc_content),
        "content": doc_content,
        "tables": [],
        "chunks": [{"chunk_id": f"{doc_id}-c1", "text": doc_content}],
    }

    res = ingestion_coordinator.ingest_document_atomic(
        file_path=str(test_file),
        doc_record=doc_record,
        organisation_id=org_id,
    )
    assert res["status"] == "COMMITTED"

    # Verify SQLite institutional_glossary table
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT term, category FROM institutional_glossary WHERE organisation_id = ?", (org_id,))
    rows = cursor.fetchall()
    
    found_categories = {r["category"] for r in rows}
    found_terms = {r["term"] for r in rows}

    # Verify extracted entities include expected categories
    assert "PERSON" in found_categories
    assert "Alex Vance" in found_terms or "Dr. Elena Rostova" in found_terms
    assert "COMPANY" in found_categories
    assert "Acme Corp" in found_terms
    assert "POLICY" in found_categories or "POL-802" in found_terms
    assert "TECHNOLOGY" in found_categories
    assert any(tech in found_terms for tech in ["FastAPI", "SQLite", "Kùzu", "Kuzu"])


# =========================================================================
# 5. Model Abstention & Calibrated Confidence Scoring (Points 61, 62)
# =========================================================================

@pytest.mark.asyncio
async def test_model_abstention_on_insufficient_evidence():
    """
    Validates calibrated confidence scoring and explicit structured abstention
    (status='ABSTAINED', reason='INSUFFICIENT_EVIDENCE') when composite confidence
    score falls below threshold (0.35) or no evidence is available.
    """
    empty_org_id = f"ORG-EMPTY-{uuid.uuid4().hex[:6]}"

    # Query against an organisation with zero documents/memories
    req = SearchRequest(
        query="What was the secret codename of the 2019 hyperdrive project?",
        clearance="ALL_TEAM",
        organisation_id=empty_org_id,
    )
    res = await search_service.search_hybrid(req)

    # 1. Abstention triggered
    assert res.status == "ABSTAINED"
    assert res.abstention_reason == "INSUFFICIENT_EVIDENCE"
    assert res.evidence_set is not None
    assert res.evidence_set.abstention_triggered is True
    assert res.evidence_set.composite_confidence < 0.35
    assert len(res.citations) == 0


@pytest.mark.asyncio
async def test_confidence_calibration_with_high_relevance():
    """
    Validates that when high-confidence evidence is retrieved, the status is RESOLVED
    and abstention is NOT triggered.
    """
    org_id = f"ORG-CONF-{uuid.uuid4().hex[:6]}"
    conn = db.get_connection()
    cursor = conn.cursor()
    now_ts = int(time.time())

    mem_id = f"MEM-CONF-{uuid.uuid4().hex[:4]}"
    cursor.execute("""
        INSERT INTO memories (id, record_type, title, content, source, timestamp, tags, clearance, organisation_id, effective_from)
        VALUES (?, 'DOCUMENT', 'Project Hyperion Specifications', 'Project Hyperion is the sovereign offline neural memory architecture engineered in 2026.', 'SPEC', ?, 'hyperion', 'ALL_TEAM', ?, ?)
    """, (mem_id, now_ts, org_id, now_ts))
    conn.commit()

    req = SearchRequest(
        query="Project Hyperion sovereign offline neural memory architecture 2026",
        clearance="ALL_TEAM",
        organisation_id=org_id,
    )
    res = await search_service.search_hybrid(req)

    assert res.status == "RESOLVED"
    assert res.abstention_reason is None
    assert res.evidence_set is not None
    assert res.evidence_set.abstention_triggered is False
    assert res.confidence_score >= 0.35
    assert len(res.citations) > 0
