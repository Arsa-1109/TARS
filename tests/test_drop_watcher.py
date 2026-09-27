# tests/test_drop_watcher.py
"""
Unit & Edge-Case Tests for AmbientDropWatcher (apps/api/ingestion/drop_watcher.py)
"""
import os
import time
import pytest
from apps.api.ingestion.drop_watcher import AmbientDropWatcher, DropFileHandler

TEST_WATCH_DIR = os.path.join(os.getcwd(), "drop", "test_watcher_sandbox")


@pytest.fixture
def watch_dir():
    os.makedirs(TEST_WATCH_DIR, exist_ok=True)
    yield TEST_WATCH_DIR
    if os.path.exists(TEST_WATCH_DIR):
        for f in os.listdir(TEST_WATCH_DIR):
            try:
                os.remove(os.path.join(TEST_WATCH_DIR, f))
            except OSError:
                pass
        try:
            os.rmdir(TEST_WATCH_DIR)
        except OSError:
            pass


def test_ignore_hidden_and_temp_files(watch_dir):
    """Temporary or hidden files (.DS_Store, .tmp, .part) must be ignored."""
    handler = DropFileHandler()

    hidden_file = os.path.join(watch_dir, ".DS_Store")
    tmp_file = os.path.join(watch_dir, "upload_123.tmp")
    part_file = os.path.join(watch_dir, "recording.part")

    with open(hidden_file, "wb") as f:
        f.write(b"hidden")
    with open(tmp_file, "wb") as f:
        f.write(b"tmp")
    with open(part_file, "wb") as f:
        f.write(b"part")

    assert handler.process_file(hidden_file) is None
    assert handler.process_file(tmp_file) is None
    assert handler.process_file(part_file) is None
    assert len(handler.processed_files) == 0


def test_duplicate_file_hash_detection(watch_dir):
    """Dropping a file with identical content must be detected and not re-queued."""
    handler = DropFileHandler()

    file_1 = os.path.join(watch_dir, "first_copy.txt")
    file_2 = os.path.join(watch_dir, "second_copy.txt")

    with open(file_1, "w", encoding="utf-8") as f:
        f.write("Identical air-gapped content.")
    with open(file_2, "w", encoding="utf-8") as f:
        f.write("Identical air-gapped content.")

    res1 = handler.process_file(file_1)
    res2 = handler.process_file(file_2)

    assert res1 is not None
    assert res2 is not None
    assert res1["file_hash"] == res2["file_hash"]
    # Only 1 unique hash recorded in handler.processed_hashes
    assert len(handler.processed_hashes) == 1


def test_recent_events_ring_buffer_cap(watch_dir):
    """Watcher events buffer caps at 100 items."""
    watcher = AmbientDropWatcher(drop_dir=watch_dir)

    for i in range(120):
        watcher._record_event({"event": "TEST_EVENT", "index": i})

    assert len(watcher.recent_events) == 100
    assert watcher.recent_events[0]["index"] == 20
    assert watcher.recent_events[-1]["index"] == 119


def test_scan_existing_empty_directory(watch_dir):
    """Scanning an empty directory should succeed without errors."""
    watcher = AmbientDropWatcher(drop_dir=watch_dir)
    watcher.scan_existing()
    assert watcher.get_status()["processed_file_count"] == 0


def test_watcher_start_stop_lifecycle(watch_dir):
    """Watcher starts, reports running, and stops cleanly."""
    watcher = AmbientDropWatcher(drop_dir=watch_dir)
    assert watcher.is_running is False

    watcher.start()
    assert watcher.is_running is True

    # Verify status report
    status = watcher.get_status()
    assert status["is_running"] is True
    assert status["drop_directory"] == os.path.abspath(watch_dir)

    watcher.stop()
    assert watcher.is_running is False
