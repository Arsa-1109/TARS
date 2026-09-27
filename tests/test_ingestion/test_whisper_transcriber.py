# tests/test_ingestion/test_whisper_transcriber.py
"""
Unit tests for CPU-pinned Whisper transcriber and WebVTT transcript parser (Patch P-03).
"""
import os
import tempfile
import time
import pytest

from apps.api.ingestion.whisper_transcriber import WhisperTranscriber, WhisperTask


@pytest.fixture
def transcriber():
    t = WhisperTranscriber(
        device="cpu",
        compute_type="int8",
        cpu_threads=2,
    )
    yield t
    t.stop()


def test_cpu_pinning_invariants(transcriber):
    """Verify Whisper is pinned strictly to CPU with int8 quantization consuming 0 MB VRAM."""
    stats = transcriber.get_stats()
    assert stats["device"] == "cpu"
    assert stats["compute_type"] == "int8"
    assert stats["cpu_threads"] == 2
    assert stats["vram_mb"] == 0.00


def test_vtt_transcript_parsing(transcriber):
    """Verify parsing of WebVTT (.vtt) meeting transcripts (demo asset format)."""
    vtt_content = """WEBVTT

00:00:01.000 --> 00:00:04.500
<v Founder>Good afternoon everyone, thanks for joining the product sync.</v>

00:00:05.000 --> 00:00:10.000
<v Enterprise Client>We really need the single sign-on integration before our security review next Friday.</v>

00:00:11.000 --> 00:00:15.000
<v Lead Dev>We will ship SAML SSO support by Wednesday afternoon.</v>
"""
    with tempfile.NamedTemporaryFile(suffix=".vtt", mode="w", encoding="utf-8", delete=False) as f:
        f.write(vtt_content)
        temp_path = f.name

    try:
        transcript, duration = transcriber._parse_transcript_file(temp_path)
        assert "Good afternoon everyone" in transcript
        assert "single sign-on integration" in transcript
        assert "ship SAML SSO support" in transcript
        assert duration >= 15.0
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_queue_and_callback_lifecycle(transcriber):
    """Verify asynchronous task enqueueing and callback invocation."""
    completed_tasks = []

    def on_complete(task: WhisperTask):
        completed_tasks.append(task)

    transcriber.on_complete_callback = on_complete

    with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", encoding="utf-8", delete=False) as f:
        f.write("Call transcript memo: Client requested bulk PDF exports.")
        temp_path = f.name

    try:
        task_id = transcriber.enqueue(temp_path, client_name="Fintech Corp")
        assert task_id.startswith("WSP-")

        # Wait for background queue processing (max 4s)
        start = time.time()
        while time.time() - start < 4.0:
            task = transcriber.get_task(task_id)
            if task and task.status == "COMPLETED":
                break
            time.sleep(0.1)

        task = transcriber.get_task(task_id)
        assert task is not None
        assert task.status == "COMPLETED"
        assert task.transcript != ""
        assert len(completed_tasks) == 1
        assert completed_tasks[0].task_id == task_id
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_qos_priority_3_pause_resume(transcriber):
    """Verify Priority 3 background worker yields when paused and resumes seamlessly."""
    assert not transcriber.is_paused
    stats = transcriber.get_stats()
    assert not stats["is_paused"]

    transcriber.pause()
    assert transcriber.is_paused
    assert transcriber.get_stats()["is_paused"]

    transcriber.resume()
    assert not transcriber.is_paused
    assert not transcriber.get_stats()["is_paused"]

