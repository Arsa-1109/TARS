# tests/test_routes.py
"""
Unit & Edge-Case Tests for FastAPI Ingestion Routes (apps/api/ingestion/routes.py)
"""
import io
import pytest
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.ingestion.action_hub import action_hub_repo


@pytest.fixture
def client():
    action_hub_repo.clear()
    yield TestClient(app)
    action_hub_repo.clear()


def test_task_404_for_unknown_id(client):
    """Querying a non-existent task_id should return 404."""
    res = client.get("/api/ingestion/tasks/WSP-NONEXISTENT")
    assert res.status_code == 404
    assert "not found" in res.json()["detail"].lower()


def test_extract_spec_400_on_empty_transcript(client):
    """Posting an empty or whitespace transcript must yield 400 Bad Request."""
    res = client.post("/api/ingestion/extract-spec", json={"transcript": "   \n\t  "})
    assert res.status_code == 400
    assert "cannot be empty" in res.json()["detail"].lower()


def test_action_item_404_on_missing_id(client):
    """GET, PATCH, and DELETE operations on unknown action item IDs must return 404."""
    # GET unknown
    res_get = client.get("/api/ingestion/action-items/ACT-MISSING-99")
    assert res_get.status_code == 404

    # PATCH unknown
    res_patch = client.patch(
        "/api/ingestion/action-items/ACT-MISSING-99",
        json={"status": "DONE"},
    )
    assert res_patch.status_code == 404

    # DELETE unknown
    res_del = client.delete("/api/ingestion/action-items/ACT-MISSING-99")
    assert res_del.status_code == 404


def test_action_item_full_rest_lifecycle(client):
    """Full lifecycle: Create -> Get -> Patch -> List -> Delete."""
    item_payload = {
        "id": "ACT-LIFECYCLE-1",
        "description": "Implement 14-day flight-plan onboarding",
        "owner": "Engineer Lead",
        "deadline": 1700000000,
        "status": "OPEN",
        "source_type": "DECISION",
        "source_id": "DEC-009",
        "source_offset": "Section 4",
    }
    # 1. Create
    res_create = client.post("/api/ingestion/action-items", json=item_payload)
    assert res_create.status_code == 201
    assert res_create.json()["id"] == "ACT-LIFECYCLE-1"

    # 2. Get
    res_get = client.get("/api/ingestion/action-items/ACT-LIFECYCLE-1")
    assert res_get.status_code == 200
    assert res_get.json()["owner"] == "Engineer Lead"

    # 3. Patch
    res_patch = client.patch(
        "/api/ingestion/action-items/ACT-LIFECYCLE-1",
        json={"status": "IN_PROGRESS", "owner": "Arya"},
    )
    assert res_patch.status_code == 200
    assert res_patch.json()["status"] == "IN_PROGRESS"
    assert res_patch.json()["owner"] == "Arya"

    # 4. List via both endpoints (/action-items and /actions/list alias)
    res_list1 = client.get("/api/ingestion/action-items?status=IN_PROGRESS")
    assert res_list1.status_code == 200
    assert len(res_list1.json()) == 1

    res_list2 = client.get("/api/ingestion/actions/list?owner=Arya")
    assert res_list2.status_code == 200
    assert len(res_list2.json()) == 1

    # 5. Delete
    res_del = client.delete("/api/ingestion/action-items/ACT-LIFECYCLE-1")
    assert res_del.status_code == 200
    assert res_del.json()["id"] == "ACT-LIFECYCLE-1"

    # 6. Verify gone
    res_verify = client.get("/api/ingestion/action-items/ACT-LIFECYCLE-1")
    assert res_verify.status_code == 404


def test_memo_and_calls_transcribe_endpoints(client):
    """Audio memo upload endpoints (/memo and /calls/transcribe alias)."""
    fake_wav = io.BytesIO(b"RIFF....WAVEfmt ....data....")
    res1 = client.post(
        "/api/ingestion/memo",
        files={"file": ("mobile_memo.wav", fake_wav, "audio/wav")},
        data={"client_name": "Mobile User"},
    )
    assert res1.status_code == 202
    assert res1.json()["status"] == "QUEUED"
    assert res1.json()["task_id"].startswith("WSP-")

    fake_mp3 = io.BytesIO(b"ID3....")
    res2 = client.post(
        "/api/ingestion/calls/transcribe",
        files={"file": ("client_call.mp3", fake_mp3, "audio/mpeg")},
        data={"client_name": "Enterprise Client"},
    )
    assert res2.status_code == 202
    assert res2.json()["status"] == "QUEUED"


def test_document_upload_endpoints(client):
    """Document upload endpoints (/upload and /ingest/upload alias)."""
    fake_txt = io.BytesIO(b"Term sheet: $2.5M seed at $15M cap.")
    res = client.post(
        "/api/ingestion/ingest/upload",
        files={"file": ("term_sheet.txt", fake_txt, "text/plain")},
        data={"department": "FOUNDERS_ONLY"},
    )
    assert res.status_code == 200
    assert res.json()["status"] == "INGESTED"
    assert res.json()["department"] == "FOUNDERS_ONLY"
    assert res.json()["doc_id"].startswith("DOC-")


def test_watcher_control_and_events(client):
    """Watcher start, scan, and events endpoints."""
    res_start = client.post("/api/ingestion/watcher/start")
    assert res_start.status_code == 200

    res_scan = client.post("/api/ingestion/watcher/scan")
    assert res_scan.status_code == 200

    res_events = client.get("/api/ingestion/events")
    assert res_events.status_code == 200
    assert "events" in res_events.json()


def test_user_endpoints_and_listing(client):
    """Test POST /api/core/users and GET /api/core/users."""
    res_create = client.post("/api/core/users", json={
        "name": "Prof. John Doe",
        "email": "johndoe@tars.local",
        "role": "ENGINEER",
        "department": "Infrastructure"
    })
    assert res_create.status_code == 200
    data = res_create.json()
    assert data["name"] == "Prof. John Doe"
    assert data["email"] == "johndoe@tars.local"

    # Fetch users
    res_list = client.get("/api/core/users")
    assert res_list.status_code == 200
    users = res_list.json()
    assert any(u["email"] == "johndoe@tars.local" for u in users)


def test_document_listing_persistence(client):
    """Test that uploaded documents appear in GET /api/ingestion/documents."""
    txt_content = b"Sovereign AI Architecture and Offline Vector Memory Blueprint."
    res = client.post(
        "/api/ingestion/upload",
        files={"file": ("sovereign_blueprint.txt", io.BytesIO(txt_content), "text/plain")},
        data={"department": "ENGINEERING", "clearance": "ALL_TEAM"}
    )
    assert res.status_code == 201

    res_docs = client.get("/api/ingestion/documents")
    assert res_docs.status_code == 200
    docs = res_docs.json()["documents"]
    assert any(d["filename"] == "sovereign_blueprint.txt" for d in docs)
