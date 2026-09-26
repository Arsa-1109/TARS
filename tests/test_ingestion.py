# tests/test_ingestion.py
"""
Test Suite for Track 3: Ambient Ingestion & Audio Intelligence Engine
Validates Action Hub persistence, Voice-to-Spec extraction, Document Ingester,
SHA-256 deduplication, and FastAPI endpoints (Sprint Plan & SDD requirements).
"""
import io
import os
import time
import pytest
from fastapi.testclient import TestClient

from apps.api.schemas.contracts import ActionItemDTO, VoiceToSpecResponse
from apps.api.ingestion.action_hub import ActionHubRepository
from apps.api.ingestion.voice_to_spec import VoiceToSpecExtractor
from apps.api.ingestion.whisper_worker import WhisperWorker
from apps.api.ingestion.drop_watcher import AmbientDropWatcher
from apps.api.ingestion.doc_ingester import DocumentIngester
from apps.api.main import app

TEST_DB_PATH = os.path.join(os.getcwd(), ".tars", "test_action_hub.sqlite3")


@pytest.fixture
def repo():
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass
    r = ActionHubRepository(db_path=TEST_DB_PATH)
    yield r
    if os.path.exists(TEST_DB_PATH):
        try:
            os.remove(TEST_DB_PATH)
        except OSError:
            pass


def test_action_hub_crud(repo):
    # 1. Create
    item = ActionItemDTO(
        id="ACT-TEST-001",
        description="Deliver SAML SSO specifications by Friday",
        owner="Arya",
        deadline=1700000000,
        status="OPEN",
        source_type="CALL",
        source_id="CALL-TEST-01",
        source_offset="Offset 00:45",
    )
    created = repo.create(item)
    assert created.id == "ACT-TEST-001"
    assert created.status == "OPEN"

    # 2. Get
    fetched = repo.get_by_id("ACT-TEST-001")
    assert fetched is not None
    assert fetched.description == "Deliver SAML SSO specifications by Friday"

    # 3. Update
    updated = repo.update("ACT-TEST-001", {"status": "DONE"})
    assert updated is not None
    assert updated.status == "DONE"

    # 4. List with filter
    items = repo.list_items(status="DONE")
    assert len(items) == 1
    assert items[0].id == "ACT-TEST-001"

    open_items = repo.list_items(status="OPEN")
    assert len(open_items) == 0

    # 5. Delete
    deleted = repo.delete("ACT-TEST-001")
    assert deleted is True
    assert repo.get_by_id("ACT-TEST-001") is None


def test_voice_to_spec_extraction():
    extractor = VoiceToSpecExtractor()
    transcript = (
        "Client sync with Starlight Capital. The client was frustrated with latency issues. "
        "They urgently requested custom role-based access control and SAML SSO integration. "
        "We promised we will deliver the RBAC and SAML test harness by next Monday."
    )
    spec = extractor.extract_spec(
        transcript=transcript,
        call_id="CALL-STARLIGHT-99",
        client_name="Starlight Capital",
        audio_duration=125.0,
        auto_create_action_items=False,
    )

    assert isinstance(spec, VoiceToSpecResponse)
    assert spec.call_id == "CALL-STARLIGHT-99"
    assert spec.client_name == "Starlight Capital"
    assert len(spec.pain_points) > 0
    assert len(spec.feature_requests) > 0
    assert len(spec.commitments) > 0
    assert spec.audio_duration_seconds == 125.0


def test_whisper_worker_lifecycle():
    worker = WhisperWorker()
    worker.start()

    dummy_audio_file = os.path.join(os.getcwd(), "drop", "test_call_sample.wav")
    os.makedirs(os.path.dirname(dummy_audio_file), exist_ok=True)
    with open(dummy_audio_file, "wb") as f:
        f.write(b"RIFF....WAVEfmt ....data....")

    task_id = worker.enqueue(dummy_audio_file, client_name="Demo Client")
    assert task_id.startswith("WSP-")

    # Wait briefly for worker queue processing
    time.sleep(1.0)
    task = worker.get_task(task_id)
    assert task is not None
    assert task.status in ["PROCESSING", "COMPLETED"]

    worker.stop()
    if os.path.exists(dummy_audio_file):
        os.remove(dummy_audio_file)


def test_document_ingester_and_sha256_dedup():
    ingester = DocumentIngester()
    test_csv = os.path.join(os.getcwd(), "drop", "test_runway.csv")
    os.makedirs(os.path.dirname(test_csv), exist_ok=True)
    with open(test_csv, "w", encoding="utf-8") as f:
        f.write("Month,Burn,Cash\nOct-26,50000,1200000\nNov-26,52000,1148000\n")

    res1 = ingester.ingest_document(test_csv, department="FINANCE")
    assert res1["doc_id"].startswith("DOC-")
    assert "Oct-26" in res1["content"]

    # Deduplication test: re-ingest same file
    res2 = ingester.ingest_document(test_csv, department="FINANCE")
    assert res1["file_hash"] == res2["file_hash"]
    assert res1["doc_id"] == res2["doc_id"]

    if os.path.exists(test_csv):
        os.remove(test_csv)


def test_fastapi_endpoints():
    client = TestClient(app)

    # Health check
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"

    # Status check
    res = client.get("/api/ingestion/status")
    assert res.status_code == 200
    assert res.json()["status"] == "online"

    # Extract Spec API
    extract_payload = {
        "transcript": "Client Acme reported database latency blockers. They requested single sign on. We committed to deliver by Friday.",
        "client_name": "Acme Corp",
        "audio_duration_seconds": 90.0,
    }
    res = client.post("/api/ingestion/extract-spec", json=extract_payload)
    assert res.status_code == 200
    data = res.json()
    assert "summary" in data
    assert len(data["commitments"]) > 0

    # Action Items API (standard + alias route /api/ingestion/actions/list)
    item_payload = {
        "id": "ACT-API-999",
        "description": "Verify zero egress airplane mode",
        "owner": "Presenter",
        "status": "OPEN",
        "source_type": "DECISION",
        "source_id": "DEC-001",
        "source_offset": "Section 8",
    }
    create_res = client.post("/api/ingestion/action-items", json=item_payload)
    assert create_res.status_code == 201

    list_res = client.get("/api/ingestion/actions/list?status=OPEN")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(it["id"] == "ACT-API-999" for it in items)

    # Document upload endpoint test
    fake_csv = io.BytesIO(b"Header1,Header2\nValue1,Value2\n")
    upload_res = client.post(
        "/api/ingestion/upload",
        files={"file": ("test_upload.csv", fake_csv, "text/csv")},
        data={"department": "OPERATIONS"},
    )
    assert upload_res.status_code == 200
    assert upload_res.json()["status"] == "INGESTED"

    # Events endpoint
    events_res = client.get("/api/ingestion/events")
    assert events_res.status_code == 200

    # Delete Action item
    del_res = client.delete("/api/ingestion/action-items/ACT-API-999")
    assert del_res.status_code == 200
