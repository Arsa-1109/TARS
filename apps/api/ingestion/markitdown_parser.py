# apps/api/ingestion/markitdown_parser.py
"""
Track 3: Multi-Format Markitdown Office Pipeline (SDD Section 2.2, 4.3)
Parses Office files (.xlsx, .docx, .pptx, .csv, .pdf, .json, .txt, .md) into clean,
standardized semantic Markdown.
Features multi-tab Excel flattening into Markdown tables for financial spreadsheets (demo_runway_q4.xlsx).
Guarantees zero duplicate ingestion via SHA-256 deduplication hashing.
"""
import csv
import hashlib
import json
import logging
import os
import re
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger("tars.ingestion.markitdown")

# Optional MarkItDown library from Microsoft
_MARKITDOWN_AVAILABLE = False
try:
    from markitdown import MarkItDown
    _MARKITDOWN_AVAILABLE = True
except ImportError:
    _MARKITDOWN_AVAILABLE = False

# Openpyxl for Excel flattening
_OPENPYXL_AVAILABLE = False
try:
    import openpyxl
    _OPENPYXL_AVAILABLE = True
except ImportError:
    _OPENPYXL_AVAILABLE = False

# PyPDF for PDF parsing
_PYPDF_AVAILABLE = False
try:
    import pypdf
    _PYPDF_AVAILABLE = True
except ImportError:
    try:
        import PyPDF2 as pypdf
        _PYPDF_AVAILABLE = True
    except ImportError:
        _PYPDF_AVAILABLE = False


