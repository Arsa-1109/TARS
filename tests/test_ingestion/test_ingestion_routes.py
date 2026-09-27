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
