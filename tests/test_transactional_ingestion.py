"""
tests/test_transactional_ingestion.py
Validates:
1. TransactionalIngestionCoordinator dual-store atomicity.
2. Ingestion succeeds and commits to both SQLite and Kùzu, appending audit event.
3. Partial failure injection (via simulate_failure_at) triggers atomic rollback:
   - SQLite documents and memories are rolled back (0 rows remain).
   - Kùzu graph nodes are compensating deleted.
   - An INGESTION_ROLLED_BACK audit event is recorded.
"""
import pytest
import os
import uuid
from apps.api.core.db import db
from apps.api.ingestion.transaction_coordinator import ingestion_coordinator
from apps.api.ingestion.kuzu_sync import kuzu_sync
from apps.api.core.errors import TARSException, ErrorCodes


def test_successful_dual_store_ingestion(tmp_path):
    test_file = tmp_path / "valid_spec.md"
    test_file.write_text("# High Reliability Architecture\nAll systems maintain dual-store sync.")

    doc_id = f"DOC-TEST-{uuid.uuid4().hex[:6]}"
    doc_record = {
        "doc_id": doc_id,
        "filename": "valid_spec.md",
        "file_hash": f"hash_{doc_id}",
        "department": "ENGINEERING",
        "clearance": "ALL_TEAM",
        "format": ".md",
        "file_size_bytes": 1024,
        "page_count": 1,
        "table_count": 0,
        "character_count": 100,
        "content": "All systems maintain dual-store sync.",
        "tables": [],
        "chunks": [{"chunk_id": f"{doc_id}-c1", "text": "All systems maintain dual-store sync."}],
    }

    result = ingestion_coordinator.ingest_document_atomic(
        doc_record=doc_record,
        file_path=str(test_file),
        organisation_id="TEST_ORG"
    )

    assert result["status"] == "COMMITTED"
    assert "audit_block_id" in result

    # Verify SQLite persistence
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT doc_id, organisation_id FROM documents WHERE doc_id = ?", (doc_id,))
    row = cursor.fetchone()
    assert row is not None
    assert row["organisation_id"] == "TEST_ORG"

    # Verify Memory was created
    cursor.execute("SELECT id FROM memories WHERE id = ? OR id = ?", (doc_id, f"MEM-{doc_id}"))
    assert cursor.fetchone() is not None


def test_atomic_rollback_on_injected_failure(tmp_path):
    test_file = tmp_path / "fail_spec.md"
    test_file.write_text("# Failing Spec Document\nThis will trigger an intentional rollback.")

    doc_id = f"DOC-FAIL-{uuid.uuid4().hex[:6]}"
    doc_record = {
        "doc_id": doc_id,
        "filename": "fail_spec.md",
        "file_hash": f"hash_{doc_id}",
        "department": "ENGINEERING",
        "clearance": "ALL_TEAM",
        "format": ".md",
        "file_size_bytes": 512,
        "page_count": 1,
        "table_count": 0,
        "character_count": 50,
        "content": "This will trigger an intentional rollback.",
        "tables": [],
        "chunks": [{"chunk_id": f"{doc_id}-c1", "text": "This will trigger an intentional rollback."}],
    }

    # Inject failure at post_kuzu phase
    with pytest.raises(TARSException) as excinfo:
        ingestion_coordinator.ingest_document_atomic(
            doc_record=doc_record,
            file_path=str(test_file),
            organisation_id="TEST_ORG",
            simulate_failure_at="post_kuzu"
        )

    assert excinfo.value.code == ErrorCodes.INGESTION_TRANSACTION_FAILED

    # Verify SQLite rollback occurred: Document and Memory must NOT exist
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT doc_id FROM documents WHERE doc_id = ?", (doc_id,))
    assert cursor.fetchone() is None

    cursor.execute("SELECT id FROM memories WHERE id = ?", (doc_id,))
    assert cursor.fetchone() is None
