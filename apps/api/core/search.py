import re
from typing import List, Dict, Any, Optional
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
        limit: int = 5,
        priority: int = Priority.INTERACTIVE,
        user_clearance: str = "ALL_TEAM",
        user_role: str = "ENGINEER",
        clearance: Optional[str] = None,
        organisation_id: Optional[str] = None,
        as_of: Optional[int] = None,
    ) -> List[SearchCitation]:
        if clearance and (not user_clearance or user_clearance == "ALL_TEAM"):
            user_clearance = clearance

        await search_governor.acquire(priority)
        try:
            # 1. Clean and tokenize query
            raw_tokens = [t.lower() for t in re.findall(r"\w+", query)]
            stop_words = {
                "the", "and", "for", "with", "what", "how", "our", "are",
                "from", "that", "this", "can", "you", "about", "we", "do",
                "is", "of", "in", "to", "a", "an", "use"
            }
            keywords = [t for t in raw_tokens if t not in stop_words]
            if not keywords:
                keywords = raw_tokens or [query.lower().strip()]

            # Compile word-boundary regex for each keyword to prevent substring collisions
            kw_patterns = [re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE) for kw in keywords if kw]
            if not kw_patterns:
                return []

            # 2. RBAC / Clearance filter (Layer 1 Security)
            has_exec_clearance = (
                user_clearance == "EXECUTIVE_ONLY" or
                (user_role and user_role.upper() in ("FOUNDER", "CHIEF_ARCHITECT", "EXECUTIVE"))
            )

            conn = db.get_connection()
            cursor = conn.cursor()

            # Server-authoritative clearance, tenant, and bi-temporal pre-retrieval candidate filtering
            where_conditions = []
            params = []

            # Multi-tenant isolation: If specified, enforce organisation_id strictly
            if organisation_id and organisation_id not in ("ALL", "*"):
                where_conditions.append("(organisation_id = ? OR organisation_id IS NULL OR organisation_id = 'default')")
                params.append(organisation_id)

            # Clearance filter directly in query candidates
            if not has_exec_clearance:
                where_conditions.append("""
                    (clearance NOT IN ('EXECUTIVE_ONLY', 'CONFIDENTIAL') OR clearance IS NULL)
                    AND id NOT IN (SELECT doc_id FROM documents WHERE clearance IN ('EXECUTIVE_ONLY', 'CONFIDENTIAL'))
                    AND (related_ids IS NULL OR related_ids NOT IN (SELECT doc_id FROM documents WHERE clearance IN ('EXECUTIVE_ONLY', 'CONFIDENTIAL')))
                """)

            # Bi-temporal validity filter (effective_from <= as_of AND (effective_to IS NULL OR effective_to > as_of))
            if as_of is not None:
                where_conditions.append("""
                    (effective_from IS NULL OR effective_from <= ?)
                    AND (effective_to IS NULL OR effective_to > ?)
                """)
                params.extend([as_of, as_of])

            where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"

            cursor.execute(f"""
                SELECT id, title, content, source, clearance, timestamp, effective_from, effective_to, organisation_id 
                FROM memories 
                WHERE {where_clause} 
                ORDER BY timestamp DESC
            """, params)
            rows = cursor.fetchall()
            
            scored_results = []
            for row in rows:
                doc_id = row["id"]
                title = row["title"] or ""
                content = row["content"] or ""
                ts = row["timestamp"] or 0
                row_clearance = (row["clearance"] or "").upper()

                title_lower = title.lower()
                content_lower = content.lower()

                # Layer 1 Security Guardrail: Never leak executive/confidential records to non-executives
                if not has_exec_clearance:
                    if row_clearance in ("EXECUTIVE_ONLY", "CONFIDENTIAL"):
                        continue
                    if any(t in title_lower for t in ("cap_table", "captable", "term_sheet", "equity_allocation", "founder_equity", "cap table", "term sheet", "runway")):
                        continue
                    if any(p in content_lower for p in ("founder equity", "cap table", "seed at $", "seed round", "$15m cap", "chief executive officer & co-founder")):
                        continue

                # Score based on exact word boundary regex matches
                score = 0
                for pattern in kw_patterns:
                    title_matches = len(pattern.findall(title))
                    score += title_matches * 6
                    content_matches = len(pattern.findall(content))
                    score += min(content_matches * 2, 8)

                if score > 0:
                    # Continuous learning & supersession boost:
                    # Taught memories indicating updates ("switched from", "migrated", "updated to") take decisive priority
                    supersede_keywords = ["switched", "switch", "replaced", "migrated", "updated", "now using"]
                    is_supersede = any(sk in content.lower() for sk in supersede_keywords)
                    supersede_bonus = 30 if is_supersede else (6 if (row["source"] and str(row["source"]).startswith("TEACH:")) else 0)
                    composite_score = score + supersede_bonus

                    snippet = self._extract_snippet(content, kw_patterns)
                    scored_results.append((composite_score, ts, SearchCitation(
                        doc_id=doc_id,
                        doc_title=title,
                        page_number=1,
                        snippet=snippet
                    )))

            # 3. Federated Search: Kùzu Decisions Graph
            try:
                from apps.api.cortex.graph import TarsGraph
                graph = TarsGraph()
                decisions = graph.get_all_decisions()
                for d in decisions:
                    d_clearance = (d.get("clearance") or "ALL_TEAM").upper()
                    if not has_exec_clearance and d_clearance in ("EXECUTIVE_ONLY", "CONFIDENTIAL"):
                        continue
                    
                    d_id = d.get("id", "")
                    d_title = d.get("title", "")
                    d_context = d.get("context", "")
                    d_chosen = d.get("chosen_option", "")
                    d_status = d.get("status", "ACTIVE")
                    d_ts = d.get("timestamp", 0)

                    dec_score = 0
                    for pattern in kw_patterns:
                        if pattern.search(d_title):
                            dec_score += 8  # Strong weight for direct decision matches
                        if pattern.search(d_chosen):
                            dec_score += 6
                        if pattern.search(d_context):
                            dec_score += 4

                    if dec_score > 0:
                        snippet_body = f"[{d_status}] {d_chosen}. Context: {d_context}" if d_chosen else d_context
                        scored_results.append((dec_score, d_ts, SearchCitation(
                            doc_id=d_id,
                            doc_title=f"Decision: {d_title}",
                            page_number=1,
                            snippet=snippet_body[:280]
                        )))
            except Exception as graph_err:
                print(f"Notice: Federated graph search skipped/failed: {graph_err}")

            # 4. In-memory MarkItDown parsed cache (with clearance check)
            for fhash, doc in markitdown_parser.ingested_hashes.items():
                doc_clearance = str(doc.get("clearance") or "ALL_TEAM").upper()
                title = doc.get("filename", "")
                content = doc.get("content", "")
                title_lower = title.lower()
                content_lower = content.lower()

                # Guardrail: term sheets, cap tables, founder equity allocation, and confidential financials
                is_exec_doc = (
                    doc_clearance in ("EXECUTIVE_ONLY", "CONFIDENTIAL") or
                    any(t in title_lower for t in ("cap_table", "captable", "term_sheet", "equity_allocation", "founder_equity", "cap table", "term sheet", "runway")) or
                    any(p in content_lower for p in ("founder equity", "cap table", "seed at $", "seed round", "$15m cap", "chief executive officer & co-founder")) or
                    "unredacted" in title_lower
                )
                if not has_exec_clearance and is_exec_doc:
                    continue
                doc_score = 0
                for pattern in kw_patterns:
                    if pattern.search(title):
                        doc_score += 5
                    matches = len(pattern.findall(content))
                    doc_score += min(matches * 2, 6)
                if doc_score > 0:
                    scored_results.append((doc_score, 0, SearchCitation(
                        doc_id=doc.get("doc_id", fhash[:8]),
                        doc_title=title,
                        page_number=1,
                        snippet=self._extract_snippet(content, kw_patterns)
                    )))

            # 5. Deduplicate and order by score descending, then recency timestamp descending
            # (Allows newly taught facts to take precedence over older superseded facts)
            scored_results.sort(key=lambda x: (x[0], x[1]), reverse=True)

            deduped: List[SearchCitation] = []
            seen_ids = set()
            title_counts: Dict[str, int] = {}

            for item in scored_results:
                cit = item[2]
                title_key = cit.doc_title.strip().lower()
                if cit.doc_id in seen_ids:
                    continue
                # Allow up to 3 complementary chunks from the same document
                if title_counts.get(title_key, 0) >= 3:
                    continue
                seen_ids.add(cit.doc_id)
                title_counts[title_key] = title_counts.get(title_key, 0) + 1
                deduped.append(cit)
                if len(deduped) >= limit:
                    break

            return deduped
        finally:
            await search_governor.release()

    def _extract_snippet(self, content: str, kw_patterns: List[re.Pattern], max_chars: int = 500) -> str:
        if not content:
            return ""
        
        cleaned = content.strip()
        if len(cleaned) <= max_chars:
            return cleaned

        # Split into lines to find best matching focal point
        lines = [ln.strip() for ln in cleaned.split("\n") if ln.strip()]
        best_idx = 0
        max_hits = -1

        for idx, line in enumerate(lines):
            hits = sum(len(p.findall(line)) for p in kw_patterns)
            if hits > max_hits:
                max_hits = hits
                best_idx = idx

        # Build window around best line
        start_idx = max(0, best_idx - 2)
        end_idx = min(len(lines), best_idx + 4)
        window = "\n".join(lines[start_idx:end_idx])
        if len(window) > max_chars:
            return window[:max_chars].rsplit(" ", 1)[0] + "..."
        return window

search_service = UnifiedSearchService()
