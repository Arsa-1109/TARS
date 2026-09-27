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
    with tempfile.NamedTemporaryFile(suffix=".txt", mode="w", encoding="utf-8", delete=False) as f:
        f.write("Deduplication test payload content.")
        temp_path = f.name

    try:
        res1 = parser.parse_file(temp_path)
        res2 = parser.parse_file(temp_path)
        assert res1["doc_id"] == res2["doc_id"]
        assert res1["file_hash"] == res2["file_hash"]
        assert len(parser.ingested_hashes) == 1
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


def test_missing_file_raises_not_found(parser):
    with pytest.raises(FileNotFoundError):
        parser.parse_file("non_existent_file_path_12345.pdf")
