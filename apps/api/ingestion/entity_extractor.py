# apps/api/ingestion/entity_extractor.py
"""
Semantic Graph Entity Extractor & Institutional Glossary Cache (Points 22 & 49)
Extracts key institutional entities:
- Person
- Company
- Decision
- Policy
- Commitment
- Technology
- Risk
from ingested document contents and indexes them in SQLite institutional_glossary
as well as the embedded Kùzu graph store.
"""
import logging
import re
import time
from typing import Dict, Any, List, Optional
from apps.api.core.db import db
from apps.api.ingestion.kuzu_sync import kuzu_sync

logger = logging.getLogger("tars.ingestion.entity_extractor")

# Common rule-based and regex patterns for institutional entity extraction
PATTERNS = {
    "POLICY": [
        re.compile(r"\b(BDR-\d{3,4}|POL-\d{3,4}|INV-\d{3,4})\b", re.IGNORECASE),
        re.compile(r"\bpolicy\s*:\s*([^\n\.;]+)", re.IGNORECASE),
    ],
    "DECISION": [
        re.compile(r"\b(DEC-\d{3,4}|ADR-\d{3,4})\b", re.IGNORECASE),
        re.compile(r"\bdecision\s*:\s*([^\n\.;]+)", re.IGNORECASE),
    ],
    "COMMITMENT": [
        re.compile(r"\b(COM-[A-Z0-9\-]+)\b", re.IGNORECASE),
        re.compile(r"\bcontingent on\s+([^\n\.;]+)", re.IGNORECASE),
        re.compile(r"\bdeliverable\s*:\s*([^\n\.;]+)", re.IGNORECASE),
    ],
    "TECHNOLOGY": [
        re.compile(r"\b(FastAPI|SQLite|Kùzu|Kuzu|PyTorch|Whisper|React\s*19|TypeScript|Python|Docker|Tree-sitter|WAL|Ollama|SLM)\b", re.IGNORECASE),
    ],
    "RISK": [
        re.compile(r"\brisk\s*:\s*([^\n\.;]+)", re.IGNORECASE),
        re.compile(r"\b(breach|outage|churn|lawsuit|security vulnerability|data loss)\b", re.IGNORECASE),
    ],
}


class InstitutionalEntityExtractor:
    """Extracts institutional domain entities from text and commits them to glossary & graph."""

    def __init__(self):
        pass

    def extract_entities(self, text: str, doc_id: str, organisation_id: str = "CMP-GENESIS-01") -> List[Dict[str, Any]]:
        if not text:
            return []

        extracted: List[Dict[str, Any]] = []
        seen_terms = set()
        now_ts = int(time.time())

        # 1. Regex Pattern Matching for Core Structured Identifiers
        for category, regex_list in PATTERNS.items():
            for rgx in regex_list:
                for match in rgx.finditer(text):
                    term = match.group(1).strip() if match.groups() else match.group(0).strip()
                    clean_term = term.strip(": -.,'\"")
                    if not clean_term or len(clean_term) < 2 or len(clean_term) > 80:
                        continue
                    term_key = (clean_term.lower(), category)
                    if term_key in seen_terms:
                        continue
                    seen_terms.add(term_key)

                    # Extract surrounding context sentence as definition
                    start_pos = max(0, match.start() - 60)
                    end_pos = min(len(text), match.end() + 100)
                    definition = text[start_pos:end_pos].replace("\n", " ").strip()

                    extracted.append({
                        "term": clean_term,
                        "category": category,
                        "definition": definition,
                        "canonical_ref": f"doc:{doc_id}",
                        "organisation_id": organisation_id,
                        "created_at": now_ts,
                        "updated_at": now_ts,
                    })

        # 2. Known Institutional Executive / Team Entities
        exec_entities = [
            ("Alex Vance", "PERSON", "Chief Executive Officer & Co-Founder"),
            ("Dr. Elena Rostova", "PERSON", "Chief Technology Officer & Co-Founder"),
            ("Marcus Chen", "PERSON", "Head of Product"),
            ("Sarah Jenkins", "PERSON", "Head of Enterprise Sales"),
            ("Liam Patel", "PERSON", "Lead Systems Architect & Senior Backend Engineer"),
            ("Chloe Dubois", "PERSON", "Founding Full-Stack & UI/UX Engineer"),
            ("Acme Corp", "COMPANY", "Enterprise client with $80K ARR commitment"),
            ("AetherFlow", "COMPANY", "Autonomous institutional memory intelligence platform"),
        ]

        text_lower = text.lower()
        for name, cat, default_def in exec_entities:
            if name.lower() in text_lower:
                term_key = (name.lower(), cat)
                if term_key not in seen_terms:
                    seen_terms.add(term_key)
                    extracted.append({
                        "term": name,
                        "category": cat,
                        "definition": default_def,
                        "canonical_ref": f"doc:{doc_id}",
                        "organisation_id": organisation_id,
                        "created_at": now_ts,
                        "updated_at": now_ts,
                    })

        return extracted

    def record_entities(
        self,
        entities: List[Dict[str, Any]],
        doc_id: str,
        organisation_id: str = "CMP-GENESIS-01",
    ) -> int:
        """Stores extracted entities in SQLite institutional_glossary and Kùzu graph nodes/edges."""
        if not entities:
            return 0

        conn = db.get_connection()
        inserted_count = 0
        now_ts = int(time.time())

        for ent in entities:
            try:
                conn.execute(
                    """
                    INSERT INTO institutional_glossary (
                        term, category, definition, canonical_ref, organisation_id, clearance, created_at, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(term, organisation_id) DO UPDATE SET
                        definition = excluded.definition,
                        canonical_ref = excluded.canonical_ref,
                        updated_at = excluded.updated_at
                    """,
                    (
                        ent["term"],
                        ent["category"],
                        ent["definition"],
                        ent.get("canonical_ref", f"doc:{doc_id}"),
                        organisation_id,
                        ent.get("clearance", "ALL_TEAM"),
                        ent.get("created_at", now_ts),
                        now_ts,
                    ),
                )
                inserted_count += 1
            except Exception as e:
                logger.warning(f"Error persisting glossary entity {ent['term']}: {e}")

        try:
            conn.commit()
        except Exception:
            pass

        # Optional: Link in Kùzu graph
        for ent in entities:
            if ent["category"] == "DECISION":
                try:
                    kuzu_sync.link_document_to_decision(doc_id, ent["term"])
                except Exception:
                    pass

        return inserted_count


entity_extractor = InstitutionalEntityExtractor()
