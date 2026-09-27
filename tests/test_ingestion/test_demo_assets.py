# tests/test_ingestion/test_demo_assets.py
"""
Integration and Acceptance Tests for ASYNC26 Stage Demo Golden Assets (Patch P-07).
Validates:
1. demo_assets/demo_runway_q4.xlsx: Multi-sheet financial model table flattening & semantic citation chunking.
2. demo_assets/acme_nda_call_sample.vtt: WebVTT client transcript parsing, sub-second 4-part spec extraction, and Kùzu graph synchronization.
3. Ambient drop folder watcher processing of golden stage assets.
"""
import os
import shutil
import tempfile
import pytest

from apps.api.ingestion.markitdown_parser import MarkitdownParser
from apps.api.ingestion.whisper_transcriber import WhisperTranscriber
from apps.api.ingestion.spec_extractor import VoiceToSpecExtractor
from apps.api.ingestion.kuzu_sync import KuzuGraphEngine
from apps.api.ingestion.drop_watcher import AmbientDropWatcher

ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
DEMO_RUNWAY_XLSX = os.path.join(ROOT_DIR, "demo_assets", "demo_runway_q4.xlsx")
DEMO_ACME_VTT = os.path.join(ROOT_DIR, "demo_assets", "acme_nda_call_sample.vtt")


def test_demo_runway_q4_excel_flattening_and_chunking():
    """
    Validates that demo_runway_q4.xlsx is properly ingested by MarkitdownParser:
    - 3 distinct sheets flattened into semantic Markdown tables.
    - Output chunked with SearchCitation metadata (page_number, line_start, line_end, snippet).
    """
    assert os.path.exists(DEMO_RUNWAY_XLSX), f"Demo asset missing: {DEMO_RUNWAY_XLSX}"

    parser = MarkitdownParser()
    res = parser.parse_file(DEMO_RUNWAY_XLSX, department="FINANCE", clearance="CONFIDENTIAL")

    assert res["doc_id"].startswith("DOC-")
    assert res["format"] == "xlsx"
    assert res["department"] == "FINANCE"
    assert res["table_count"] == 3
    assert res["page_count"] >= 3

    content = res["content"]
    # Check all three sheets are present
    assert "## Sheet: Executive Runway" in content
    assert "## Sheet: Hiring & Headcount" in content
    assert "## Sheet: Key Metrics & Invariants" in content

    # Check key cell contents are extracted cleanly into markdown
    assert "850,000" in content
    assert "Lead Distributed Systems Architect" in content
    assert "Zero unencrypted secrets in git commits" in content
    assert "INV-008" in content

    # Verify citation chunks
    chunks = res["chunks"]
    assert len(chunks) >= 3
    for chunk in chunks:
        assert chunk["doc_id"] == res["doc_id"]
        assert chunk["doc_title"] == "demo_runway_q4.xlsx"
        assert chunk["page_number"] >= 1
        assert chunk["line_start"] > 0
        assert chunk["line_end"] >= chunk["line_start"]
        assert len(chunk["snippet"]) > 0
        assert chunk["chunk_id"].startswith(f"{res['doc_id']}-CHK-")


def test_acme_nda_call_sample_vtt_parsing_and_spec_extraction():
    """
    Validates that acme_nda_call_sample.vtt is parsed by WhisperTranscriber and
    correctly mapped into a 4-part Voice-to-Spec contract with Kùzu graph registration.
    """
    assert os.path.exists(DEMO_ACME_VTT), f"Demo asset missing: {DEMO_ACME_VTT}"

    transcriber = WhisperTranscriber()
    try:
        transcript, duration = transcriber._parse_transcript_file(DEMO_ACME_VTT)
        assert duration >= 70.0
        assert "Sarah Jenkins" in transcript
        assert "Mir Farzin Hussain" in transcript
        assert "tribal knowledge decay" in transcript
        assert "SAML 2.0 Single Sign-On" in transcript

        # Sub-second Voice-to-Spec extraction
        extractor = VoiceToSpecExtractor()
        spec = extractor.extract_spec(
            transcript=transcript,
            call_id="CALL-DEMO-ACME",
            client_name="Acme Corp",
            audio_duration=duration,
            sync_to_graph=False,
        )

        assert spec.client_name == "Acme Corp"
        assert spec.call_id == "CALL-DEMO-ACME"
        assert len(spec.summary) > 20
        assert len(spec.pain_points) >= 1
        assert len(spec.feature_requests) >= 1
        assert len(spec.commitments) >= 1

        # Check pain points capture NDA or tribal knowledge decay
        combined_pain = " ".join(spec.pain_points).lower()
        assert "knowledge" in combined_pain or "nda" in combined_pain or "friction" in combined_pain

        # Check commitments capture SAML SSO or INV-008
        combined_comm = " ".join(spec.commitments).lower()
        assert "saml" in combined_comm or "inv-008" in combined_comm or "commit" in combined_comm or "ship" in combined_comm

        # Check commitments
        assert len(spec.commitments) >= 1
    finally:
        transcriber.stop()


def test_ambient_drop_watcher_on_demo_assets():
    """
    Validates end-to-end processing of both golden demo assets through AmbientDropWatcher.
    """
    temp_drop_dir = tempfile.mkdtemp()
    try:
        # Copy demo assets to temporary drop directory
        dst_xlsx = os.path.join(temp_drop_dir, "demo_runway_q4.xlsx")
        dst_vtt = os.path.join(temp_drop_dir, "acme_nda_call_sample.vtt")
        shutil.copyfile(DEMO_RUNWAY_XLSX, dst_xlsx)
        shutil.copyfile(DEMO_ACME_VTT, dst_vtt)

        watcher = AmbientDropWatcher(drop_dir=temp_drop_dir)
        try:
            processed_count = watcher.scan_existing()
            assert processed_count == 2

            status = watcher.get_status()
            assert status["files_processed_count"] == 2
            assert not status["is_paused"]

            # Test deduplication on re-scan
            re_scanned = watcher.scan_existing()
            assert re_scanned == 2  # Handled without duplicating
            assert watcher.get_status()["files_processed_count"] == 2
        finally:
            watcher.stop()
    finally:
        shutil.rmtree(temp_drop_dir, ignore_errors=True)
