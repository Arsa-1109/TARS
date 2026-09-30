import re
from typing import List, Dict, Any
from apps.api.core.db import db
from apps.api.schemas.contracts import SearchCitation
from apps.api.core.concurrency import search_governor, Priority
from apps.api.ingestion.markitdown_parser import markitdown_parser

class UnifiedSearchService:
    def __init__(self):
        pass

    async def search(
        self,
        query: str,
        clearance: str = "ALL_TEAM",
        limit: int = 5,
        priority: int = Priority.INTERACTIVE
    ) -> List[SearchCitation]:
        await search_governor.acquire(priority)
        try:
            tokens = [t.lower() for t in re.findall(r"\w+", query) if len(t) >= 2]
            stop_words = {"the", "and", "for", "with", "what", "how", "our", "are", "from", "that", "this", "can", "you", "about"}
            keywords = [t for t in tokens if t not in stop_words]
            if not keywords:
                clean_q = query.lower().strip()
                keywords = [clean_q] if clean_q else []

            if not keywords:
                return []

            # Prepare regex patterns with whole-word boundaries to avoid greedy substring false-positives
            kw_patterns = [re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE) for kw in keywords]

            # Clearance hierarchy enforcement (Bugs 11 & 15)
            # EXECUTIVE_ONLY can see both ALL_TEAM and EXECUTIVE_ONLY
            is_exec = (clearance or "").upper() in ("EXECUTIVE_ONLY", "FOUNDER", "EXECUTIVE")
            allowed_clearances = ["ALL_TEAM", "EXECUTIVE_ONLY"] if is_exec else ["ALL_TEAM"]

            conn = db.get_connection()
            cursor = conn.cursor()

            # Retrieve candidate memories with clearance
            cursor.execute("PRAGMA table_info(memories)")
            has_clr = any(row[1] == "clearance" for row in cursor.fetchall())
            if has_clr:
                cursor.execute("SELECT id, title, content, source, clearance FROM memories")
            else:
                cursor.execute("SELECT id, title, content, source FROM memories")
            rows = cursor.fetchall()
            
            scored_results = []
            for row in rows:
                row_clr = row["clearance"] if has_clr and "clearance" in row.keys() and row["clearance"] else "ALL_TEAM"
                doc_id = row["id"]
                title = row["title"] or ""
                content = row["content"] or ""
                source = row["source"] or ""

                # Defense-in-depth: Cap table / equity files strictly restricted to EXECUTIVE_ONLY
                is_cap_table = "cap_table" in title.lower() or "cap_table" in source.lower() or "equity" in title.lower() or "equity" in source.lower()
                if is_cap_table and not is_exec:
                    continue

                if row_clr not in allowed_clearances:
                    continue

                # Calculate match score based on whole-word regex matches
                score = 0
                for pattern in kw_patterns:
                    if pattern.search(title):
                        score += 5
                    hits = len(pattern.findall(content))
                    if hits > 0:
                        score += min(hits * 2, 4)

                if score > 0:
                    snippet = self._extract_snippet(content, keywords)
                    scored_results.append((score, SearchCitation(
                        doc_id=doc_id,
                        doc_title=title,
                        page_number=1,
                        snippet=snippet
                    )))

            # Search Kùzu Graph Decisions (Bug 2: Global Search Missing Decisions)
            try:
                from apps.api.cortex.graph import graph_engine
                decisions = graph_engine.get_all_decisions()
                for d in decisions:
                    d_clr = d.get("clearance", "ALL_TEAM")
                    if d_clr not in allowed_clearances:
                        continue
                    d_id = d.get("id", "DEC-ADR")
                    d_title = d.get("title", "")
                    d_ctx = d.get("context", "")
                    d_opt = d.get("chosen_option", "")
                    d_text = f"{d_title}\n{d_ctx}\n{d_opt}"

                    d_score = 0
                    for pattern in kw_patterns:
                        if pattern.search(d_title):
                            d_score += 6
                        hits = len(pattern.findall(d_text))
                        if hits > 0:
                            d_score += min(hits * 2, 5)

                    if d_score > 0:
                        snippet = self._extract_snippet(d_ctx or d_opt or d_title, keywords)
                        scored_results.append((d_score, SearchCitation(
                            doc_id=d_id,
                            doc_title=f"[ADR] {d_title}",
                            page_number=1,
                            snippet=snippet
                        )))
            except Exception:
                pass

            # If no sqlite results, search in-memory markitdown parsed cache
            if not scored_results:
                for fhash, doc in markitdown_parser.ingested_hashes.items():
                    doc_clr = doc.get("clearance", "ALL_TEAM")
                    if doc_clr not in allowed_clearances:
                        continue
                    content = doc.get("content", "")
                    title = doc.get("filename", "")
                    score = 0
                    for pattern in kw_patterns:
                        if pattern.search(title):
                            score += 5
                        if pattern.search(content):
                            score += 2
                    if score > 0:
                        scored_results.append((score, SearchCitation(
                            doc_id=doc.get("doc_id", fhash[:8]),
                            doc_title=title,
                            page_number=1,
                            snippet=self._extract_snippet(content, keywords)
                        )))

            # Sort descending by match score
            scored_results.sort(key=lambda x: x[0], reverse=True)

            # Deduplicate by document base ID & title (Bug 18: citation duplication)
            seen_keys = set()
            unique_citations: List[SearchCitation] = []
            for _, cit in scored_results:
                clean_title = cit.doc_title.split(" (Page ")[0].strip()
                base_id = cit.doc_id.split("-chunk-")[0].strip()
                dedup_key = (base_id, clean_title)
                if dedup_key not in seen_keys:
                    seen_keys.add(dedup_key)
                    unique_citations.append(cit)
                if len(unique_citations) >= limit:
                    break

            return unique_citations
        finally:
            await search_governor.release()

    def _extract_snippet(self, content: str, keywords: List[str], max_chars: int = 280) -> str:
        if not content:
            return ""
        
        # Split into sentences or lines
        sentences = [s.strip() for s in re.split(r"[.\n]+", content) if len(s.strip()) > 15]
        best_sentence = ""
        max_hits = -1

        for sent in sentences:
            hits = sum(1 for kw in keywords if kw in sent.lower())
            if hits > max_hits:
                max_hits = hits
                best_sentence = sent

        if best_sentence:
            return best_sentence[:max_chars] + ("..." if len(best_sentence) > max_chars else "")
        return content[:max_chars] + ("..." if len(content) > max_chars else "")

search_service = UnifiedSearchService()