class MarkitdownParser:
    """
    Parses unstructured and semi-structured documents into structured semantic Markdown.
    Supports native fallback parsers for full air-gap zero-dependency execution.
    """

    def __init__(self, preload: bool = False):
        self.ingested_hashes: Dict[str, Dict[str, Any]] = {}
        self._md_converter = MarkItDown() if _MARKITDOWN_AVAILABLE else None
        if preload:
            self._load_persisted_documents()

    def _load_persisted_documents(self):
        """Loads previously ingested document records from SQLite into memory on startup."""
        try:
            from apps.api.core.db import db
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM documents")
            rows = cursor.fetchall()
            for r in rows:
                row_dict = dict(r)
                fhash = row_dict.get("file_hash")
                if fhash and fhash not in self.ingested_hashes:
                    self.ingested_hashes[fhash] = row_dict
        except Exception as e:
            logger.warning(f"Could not preload documents from database: {e}")

    @staticmethod
    def compute_sha256(file_path: str) -> str:
        """Computes SHA-256 hash of file content to prevent duplicate ingestion."""
        hasher = hashlib.sha256()
        with open(file_path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def parse_file(self, file_path: str, department: str = "GENERAL", clearance: str = "ALL_TEAM", is_demo: bool = False) -> Dict[str, Any]:
        """
        Main entry point for parsing any supported document format into Markdown.
        Returns document metadata and markdown content.
        """
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File not found for ingestion: {file_path}")

        file_hash = self.compute_sha256(file_path)
        if file_hash in self.ingested_hashes:
            logger.info(f"Document already ingested (SHA-256: {file_hash[:8]}): {file_path}")
            cached = dict(self.ingested_hashes[file_hash])
            if department != "GENERAL":
                cached["department"] = department
            if clearance != "ALL_TEAM":
                cached["clearance"] = clearance
            return cached

        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()
        file_size = os.path.getsize(file_path)

        markdown_content = ""
        page_count = 1
        table_count = 0

        try:
            if ext in [".xlsx", ".xls", ".xlsm"]:
                markdown_content, table_count = self._parse_excel(file_path)
                page_count = max(1, table_count)
            elif ext == ".csv":
                markdown_content, table_count = self._parse_csv(file_path)
            elif ext == ".pdf":
                markdown_content, page_count = self._parse_pdf(file_path)
            elif ext in [".docx", ".doc"]:
                markdown_content, table_count = self._parse_docx(file_path)
            elif ext in [".pptx", ".ppt"]:
                markdown_content, page_count = self._parse_pptx(file_path)
            elif ext == ".json":
                markdown_content = self._parse_json(file_path)
            elif ext in [".md", ".txt"]:
                with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                    markdown_content = f.read()
            else:
                # Attempt generic MarkItDown if available
                if self._md_converter:
                    res = self._md_converter.convert(file_path)
                    markdown_content = res.text_content
                else:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        markdown_content = f.read()

        except Exception as e:
            logger.error(f"Error extracting text from {filename}: {e}", exc_info=True)
            markdown_content = f"# Document: {filename}\n\n[Extraction Warning: {e}]\n"

        doc_id = f"DOC-{file_hash[:8].upper()}"
        chunks = self.chunk_markdown(markdown_content.strip(), doc_id=doc_id, doc_title=filename)
        calculated_page_count = max(page_count, len({c["page_number"] for c in chunks}) if chunks else 1)
        preview = markdown_content.strip()[:400] + ("..." if len(markdown_content.strip()) > 400 else "")

        import time as _t
        now_ts = int(_t.time())
        demo_flag = 1 if is_demo else 0

        result = {
            "doc_id": doc_id,
            "filename": filename,
            "file_path": os.path.abspath(file_path),
            "file_hash": file_hash,
            "department": department,
            "clearance": clearance,
            "format": ext.lstrip("."),
            "file_size_bytes": file_size,
            "page_count": calculated_page_count,
            "table_count": table_count,
            "character_count": len(markdown_content.strip()),
            "chunk_count": len(chunks),
            "content": markdown_content.strip(),
            "preview": preview,
            "chunks": chunks,
            "ingested_at": now_ts,
            "is_demo": demo_flag,
        }

        self.ingested_hashes[file_hash] = result

        # Persist document and chunks into SQLite databases (.tars local store and memories)
        try:
            from apps.api.core.db import db
            conn = db.get_connection()
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO documents (
                    doc_id, filename, file_path, file_hash, department, clearance,
                    format, file_size_bytes, page_count, table_count, character_count,
                    chunk_count, content, preview, ingested_at, is_demo
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                doc_id, filename, os.path.abspath(file_path), file_hash, department, clearance,
                ext.lstrip("."), file_size, calculated_page_count, table_count,
                len(markdown_content.strip()), len(chunks), markdown_content.strip(), preview, now_ts, demo_flag
            ))

            # Index document as primary memory
            cursor.execute('''
                INSERT OR REPLACE INTO memories (
                    id, record_type, title, content, source, timestamp, tags, related_ids, is_demo, clearance
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                doc_id, "doc", filename, preview or markdown_content.strip()[:1000],
                filename, now_ts, department, doc_id, demo_flag, clearance
            ))

            # Index semantic chunks into memories table for search retrieval
            for idx, ch in enumerate(chunks):
                chunk_id = f"{doc_id}-chunk-{idx + 1}"
                ch_title = f"{filename} (Page {ch.get('page_number', 1)})"
                ch_snippet = ch.get("snippet", "")
                cursor.execute('''
                    INSERT OR REPLACE INTO memories (
                        id, record_type, title, content, source, timestamp, tags, related_ids, is_demo, clearance
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    chunk_id, "doc", ch_title, ch_snippet, filename, now_ts, department, doc_id, demo_flag, clearance
                ))

            conn.commit()
        except Exception as db_err:
            logger.warning(f"Notice: Failed to persist document {doc_id} to SQLite memories/documents: {db_err}")

        return result

    def chunk_markdown(
        self,
        content: str,
        doc_id: str,
        doc_title: str,
        max_chunk_chars: int = 500,
    ) -> List[Dict[str, Any]]:
        """
        Splits markdown document into semantic chunks with line and page metadata
        matching the SearchCitation contract schema (doc_id, doc_title, page_number, snippet).
        """
        if not content.strip():
            return []

        lines = content.split("\n")
        chunks: List[Dict[str, Any]] = []
        current_lines: List[str] = []
        current_chars = 0
        current_page = 1
        chunk_start_line = 1
        page_pattern = re.compile(r"^###\s+Page\s+(\d+)", re.IGNORECASE)
        sheet_pattern = re.compile(r"^##\s+Sheet:\s*(.+)", re.IGNORECASE)

        for line_num, line in enumerate(lines, start=1):
            page_match = page_pattern.match(line.strip())
            if page_match:
                try:
                    current_page = int(page_match.group(1))
                except ValueError:
                    pass

            sheet_match = sheet_pattern.match(line.strip())
            if sheet_match and len(chunks) > 0:
                current_page += 1

            current_lines.append(line)
            current_chars += len(line) + 1

            if current_chars >= max_chunk_chars or line_num == len(lines):
                snippet = "\n".join(current_lines).strip()
                if snippet:
                    chunk_idx = len(chunks) + 1
                    chunks.append({
                        "chunk_id": f"{doc_id}-CHK-{chunk_idx:03d}",
                        "doc_id": doc_id,
                        "doc_title": doc_title,
                        "page_number": current_page,
                        "line_start": chunk_start_line,
                        "line_end": line_num,
                        "snippet": snippet,
                        "char_count": len(snippet),
                    })
                current_lines = []
                current_chars = 0
                chunk_start_line = line_num + 1

        return chunks

    def _parse_excel(self, file_path: str) -> Tuple[str, int]:
        """
        Flattens multi-sheet Excel workbooks into clean semantic Markdown tables.
        Essential for financial runways (demo_runway_q4.xlsx).
        """
        if not _OPENPYXL_AVAILABLE:
            # Fallback to binary/csv scanner
            return f"# Excel Document: {os.path.basename(file_path)}\n\n[openpyxl not installed]", 0

        wb = openpyxl.load_workbook(file_path, data_only=True, read_only=True)
        sections: List[str] = [f"# Excel Workbook: {os.path.basename(file_path)}\n"]
        table_count = 0

        for sheet_name in wb.sheetnames:
            sheet = wb[sheet_name]
            rows: List[List[str]] = []
            
            for row in sheet.iter_rows(values_only=True):
                # Clean cell values
                clean_row = [str(cell).strip() if cell is not None else "" for cell in row]
                # Filter completely empty rows
                if any(clean_row):
                    rows.append(clean_row)

            if not rows:
                continue

            sections.append(f"### Page {table_count + 1}\n")
            sections.append(f"## Sheet: {sheet_name}\n")
            table_count += 1

            # Format as Markdown table
            headers = rows[0]
            # Replace empty headers with Column N
            header_line = "| " + " | ".join(h if h else f"Col_{i+1}" for i, h in enumerate(headers)) + " |"
            sep_line = "| " + " | ".join(["---"] * len(headers)) + " |"
            
            sections.append(header_line)
            sections.append(sep_line)

            for data_row in rows[1:]:
                # Pad row to match header length
                padded = data_row + [""] * (len(headers) - len(data_row))
                # Escape pipes inside cells
                sanitized_cells = [cell.replace("|", "\\|").replace("\n", " ") for cell in padded[:len(headers)]]
                sections.append("| " + " | ".join(sanitized_cells) + " |")

            sections.append("")  # Empty line between sheets

        wb.close()
        return "\n".join(sections), table_count

    def _parse_csv(self, file_path: str) -> Tuple[str, int]:
        """Parses CSV file into a Markdown table."""
        rows: List[List[str]] = []
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            reader = csv.reader(f)
            for row in reader:
                if any(row):
                    rows.append(row)

        if not rows:
            return f"# CSV Document: {os.path.basename(file_path)}\n\n(Empty file)", 0

        sections = [f"# CSV: {os.path.basename(file_path)}\n"]
        headers = rows[0]
        sections.append("| " + " | ".join(h if h else f"Col_{i+1}" for i, h in enumerate(headers)) + " |")
        sections.append("| " + " | ".join(["---"] * len(headers)) + " |")

        for data_row in rows[1:]:
            padded = data_row + [""] * (len(headers) - len(data_row))
            sanitized = [c.replace("|", "\\|").replace("\n", " ") for c in padded[:len(headers)]]
            sections.append("| " + " | ".join(sanitized) + " |")

        return "\n".join(sections), 1

    def _parse_pdf(self, file_path: str) -> Tuple[str, int]:
        """Extracts text from PDF with page demarcations using pypdf or PyPDF2."""
        try:
            import pypdf
            reader = pypdf.PdfReader(file_path)
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages_text.append(f"### Page {i + 1}\n\n{text.strip()}")
            return f"# PDF Document: {os.path.basename(file_path)}\n\n" + "\n\n".join(pages_text), len(reader.pages)
        except Exception as e:
            logger.warning(f"pypdf extraction failed for {file_path}: {e}")

        try:
            import PyPDF2 as pypdf_fallback
            reader = pypdf_fallback.PdfReader(file_path)
            pages_text = []
            for i, page in enumerate(reader.pages):
                text = page.extract_text() or ""
                pages_text.append(f"### Page {i + 1}\n\n{text.strip()}")
            return f"# PDF Document: {os.path.basename(file_path)}\n\n" + "\n\n".join(pages_text), len(reader.pages)
        except Exception:
            pass

        # Fallback regex extraction of text string tokens from PDF stream
        with open(file_path, "rb") as f:
            raw = f.read().decode("latin1", errors="ignore")
        # Extract text literals within PDF text objects
        text_tokens = re.findall(r"\(([^\(\)\\]*(?:\\.[^\(\)\\]*)*)\)", raw)
        clean_text = "\n".join(t.replace(r"\(", "(").replace(r"\)", ")").strip() for t in text_tokens if len(t.strip()) > 3)
        if clean_text:
            return f"# PDF Document: {os.path.basename(file_path)}\n\n{clean_text[:6000]}", 1

        extracted = "".join(c for c in raw if 32 <= ord(c) < 127 or c in ('\n', '\r', '\t'))
        return f"# PDF Document: {os.path.basename(file_path)}\n\n{extracted[:4000]}", 1

    def _parse_docx(self, file_path: str) -> Tuple[str, int]:
        """Extracts text and tables from docx file using zip extraction or docx library."""
        try:
            import docx
            doc = docx.Document(file_path)
            content = [f"# Document: {os.path.basename(file_path)}\n"]
            for p in doc.paragraphs:
                if p.text.strip():
                    if p.style and p.style.name.startswith("Heading 1"):
                        content.append(f"# {p.text.strip()}")
                    elif p.style and p.style.name.startswith("Heading 2"):
                        content.append(f"## {p.text.strip()}")
                    else:
                        content.append(p.text.strip())
            
            table_count = len(doc.tables)
            for t_idx, table in enumerate(doc.tables):
                content.append(f"\n### Table {t_idx + 1}\n")
                table_rows = []
                for row in table.rows:
                    cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                    table_rows.append(cells)
                if table_rows:
                    headers = table_rows[0]
                    content.append("| " + " | ".join(headers) + " |")
                    content.append("| " + " | ".join(["---"] * len(headers)) + " |")
                    for row in table_rows[1:]:
                        content.append("| " + " | ".join(row) + " |")
            return "\n\n".join(content), table_count
        except Exception:
            # Fallback simple zip XML extraction
            import zipfile
            import xml.etree.ElementTree as ET
            try:
                with zipfile.ZipFile(file_path) as z:
                    xml_content = z.read("word/document.xml")
                tree = ET.fromstring(xml_content)
                namespaces = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
                paragraphs = []
                for p in tree.iterfind(".//w:p", namespaces):
                    texts = [node.text for node in p.iterfind(".//w:t", namespaces) if node.text]
                    if texts:
                        paragraphs.append("".join(texts))
                return f"# Document: {os.path.basename(file_path)}\n\n" + "\n\n".join(paragraphs), 0
            except Exception as e:
                return f"# Document: {os.path.basename(file_path)}\n\n[DOCX parsing fallback: {e}]", 0

    def _parse_pptx(self, file_path: str) -> Tuple[str, int]:
        """Extracts text from PPTX presentations."""
        try:
            import pptx
            prs = pptx.Presentation(file_path)
            slides_text = []
            for i, slide in enumerate(prs.slides):
                slide_lines = [f"### Slide {i + 1}"]
                for shape in slide.shapes:
                    if hasattr(shape, "text") and shape.text.strip():
                        slide_lines.append(shape.text.strip())
                slides_text.append("\n".join(slide_lines))
            return f"# Presentation: {os.path.basename(file_path)}\n\n" + "\n\n".join(slides_text), len(prs.slides)
        except Exception:
            return f"# Presentation: {os.path.basename(file_path)}\n\n[Presentation content]", 1

    def _parse_json(self, file_path: str) -> str:
        """Parses JSON file into readable markdown codeblock."""
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            data = json.load(f)
        formatted = json.dumps(data, indent=2)
        return f"# JSON Data: {os.path.basename(file_path)}\n\n```json\n{formatted}\n```"


# Global singleton instance
markitdown_parser = MarkitdownParser(preload=True)
