# tests/test_doc_ingester.py
"""
Unit & Edge-Case Tests for DocumentIngester (apps/api/ingestion/doc_ingester.py)
"""
import os
import pytest
from apps.api.ingestion.doc_ingester import DocumentIngester

DROP_DIR = os.path.join(os.getcwd(), "drop")


@pytest.fixture
def ingester():
    return DocumentIngester()


def test_file_not_found(ingester):
    """Attempting to ingest a missing file raises FileNotFoundError."""
    with pytest.raises(FileNotFoundError):
        ingester.ingest_document(os.path.join(DROP_DIR, "non_existent_doc.pdf"))


def test_json_parsing_nested_structures(ingester):
    """Valid JSON files with nested structures are ingested and indented."""
    test_json = os.path.join(DROP_DIR, "test_config.json")
    with open(test_json, "w", encoding="utf-8") as f:
        f.write('{"team": "Four Knights", "budget": {"runway_months": 18, "currency": "USD"}}')

    res = ingester.ingest_document(test_json, department="ENGINEERING")
    assert res["doc_id"].startswith("DOC-")
    assert "Four Knights" in res["content"]
    assert "runway_months" in res["content"]
    assert res["department"] == "ENGINEERING"

    if os.path.exists(test_json):
        os.remove(test_json)


def test_malformed_json_fallback(ingester):
    """Malformed JSON files are ingested gracefully without unhandled crashes."""
    bad_json = os.path.join(DROP_DIR, "broken.json")
    with open(bad_json, "w", encoding="utf-8") as f:
        f.write('{team: "unquoted keys, missing brackets')

    res = ingester.ingest_document(bad_json)
    assert res["doc_id"].startswith("DOC-")
    assert "Extraction Error" in res["content"] or "broken.json" in res["filename"]

    if os.path.exists(bad_json):
        os.remove(bad_json)


def test_csv_table_parsing(ingester):
    """CSV files are parsed and delimited with pipe format."""
    test_csv = os.path.join(DROP_DIR, "test_cap_table.csv")
    with open(test_csv, "w", encoding="utf-8") as f:
        f.write("Shareholder,Equity,Shares\nFounder 1,51%,510000\nFounder 2,49%,490000\n")

    res = ingester.ingest_document(test_csv, department="LEGAL")
    assert "Founder 1 | 51% | 510000" in res["content"]
    assert res["department"] == "LEGAL"

    if os.path.exists(test_csv):
        os.remove(test_csv)


def test_sha256_idempotency_and_distinct_hashes(ingester):
    """Verifies SHA-256 hash idempotency on identical files and divergence on different files."""
    file_a = os.path.join(DROP_DIR, "doc_a.txt")
    file_b = os.path.join(DROP_DIR, "doc_b.txt")

    with open(file_a, "w", encoding="utf-8") as f:
        f.write("Identical startup strategy text.")
    with open(file_b, "w", encoding="utf-8") as f:
        f.write("Divergent content for different hash.")

    res_a1 = ingester.ingest_document(file_a)
    res_a2 = ingester.ingest_document(file_a)
    res_b = ingester.ingest_document(file_b)

    # Identical files share hash and doc_id
    assert res_a1["file_hash"] == res_a2["file_hash"]
    assert res_a1["doc_id"] == res_a2["doc_id"]

    # Different files have distinct hashes
    assert res_a1["file_hash"] != res_b["file_hash"]
    assert res_a1["doc_id"] != res_b["doc_id"]

    if os.path.exists(file_a):
        os.remove(file_a)
    if os.path.exists(file_b):
        os.remove(file_b)


def test_unsupported_extension_fallback(ingester):
    """Files with arbitrary or custom extensions are read as plaintext fallback."""
    custom_doc = os.path.join(DROP_DIR, "notes.customext")
    with open(custom_doc, "w", encoding="utf-8") as f:
        f.write("Meeting notes with special extension format.")

    res = ingester.ingest_document(custom_doc)
    assert "Meeting notes with special extension" in res["content"]

    if os.path.exists(custom_doc):
        os.remove(custom_doc)
