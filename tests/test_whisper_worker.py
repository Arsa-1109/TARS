# tests/test_whisper_worker.py
"""
Unit & Edge-Case Tests for WhisperWorker (apps/api/ingestion/whisper_worker.py)
"""
import os
import time
import pytest
from apps.api.ingestion.whisper_worker import WhisperWorker

DROP_DIR = os.path.join(os.getcwd(), "drop")


@pytest.fixture
def clean_drop_dir():
    os.makedirs(DROP_DIR, exist_ok=True)
    yield DROP_DIR


def test_fifo_queue_ordering(clean_drop_dir):
    """Tasks queued in sequence must be processed in FIFO order."""
    worker = WhisperWorker()
    processed_order = []

    def tracking_callback(task):
        processed_order.append(task.client_name)

    worker.on_complete_callback = tracking_callback
    worker.start()

    dummy1 = os.path.join(clean_drop_dir, "fifo_test_1.wav")
    dummy2 = os.path.join(clean_drop_dir, "fifo_test_2.wav")
    with open(dummy1, "wb") as f:
        f.write(b"AUDIO1")
    with open(dummy2, "wb") as f:
        f.write(b"AUDIO2")

    t1 = worker.enqueue(dummy1, client_name="First Task")
    t2 = worker.enqueue(dummy2, client_name="Second Task")

    # Wait for queue execution
    timeout = time.time() + 3.0
    while time.time() < timeout and len(processed_order) < 2:
        time.sleep(0.1)

    worker.stop()

    assert processed_order == ["First Task", "Second Task"]

    if os.path.exists(dummy1):
        os.remove(dummy1)
    if os.path.exists(dummy2):
        os.remove(dummy2)


def test_stats_telemetry_accuracy(clean_drop_dir):
    """Worker stats dictionary accurately reflects queue size, running status, and completion count."""
    worker = WhisperWorker()
    stats_before = worker.get_stats()
    assert stats_before["total_tasks"] == 0
    assert stats_before["completed_tasks"] == 0

    worker.start()
    assert worker.get_stats()["is_running"] is True

    dummy = os.path.join(clean_drop_dir, "stats_test.wav")
    with open(dummy, "wb") as f:
        f.write(b"STATS")

    task_id = worker.enqueue(dummy, client_name="Telemetry Test")
    time.sleep(1.0)

    stats_after = worker.get_stats()
    assert stats_after["total_tasks"] == 1
    assert stats_after["completed_tasks"] == 1

    worker.stop()
    assert worker.get_stats()["is_running"] is False

    if os.path.exists(dummy):
        os.remove(dummy)


def test_accompanying_transcript_file_lookup(clean_drop_dir):
    """If a .txt file exists matching the audio file name, worker uses it as the ground-truth transcript."""
    worker = WhisperWorker()
    worker.start()

    audio_path = os.path.join(clean_drop_dir, "custom_call.mp3")
    transcript_path = os.path.join(clean_drop_dir, "custom_call.txt")

    with open(audio_path, "wb") as f:
        f.write(b"FAKE_AUDIO")
    with open(transcript_path, "w", encoding="utf-8") as f:
        f.write("Custom transcript: Client approved the $500k pilot agreement.")

    task_id = worker.enqueue(audio_path, client_name="Pilot Sync")
    time.sleep(1.0)

    task = worker.get_task(task_id)
    assert task is not None
    assert task.status == "COMPLETED"
    assert "approved the $500k pilot" in task.transcript

    worker.stop()

    if os.path.exists(audio_path):
        os.remove(audio_path)
    if os.path.exists(transcript_path):
        os.remove(transcript_path)


def test_callback_exception_resilience(clean_drop_dir):
    """If on_complete_callback raises an exception, the worker thread survives and finishes subsequent tasks."""
    def buggy_callback(task):
        raise RuntimeError("Simulated crash in external downstream callback")

    worker = WhisperWorker(on_complete_callback=buggy_callback)
    worker.start()

    dummy1 = os.path.join(clean_drop_dir, "resilience_1.wav")
    dummy2 = os.path.join(clean_drop_dir, "resilience_2.wav")
    with open(dummy1, "wb") as f:
        f.write(b"1")
    with open(dummy2, "wb") as f:
        f.write(b"2")

    t1 = worker.enqueue(dummy1, client_name="Task 1")
    t2 = worker.enqueue(dummy2, client_name="Task 2")

    time.sleep(1.5)

    task1 = worker.get_task(t1)
    task2 = worker.get_task(t2)

    assert task1.status == "COMPLETED"
    assert task2.status == "COMPLETED"

    worker.stop()

    if os.path.exists(dummy1):
        os.remove(dummy1)
    if os.path.exists(dummy2):
        os.remove(dummy2)
