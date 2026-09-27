# tests/test_ingestion/test_ingestion_routes.py
"""
Integration tests for Track 3 FastAPI Ingestion endpoints using TestClient.
"""
import io
import pytest
from fastapi.testclient import TestClient

from apps.api.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_get_ingestion_status(client):
    response = client.get("/api/ingestion/status")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "online"
    assert "watcher" in data
    assert "whisper" in data
    assert "graph" in data


def test_extract_spec_endpoint(client):
    payload = {
        "transcript": "Customer reported that login is slow. Requested Google OAuth. We will ship it by Friday.",
        "client_name": "Test Client",
        "audio_duration_seconds": 60.0,
        "sync_to_graph": False,
    }
    response = client.post("/api/ingestion/extract-spec", json=payload)
    assert response.status_code == 200
    spec = response.json()
    assert spec["client_name"] == "Test Client"
    assert "summary" in spec
    assert len(spec["pain_points"]) > 0
    assert len(spec["feature_requests"]) > 0
    assert len(spec["commitments"]) > 0


def test_document_upload_csv(client):
    csv_bytes = b"Quarter,Revenue,Profit\nQ1,100000,20000\nQ2,150000,35000\n"
    files = {"file": ("financials.csv", io.BytesIO(csv_bytes), "text/csv")}
    data = {"department": "FINANCE", "clearance": "ALL_TEAM"}

    response = client.post("/api/ingestion/upload", files=files, data=data)
    assert response.status_code == 201
    res = response.json()
    assert res["doc_id"].startswith("DOC-")
    assert res["format"] == "csv"
    assert res["table_count"] == 1
    assert "Revenue" in res["preview"]


def test_audio_memo_upload(client):
    vtt_bytes = b"WEBVTT\n\n00:00:01.000 --> 00:00:05.000\nClient wants faster indexing.\n"
    files = {"file": ("call.vtt", io.BytesIO(vtt_bytes), "text/vtt")}
    data = {"client_name": "Acme Call"}

    response = client.post("/api/ingestion/memo", files=files, data=data)
    assert response.status_code == 202
    res = response.json()
    assert res["task_id"].startswith("WSP-")
    assert res["status"] == "QUEUED"


def test_graph_stats_and_superseded_endpoints(client):
    # 1. Sync a decision
    sync_payload = {
        "decision_id": "ADR-100",
        "title": "Use SQLite WAL Mode",
        "category": "ARCHITECTURE",
        "chosen_option": "WAL",
    }
    sync_res = client.post("/api/ingestion/graph/sync/decision", json=sync_payload)
    assert sync_res.status_code == 200
    assert sync_res.json()["status"] == "success"

    # 2. Check stats
    stats_res = client.get("/api/ingestion/graph/stats")
    assert stats_res.status_code == 200
    assert "nodes" in stats_res.json()

    # 3. Check superseded chain
    chain_res = client.get("/api/ingestion/graph/superseded/ADR-100")
    assert chain_res.status_code == 200
    assert chain_res.json()["decision_id"] == "ADR-100"


def test_qos_pause_resume_endpoints(client):
    """Verify QoS Priority 3 yield endpoints update worker states."""
    pause_res = client.post("/api/ingestion/qos/pause")
    assert pause_res.status_code == 200
    data = pause_res.json()
    assert data["status"] == "PAUSED"
    assert data["whisper_paused"] is True
    assert data["watcher_paused"] is True

    status_res = client.get("/api/ingestion/qos/status")
    assert status_res.status_code == 200
    assert status_res.json()["is_paused"] is True

    resume_res = client.post("/api/ingestion/qos/resume")
    assert resume_res.status_code == 200
    res_data = resume_res.json()
    assert res_data["status"] == "ACTIVE"
    assert res_data["whisper_paused"] is False
    assert res_data["watcher_paused"] is False


def test_graph_extended_endpoints(client):
    """Verify endpoints for sync_invariant, sync_code_entity, and relationship edges."""
    # 1. Sync Invariant
    inv_payload = {
        "invariant_id": "INV-API01",
        "name": "Zero Egress Rule",
        "rule": "Enet == 0.00 KB",
        "rationale": "Sovereignty guarantee",
        "adr_ref": "ADR-002",
    }
    inv_res = client.post("/api/ingestion/graph/sync/invariant", json=inv_payload)
    assert inv_res.status_code == 200
    assert inv_res.json()["status"] == "success"

    # 2. Sync Code Entity
    code_payload = {
        "entity_id": "CODE-EGRESS01",
        "file_path": "apps/api/core/firewall.py",
        "symbol_name": "assert_zero_egress",
        "entity_type": "FUNCTION",
    }
    code_res = client.post("/api/ingestion/graph/sync/code-entity", json=code_payload)
    assert code_res.status_code == 200
    assert code_res.json()["status"] == "success"

    # 3. Link Invariant to Code
    link_inv_res = client.post(
        "/api/ingestion/graph/link/invariant-code",
        json={"invariant_id": "INV-API01", "code_entity_id": "CODE-EGRESS01"},
    )
    assert link_inv_res.status_code == 200
    assert link_inv_res.json()["relationship"] == "ENFORCES"

    # 4. Query Code Invariants
    query_inv_res = client.get("/api/ingestion/graph/code/CODE-EGRESS01/invariants")
    assert query_inv_res.status_code == 200
    assert query_inv_res.json()["count"] >= 1

    # 5. Link Document to Decision
    link_doc_res = client.post(
        "/api/ingestion/graph/link/document-decision",
        json={"doc_id": "DOC-99", "decision_id": "ADR-100"},
    )
    assert link_doc_res.status_code == 200
    assert link_doc_res.json()["relationship"] == "RELATES_TO"

    # 6. Query Document Decisions
    query_dec_res = client.get("/api/ingestion/graph/document/DOC-99/decisions")
    assert query_dec_res.status_code == 200
    assert query_dec_res.json()["count"] >= 1


def test_sse_events_stream(client):
    """Verify Server-Sent Events stream connects and yields handshake."""
    with client.stream("GET", "/api/ingestion/events/stream?limit=1") as response:
        assert response.status_code == 200
        assert "text/event-stream" in response.headers["content-type"]
        lines = [line for line in response.iter_lines() if line]
        combined = " ".join(lines)
        assert "CONNECTED" in combined or "TARS" in combined


