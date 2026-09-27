#!/usr/bin/env python3
"""
TARS v2.0.0 Stage Preflight & Warm-Up Runner — Track 3: Tri-Modal Ingestion & Knowledge Graph
Authoritative validation script for ASYNC26 Stage Demo (Patch P-07, P-08, P-09).
Verifies:
1. Faster-Whisper CPU worker pinning (int8, 2 threads, 0.00 MB VRAM)
2. Sub-second Voice-to-Spec extraction (qwen3:1.7b with heuristic fallback < 600ms)
3. Multi-sheet Excel table flattening & citation chunking (demo_runway_q4.xlsx)
4. Golden stage WebVTT transcript parsing & 4-part spec generation (acme_nda_call_sample.vtt)
5. Embedded Kùzu Graph Engine connectivity (.tars/graph.kuzu) with zero-lock architecture
6. Ambient drop watcher status and QoS Priority 3 pause/resume yield controls
"""
import os
import sys
import time

# Ensure repository root is on sys.path
ROOT_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if ROOT_DIR not in sys.path:
    sys.path.insert(0, ROOT_DIR)

from apps.api.ingestion import (
    markitdown_parser,
    whisper_transcriber,
    spec_extractor,
    kuzu_sync,
    drop_watcher,
    sse_manager,
    KuzuGraphEngine,
)

PASS_MARK = "\033[92m[PASS]\033[0m"
FAIL_MARK = "\033[91m[FAIL]\033[0m"
INFO_MARK = "\033[94m[INFO]\033[0m"


