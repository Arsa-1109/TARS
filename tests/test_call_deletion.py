# tests/test_call_deletion.py
"""
Dedicated Test Suite for Call Deletion Lifecycle (Bug 19 & Track 2 Specification)
Verifies:
1. DELETE /api/ingestion/calls/{call_id} unlinks audio files from disk.
2. Detaches ClientCall nodes and relations in Kùzu / embedded graph store.
3. Selective pruning of Action Hub items based on user choice.
4. Subsequent GET /calls and GET /calls/{id} reflect the deletion without resurrection.
"""
import os
import time
import pytest
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.ingestion.action_hub import action_hub_repo
from apps.api.schemas.contracts import ActionItemDTO
from apps.api.ingestion.kuzu_sync import kuzu_sync
from apps.api.ingestion.whisper_transcriber import whisper_transcriber, WhisperTask


@pytest.fixture
def client():
    return TestClient(app)


def test_call_deletion_lifecycle_with_selective_pruning(client, tmp_path):
    call_id = f"CALL-TEST-{int(time.time())}"
    wsp_id = call_id.replace("CALL-", "WSP-")

    # 1. Create a dummy audio file on disk
    drop_dir = os.path.abspath(os.path.join(os.getcwd(), "drop"))
    os.makedirs(drop_dir, exist_ok=True)
    audio_file = os.path.join(drop_dir, f"{call_id}.wav")
    with open(audio_file, "wb") as f:
        f.write(b"RIFFdummy_audio_bytes_for_testing")

    # 2. Register task in whisper_transcriber
    task = WhisperTask(task_id=wsp_id, file_path=audio_file, client_name="Acme Corp Test")
    task.status = "COMPLETED"
    task.transcript = "Test transcript with explicit verbal commitment."
    whisper_transcriber._tasks[wsp_id] = task

    # 3. Seed node into Kuzu / fallback graph
    kuzu_sync.sync_client_call(
        call_id=call_id,
        client_name="Acme Corp Test",
        sentiment="NEUTRAL",
        audio_path=audio_file,
        transcript_summary="Test summary",
    )

    # 4. Seed action items in Action Hub: 1 to delete, 1 to retain
    task1_id = f"ACT-{call_id}-1"
    task2_id = f"ACT-{call_id}-2"
    action_hub_repo.create(
        ActionItemDTO(
            id=task1_id,
            description="Commitment 1 to be deleted",
            source_type="CLIENT_CALL",
            source_id=call_id,
            source_offset="00:30",
        )
    )
    action_hub_repo.create(
        ActionItemDTO(
            id=task2_id,
            description="Commitment 2 to be retained",
            source_type="CLIENT_CALL",
            source_id=call_id,
            source_offset="01:00",
        )
    )

    # Verify action items exist prior to deletion
    assert action_hub_repo.get_by_id(task1_id) is not None
    assert action_hub_repo.get_by_id(task2_id) is not None

    # Verify call appears in GET /calls
    list_res = client.get("/api/ingestion/calls")
    assert list_res.status_code == 200
    listed_ids = [c["call_id"] for c in list_res.json()["calls"]]
    assert wsp_id in listed_ids or call_id in listed_ids

    # 5. Execute DELETE /api/ingestion/calls/{call_id} selectively pruning task1 and retaining task2
    del_res = client.request(
        "DELETE",
        f"/api/ingestion/calls/{call_id}",
        json={"delete_task_ids": [task1_id]},
    )
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["call_id"] == call_id
    assert del_data["status"] == "DELETED"
    assert del_data["files_unlinked"] is True
    assert task1_id in del_data["deleted_task_ids"]
    assert task2_id in del_data["retained_task_ids"]

    # 6. Verify file is removed from disk
    assert not os.path.exists(audio_file)

    # 7. Verify Action Hub selective pruning
    assert action_hub_repo.get_by_id(task1_id) is None
    retained_item = action_hub_repo.get_by_id(task2_id)
    assert retained_item is not None
    assert "Audio archived" in retained_item.source_offset

    # 8. Verify GET /calls no longer lists this call
    list_res_after = client.get("/api/ingestion/calls")
    assert list_res_after.status_code == 200
    listed_ids_after = [c["call_id"] for c in list_res_after.json()["calls"]]
    assert call_id not in listed_ids_after
    assert wsp_id not in listed_ids_after

    # 9. Verify GET /calls/{task_id} returns 404
    get_res = client.get(f"/api/ingestion/calls/{call_id}")
    assert get_res.status_code == 404


def test_call_deletion_without_body_retains_tasks(client):
    call_id = f"CALL-RETAIN-{int(time.time())}"
    task_id = f"ACT-{call_id}-1"
    action_hub_repo.create(
        ActionItemDTO(
            id=task_id,
            description="Commitment with default retention",
            source_type="CLIENT_CALL",
            source_id=call_id,
            source_offset="00:15",
        )
    )

    del_res = client.delete(f"/api/ingestion/calls/{call_id}")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["status"] == "DELETED"
    assert task_id in del_data["retained_task_ids"]

    item = action_hub_repo.get_by_id(task_id)
    assert item is not None
    assert "Audio archived" in item.source_offset
