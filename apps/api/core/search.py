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
        limit: int = 5,
        priority: int = Priority.INTERACTIVE,
        user_clearance: str = "ALL_TEAM",
        user_role: str = "ENGINEER"
    ) -> List[SearchCitation]:
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
            # (e.g. "hi" will NOT match "Whitepaper", "Historical", or "This")
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

            # Retrieve candidate memories with deterministic SQL clearance enforcement
            if has_exec_clearance:
                clearance_filter = "1=1"
            else:
                clearance_filter = "(clearance != 'EXECUTIVE_ONLY' OR clearance IS NULL)"

            cursor.execute(f"""
                SELECT id, title, content, source, clearance, timestamp 
                FROM memories 
                WHERE {clearance_filter} 
                ORDER BY timestamp DESC
            """)
            rows = cursor.fetchall()
            
            scored_results = []
            for row in rows:
                doc_id = row["id"]
                title = row["title"] or ""
                content = row["content"] or ""
                ts = row["timestamp"] or 0

                # Score based on exact word boundary regex matches
                score = 0
                for pattern in kw_patterns:
                    title_matches = len(pattern.findall(title))
                    score += title_matches * 6
                    content_matches = len(pattern.findall(content))
                    score += min(content_matches * 2, 8)

                if score > 0:
                    # Continuous learning & supersession boost:
                    # Taught memories indicating updates ("switched from", "migrated", "updated to") take priority
                    supersede_keywords = ["switched", "switch", "replaced", "migrated", "updated", "now using"]
                    supersede_bonus = 6 if any(sk in content.lower() for sk in supersede_keywords) else 0
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
                    d_clearance = d.get("clearance", "ALL_TEAM")
                    if not has_exec_clearance and d_clearance == "EXECUTIVE_ONLY":
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
                doc_clearance = doc.get("clearance", "ALL_TEAM")
                title = doc.get("filename", "")
                content = doc.get("content", "")
                title_lower = title.lower()
                content_lower = content.lower()

                # Guardrail: term sheets, cap tables, and founder equity allocation are executive-only
                is_exec_doc = (
                    doc_clearance == "EXECUTIVE_ONLY" or
                    any(t in title_lower for t in ("cap_table", "captable", "term_sheet", "equity_allocation", "founder_equity")) or
                    ("founder equity" in content_lower and "cap" in content_lower) or
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
            seen_titles = set()

            for item in scored_results:
                cit = item[2]
                title_key = cit.doc_title.strip().lower()
                if cit.doc_id in seen_ids or title_key in seen_titles:
                    continue
                seen_ids.add(cit.doc_id)
                seen_titles.add(title_key)
                deduped.append(cit)
                if len(deduped) >= limit:
                    break

            return deduped
        finally:
            await search_governor.release()

    def _extract_snippet(self, content: str, kw_patterns: List[re.Pattern], max_chars: int = 280) -> str:
        if not content:
            return ""
        
        # Split into sentences or lines
        sentences = [s.strip() for s in re.split(r"[.\n]+", content) if len(s.strip()) > 10]
        best_sentence = ""
        max_hits = -1

        for sent in sentences:
            hits = sum(len(p.findall(sent)) for p in kw_patterns)
            if hits > max_hits:
                max_hits = hits
                best_sentence = sent

        if best_sentence:
            return best_sentence[:max_chars] + ("..." if len(best_sentence) > max_chars else "")
        return content[:max_chars] + ("..." if len(content) > max_chars else "")

search_service = UnifiedSearchService()
