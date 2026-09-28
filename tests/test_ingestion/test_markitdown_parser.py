# tests/test_ingestion/test_markitdown_parser.py
"""
Unit tests for Multi-Format Markitdown Office Pipeline and Excel table flattening.
"""
import os
import tempfile
import pytest
import openpyxl

from apps.api.ingestion.markitdown_parser import MarkitdownParser


@pytest.fixture
def parser():
    return MarkitdownParser()


def test_txt_markdown_parsing(parser):
    with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", encoding="utf-8", delete=False) as f:
        f.write("Company Strategy: Expand to enterprise clients in Q4.")
        temp_path = f.name

    try:
        res = parser.parse_file(temp_path, department="PRODUCT")
        assert res["doc_id"].startswith("DOC-")
        assert res["format"] == "txt"
        assert res["department"] == "PRODUCT"
        assert "Expand to enterprise clients" in res["content"]
        assert res["file_size_bytes"] > 0
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_csv_table_parsing(parser):
    with tempfile.NamedTemporaryFile(suffix=".csv", mode="w", encoding="utf-8", delete=False) as f:
        f.write("Department,Headcount,Budget\nSales,5,150000\nEngineering,10,350000\n")
        temp_path = f.name

    try:
        res = parser.parse_file(temp_path, department="FINANCE")
        assert res["format"] == "csv"
        assert res["table_count"] == 1
        assert "| Department | Headcount | Budget |" in res["content"]
        assert "| Sales | 5 | 150000 |" in res["content"]
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_excel_multi_sheet_flattening(parser):
    """Verify multi-sheet Excel files are flattened into clean semantic Markdown tables."""
    wb = openpyxl.Workbook()
    # Sheet 1: Runway
    ws1 = wb.active
    ws1.title = "Runway Projections"
    ws1.append(["Month", "Bank Balance", "Burn Rate"])
    ws1.append(["Oct 2026", "$850,000", "$65,000"])
    ws1.append(["Nov 2026", "$785,000", "$65,000"])

    # Sheet 2: Headcount
    ws2 = wb.create_sheet(title="Hiring Plan")
    ws2.append(["Role", "Target Hire Date", "Comp"])
    ws2.append(["Senior Backend", "Nov 1", "$160k"])

    with tempfile.NamedTemporaryFile(suffix=".xlsx", delete=False) as f:
        temp_path = f.name
        wb.save(temp_path)
    wb.close()

    try:
        res = parser.parse_file(temp_path, department="EXECUTIVE")
        assert res["format"] == "xlsx"
        assert res["table_count"] == 2
        # Verify Sheet 1
        assert "## Sheet: Runway Projections" in res["content"]
        assert "| Month | Bank Balance | Burn Rate |" in res["content"]
        assert "| Oct 2026 | $850,000 | $65,000 |" in res["content"]
        # Verify Sheet 2
        assert "## Sheet: Hiring Plan" in res["content"]
        assert "| Role | Target Hire Date | Comp |" in res["content"]
        assert "| Senior Backend | Nov 1 | $160k |" in res["content"]
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_sha256_deduplication(parser):
    """Verify parsing the exact same file twice returns cached result."""
    initial_count = len(parser.ingested_hashes)
    with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", encoding="utf-8", delete=False) as f:
        f.write("Deduplication test payload content.")
        temp_path = f.name

    try:
        res1 = parser.parse_file(temp_path)
        res2 = parser.parse_file(temp_path)
        assert res1["doc_id"] == res2["doc_id"]
        assert res1["file_hash"] == res2["file_hash"]
        assert len(parser.ingested_hashes) == initial_count + 1
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_missing_file_raises_not_found(parser):
    with pytest.raises(FileNotFoundError):
        parser.parse_file("non_existent_file_path_12345.pdf")


def test_semantic_chunking_citations(parser):
    """
    Verify semantic chunking outputs citation metadata conforming to SearchCitation contract:
    doc_id, doc_title, page_number, line_start, line_end, snippet.
    """
    content = """# Executive Summary
Line 2: Strategic direction for autonomous engineering.
Line 3: Air gap deployment protocols.
Line 4: Kùzu graph temporal memory.

### Page 2
Line 7: Invariant rule INV-008 enforcement.
Line 8: SAML 2.0 Single Sign-On requirements.
Line 9: Headcount budget allocations.
"""
    chunks = parser.chunk_markdown(content, doc_id="DOC-TEST01", doc_title="Executive Summary", max_chunk_chars=120)
    assert len(chunks) >= 2

    # Verify first chunk
    c1 = chunks[0]
    assert c1["doc_id"] == "DOC-TEST01"
    assert c1["doc_title"] == "Executive Summary"
    assert c1["page_number"] == 1
    assert c1["line_start"] == 1
    assert c1["line_end"] >= 1
    assert "Line 2: Strategic direction" in c1["snippet"]

    # Verify second chunk tracks page transition
    c_last = chunks[-1]
    assert c_last["page_number"] == 2
    assert c_last["line_end"] >= 7
    assert c_last["chunk_id"].startswith("DOC-TEST01-CHK-")