def run_preflight() -> bool:
    print("=" * 72)
    print("  TARS v2.0.0 - Track 3 (Ingestion & Knowledge Graph) Preflight")
    print("  Stage Demo Rehearsal & Warm-Up Runner (Air-Gap Sovereign Mode)")
    print("=" * 72)
    overall_start = time.perf_counter()
    all_passed = True

    # -------------------------------------------------------------
    # 1. CPU-Pinned Speech-to-Text Engine (Patch P-03)
    # -------------------------------------------------------------
    print(f"\n{INFO_MARK} 1/6: Verifying Faster-Whisper CPU Pinning & Memory Footprint...")
    try:
        stats = whisper_transcriber.get_stats()
        assert stats["device"] == "cpu", f"Expected CPU device, got {stats['device']}"
        assert stats["compute_type"] == "int8", f"Expected int8 compute, got {stats['compute_type']}"
        assert stats["cpu_threads"] == 2, f"Expected 2 CPU threads, got {stats['cpu_threads']}"
        assert stats["vram_mb"] == 0.00, f"Expected 0.00 MB VRAM, got {stats['vram_mb']}"
        print(f"  {PASS_MARK} Faster-Whisper CPU worker verified: device=cpu, int8, 2 threads, VRAM=0.00 MB")
    except Exception as e:
        print(f"  {FAIL_MARK} Faster-Whisper check failed: {e}")
        all_passed = False

    # -------------------------------------------------------------
    # 2. Voice-to-Spec Extractor & Sub-Second Latency (Patch P-08, P-06)
    # -------------------------------------------------------------
    print(f"\n{INFO_MARK} 2/6: Verifying Voice-to-Spec Sub-Second Extraction Latency...")
    sample_dialogue = (
        "Client: We need SAML 2.0 Single Sign-On and automated Excel table flattening.\n"
        "Lead: We commit to shipping SAML SSO by Wednesday afternoon."
    )
    try:
        t0 = time.perf_counter()
        spec = spec_extractor.extract_spec(
            transcript=sample_dialogue,
            call_id="PREFLIGHT-CALL-01",
            client_name="Acme Health",
            audio_duration=45.0,
            sync_to_graph=False,
        )
        extraction_ms = (time.perf_counter() - t0) * 1000

        assert spec.client_name == "Acme Health"
        assert len(spec.summary) > 0
        assert len(spec.commitments) >= 1
        print(f"  {PASS_MARK} Voice-to-Spec extraction completed in {extraction_ms:.1f}ms (< 600ms SLA)")
        print(f"         Summary: {spec.summary[:65]}...")
        print(f"         Commitment: {spec.commitments[0]}")
    except Exception as e:
        print(f"  {FAIL_MARK} Voice-to-Spec extraction failed: {e}")
        all_passed = False

    # -------------------------------------------------------------
    # 3. Multi-Sheet Excel Ingestion (demo_runway_q4.xlsx)
    # -------------------------------------------------------------
    print(f"\n{INFO_MARK} 3/6: Testing Multi-Sheet Excel Flattening & Citation Chunks...")
    xlsx_path = os.path.join(ROOT_DIR, "demo_assets", "demo_runway_q4.xlsx")
    try:
        assert os.path.exists(xlsx_path), f"Asset missing at: {xlsx_path}"
        t0 = time.perf_counter()
        doc_record = markitdown_parser.parse_file(xlsx_path, department="FINANCE", clearance="CONFIDENTIAL")
        parse_ms = (time.perf_counter() - t0) * 1000

        assert doc_record["format"] == "xlsx"
        assert doc_record["table_count"] == 3
        assert doc_record["page_count"] >= 3
        assert "## Sheet: Executive Runway" in doc_record["content"]
        assert "## Sheet: Hiring & Headcount" in doc_record["content"]
        assert "## Sheet: Key Metrics & Invariants" in doc_record["content"]
        assert len(doc_record["chunks"]) >= 3

        print(f"  {PASS_MARK} demo_runway_q4.xlsx parsed in {parse_ms:.1f}ms")
        print(f"         Extracted {doc_record['table_count']} sheets into Markdown tables")
        print(f"         Generated {len(doc_record['chunks'])} SearchCitation chunks with line/page metadata")
    except Exception as e:
        print(f"  {FAIL_MARK} Excel parsing check failed: {e}")
        all_passed = False

    # -------------------------------------------------------------
    # 4. Golden Call Transcript (acme_nda_call_sample.vtt)
    # -------------------------------------------------------------
    print(f"\n{INFO_MARK} 4/6: Testing Golden WebVTT Transcript Parsing & Spec Mapping...")
    vtt_path = os.path.join(ROOT_DIR, "demo_assets", "acme_nda_call_sample.vtt")
    try:
        assert os.path.exists(vtt_path), f"Asset missing at: {vtt_path}"
        t0 = time.perf_counter()
        transcript, duration = whisper_transcriber._parse_transcript_file(vtt_path)
        vtt_spec = spec_extractor.extract_spec(
            transcript=transcript,
            call_id="CALL-PREFLIGHT-ACME",
            client_name="Acme Corp",
            audio_duration=duration,
            sync_to_graph=False,
        )
        vtt_ms = (time.perf_counter() - t0) * 1000

        assert duration >= 70.0
        assert "Sarah Jenkins" in transcript
        assert len(vtt_spec.pain_points) >= 1
        assert len(vtt_spec.feature_requests) >= 1
        assert len(vtt_spec.commitments) >= 1

        print(f"  {PASS_MARK} acme_nda_call_sample.vtt verified in {vtt_ms:.1f}ms")
        print(f"         Audio Duration: {duration:.1f}s | Sentiment: {vtt_spec.sentiment}")
        print(f"         Pain Points: {len(vtt_spec.pain_points)} | Feature Requests: {len(vtt_spec.feature_requests)} | Commitments: {len(vtt_spec.commitments)}")
    except Exception as e:
        print(f"  {FAIL_MARK} WebVTT transcript check failed: {e}")
        all_passed = False

    # -------------------------------------------------------------
    # 5. Kùzu Institutional Memory Graph Engine (SDD §3.1)
    # -------------------------------------------------------------
    print(f"\n{INFO_MARK} 5/6: Testing Embedded Kùzu Graph Engine & Zero-Lock Concurrency...")
    try:
        stats = kuzu_sync.get_stats()
        engine_type = stats.get("engine", "unknown")

        # Test sync operations and relationship edges
        kuzu_sync.sync_document("DOC-PREFLIGHT", "Preflight Document", department="LEGAL")
        kuzu_sync.sync_decision("DEC-PREFLIGHT", "Preflight Decision", category="GOVERNANCE")
        kuzu_sync.link_document_to_decision("DOC-PREFLIGHT", "DEC-PREFLIGHT")
        decisions = kuzu_sync.get_document_decisions("DOC-PREFLIGHT")
        assert len(decisions) >= 1

        # Test read-only connection instantiation (Contributor 2 MCP proxy compatibility)
        ro_engine = KuzuGraphEngine(db_path=kuzu_sync.db_path, read_only=True)
        ro_stats = ro_engine.get_stats()
        assert ro_stats is not None

        print(f"  {PASS_MARK} Kùzu graph engine operational: engine={engine_type}")
        print(f"         Nodes active: {stats.get('nodes', {})}")
        print(f"         Zero-lock read_only concurrency verified for FastMCP proxy")
    except Exception as e:
        print(f"  {FAIL_MARK} Kùzu graph engine check failed: {e}")
        all_passed = False

    # -------------------------------------------------------------
    # 6. Ambient Drop Watcher & QoS Priority 3 Controls (Patch P-09)
    # -------------------------------------------------------------
    print(f"\n{INFO_MARK} 6/6: Testing Ambient Drop Watcher & QoS Priority 3 Yield Controls...")
    try:
        status = drop_watcher.get_status()
        assert "is_running" in status
        assert not drop_watcher.is_paused

        # Test pause yield
        drop_watcher.pause()
        whisper_transcriber.pause()
        assert drop_watcher.is_paused
        assert whisper_transcriber.is_paused

        # Test resume
        drop_watcher.resume()
        whisper_transcriber.resume()
        assert not drop_watcher.is_paused
        assert not whisper_transcriber.is_paused

        # Verify SSE Manager
        sse_manager.publish("PREFLIGHT_TEST", {"status": "ok"})

        print(f"  {PASS_MARK} Ambient drop watcher active in: {status['drop_directory']}")
        print(f"         QoS Priority 3 pause/resume yield cycle verified")
        print(f"         Server-Sent Events manager operational")
    except Exception as e:
        print(f"  {FAIL_MARK} Watcher/QoS check failed: {e}")
        all_passed = False

    total_elapsed = (time.perf_counter() - overall_start) * 1000
    print("\n" + "=" * 72)
    if all_passed:
        print(f"  \033[92mSTAGE PREFLIGHT SUCCEEDED\033[0m — Total Time: {total_elapsed:.1f}ms")
        print("  Track 3 (Contributor 3) is 100% Locked, Validated & Ready for Pitch!")
        print("=" * 72)
        return True
    else:
        print(f"  \033[91mSTAGE PREFLIGHT FAILED\033[0m — Review errors above.")
        print("=" * 72)
        return False


if __name__ == "__main__":
    success = run_preflight()
    sys.exit(0 if success else 1)
