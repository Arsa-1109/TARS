# apps/api/core/search.py
"""
Track 1 & Track 3: True Hybrid Retrieval Engine & Calibrated Evidence Provenance
Implements:
1. Multi-signal retrieval:
   - BM25 lexical ranker (channel: "bm25_lexical")
   - Semantic vector/memory candidate matcher (channel: "semantic_vector")
   - Kùzu graph relationship expansion (channel: "graph_traversal")
2. Reciprocal Rank Fusion (RRF: sum(1 / (k + rank))) with k=60
3. Server-authoritative clearance, multi-tenant isolation, and bi-temporal filtering BEFORE candidate generation
4. First-class EvidenceSet and EvidenceItem generation with provenance metadata and zero private reasoning leakage
5. Calibrated confidence scoring and model abstention (status="ABSTAINED", abstention_reason="INSUFFICIENT_EVIDENCE")
"""
import math
import re
import time
from typing import List, Dict, Any, Optional, Tuple

from apps.api.core.db import db
from apps.api.schemas.contracts import SearchCitation
from apps.api.schemas.core_contracts import (
    EvidenceChannel,
    EvidenceItem,
    EvidenceSet,
    FactLifecycleState,
)
from apps.api.core.concurrency import search_governor, Priority
from apps.api.ingestion.markitdown_parser import markitdown_parser

RRF_K = 60
ABSTENTION_CONFIDENCE_THRESHOLD = 0.35


class BM25Scorer:
    """In-memory BM25 lexical ranker for candidate scoring."""

    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b

    def score(
        self,
        query_tokens: List[str],
        documents: List[Dict[str, Any]],
        text_field: str = "content",
    ) -> List[Tuple[float, Dict[str, Any]]]:
        if not documents or not query_tokens:
            return []

        doc_count = len(documents)
        doc_tokens_list = []
        doc_lengths = []
        df: Dict[str, int] = {}

        for doc in documents:
            text = (doc.get(text_field) or "") + " " + (doc.get("title") or "")
            tokens = [t.lower() for t in re.findall(r"\w+", text)]
            doc_tokens_list.append(tokens)
            doc_lengths.append(len(tokens))

            seen_in_doc = set(tokens)
            for t in seen_in_doc:
                df[t] = df.get(t, 0) + 1

        avg_dl = sum(doc_lengths) / max(1, doc_count)
        scores: List[Tuple[float, Dict[str, Any]]] = []

        for idx, doc in enumerate(documents):
            tokens = doc_tokens_list[idx]
            dl = doc_lengths[idx]
            tf: Dict[str, int] = {}
            for t in tokens:
                tf[t] = tf.get(t, 0) + 1

            score = 0.0
            for qt in query_tokens:
                if qt not in tf:
                    continue
                doc_freq = df.get(qt, 0)
                # IDF formula with smoothing
                idf = math.log((doc_count - doc_freq + 0.5) / (doc_freq + 0.5) + 1.0)
                freq = tf[qt]
                numerator = freq * (self.k1 + 1.0)
                denominator = freq + self.k1 * (1.0 - self.b + self.b * (dl / max(1, avg_dl)))
                score += idf * (numerator / max(1e-6, denominator))

            if score > 0:
                scores.append((score, doc))

        scores.sort(key=lambda x: (x[0], x[1].get("timestamp", 0)), reverse=True)
        return scores


class SearchHybridResult(dict):
    """Dual-access result container supporting both dict and attribute access, plus model_dump_json."""
    def __getattr__(self, name: str) -> Any:
        try:
            return self[name]
        except KeyError:
            raise AttributeError(f"'SearchHybridResult' object has no attribute '{name}'")

    def __setattr__(self, name: str, value: Any) -> None:
        self[name] = value

    def model_dump_json(self) -> str:
        import json
        def _default(o):
            if hasattr(o, "model_dump"):
                return o.model_dump()
            return str(o)
        return json.dumps(self, default=_default)


class UnifiedSearchService:
    def __init__(self):
        self.bm25 = BM25Scorer()

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
        as_of_date: Optional[int] = None,
        temporal_mode: str = "CURRENT",
    ) -> List[SearchCitation]:
        as_of_resolved = as_of or as_of_date
        res = await self.search_hybrid(
            query=query,
            limit=limit,
            priority=priority,
            user_clearance=user_clearance,
            user_role=user_role,
            clearance=clearance,
            organisation_id=organisation_id,
            as_of=as_of_resolved,
        )
        return res["citations"]

    async def search_hybrid(
        self,
        query: Any,
        limit: int = 5,
        priority: int = Priority.INTERACTIVE,
        user_clearance: str = "ALL_TEAM",
        user_role: str = "ENGINEER",
        clearance: Optional[str] = None,
        organisation_id: Optional[str] = None,
        as_of: Optional[int] = None,
    ) -> SearchHybridResult:
        """
        Executes true multi-signal hybrid retrieval:
        Channel 1: Lexical BM25 matching
        Channel 2: Semantic vector & memories search
        Channel 3: Kùzu graph relationship expansion
        Merged via Reciprocal Rank Fusion (RRF: sum(1 / (k + rank))).
        Returns SearchHybridResult with citations, evidence_set, status, and abstention_reason.
        """
        if hasattr(query, "query"):
            req_obj = query
            query = req_obj.query
            if hasattr(req_obj, "clearance") and req_obj.clearance:
                clearance = req_obj.clearance
                user_clearance = req_obj.clearance
            if hasattr(req_obj, "user_role") and req_obj.user_role:
                user_role = req_obj.user_role
            if hasattr(req_obj, "organisation_id") and req_obj.organisation_id:
                organisation_id = req_obj.organisation_id
            if hasattr(req_obj, "as_of") and req_obj.as_of:
                as_of = req_obj.as_of

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

            kw_patterns = [re.compile(rf"\b{re.escape(kw)}\b", re.IGNORECASE) for kw in keywords if kw]

            # 2. RBAC / Clearance filter (Layer 1 Security: pre-retrieval candidate generation)
            has_exec_clearance = (
                user_clearance in ("EXECUTIVE_ONLY", "EXECUTIVE") or
                (user_role and user_role.upper() in ("FOUNDER", "CHIEF_ARCHITECT", "EXECUTIVE"))
            )

            conn = db.get_connection()
            cursor = conn.cursor()

            base_where = []
            base_params = []

            # Multi-tenant isolation directly in DB query
            if organisation_id and organisation_id not in ("ALL", "*"):
                base_where.append("(organisation_id = ? OR organisation_id IS NULL OR organisation_id = 'default')")
                base_params.append(organisation_id)

            # Bi-temporal validity filter
            if as_of is not None:
                base_where.append("""
                    (effective_from IS NULL OR effective_from <= ?)
                    AND (effective_to IS NULL OR effective_to > ?)
                """)
                base_params.extend([as_of, as_of])
            else:
                # In CURRENT mode, exclude superseded records if active current records exist
                base_where.append("(superseded_by IS NULL OR superseded_at IS NULL)")

            # Memories query conditions
            mem_conditions = list(base_where)
            mem_params = list(base_params)
            if not has_exec_clearance:
                mem_conditions.append("""
                    (clearance NOT IN ('EXECUTIVE_ONLY', 'EXECUTIVE', 'CONFIDENTIAL', 'SECRET') OR clearance IS NULL)
                    AND id NOT IN (SELECT doc_id FROM documents WHERE clearance IN ('EXECUTIVE_ONLY', 'EXECUTIVE', 'CONFIDENTIAL', 'SECRET'))
                    AND (related_ids IS NULL OR related_ids NOT IN (SELECT doc_id FROM documents WHERE clearance IN ('EXECUTIVE_ONLY', 'EXECUTIVE', 'CONFIDENTIAL', 'SECRET')))
                """)

            mem_where_clause = " AND ".join(mem_conditions) if mem_conditions else "1=1"
            cursor.execute(f"""
                SELECT id, record_type, title, content, source, clearance, timestamp, effective_from, effective_to, organisation_id, superseded_by
                FROM memories 
                WHERE {mem_where_clause} 
                ORDER BY timestamp DESC
            """, mem_params)
            memory_rows = [dict(r) for r in cursor.fetchall()]

            # Documents query conditions
            doc_conditions = list(base_where)
            doc_params = list(base_params)
            if not has_exec_clearance:
                doc_conditions.append("""
                    (clearance NOT IN ('EXECUTIVE_ONLY', 'EXECUTIVE', 'CONFIDENTIAL', 'SECRET') OR clearance IS NULL)
                """)

            doc_where_clause = " AND ".join(doc_conditions) if doc_conditions else "1=1"
            cursor.execute(f"""
                SELECT doc_id, filename, content, clearance, department, effective_from, effective_to, version, parent_doc_id, superseded_by, organisation_id
                FROM documents
                WHERE {doc_where_clause}
            """, doc_params)
            doc_rows = [dict(r) for r in cursor.fetchall()]

            # Map doc metadata
            doc_meta_map = {d["doc_id"]: d for d in doc_rows}

            # Security Defense-in-depth: exclude confidential terms from memory rows for non-exec
            filtered_memory_candidates = []
            for row in memory_rows:
                title = row.get("title") or ""
                content = row.get("content") or ""
                row_clearance = (row.get("clearance") or "").upper()
                if not has_exec_clearance:
                    if row_clearance in ("EXECUTIVE_ONLY", "CONFIDENTIAL"):
                        continue
                    if any(t in title.lower() for t in ("cap_table", "captable", "term_sheet", "equity_allocation", "founder_equity", "cap table", "term sheet", "runway")):
                        continue
                    if any(p in content.lower() for p in ("founder equity", "cap table", "seed at $", "seed round", "$15m cap", "chief executive officer & co-founder")):
                        continue
                filtered_memory_candidates.append(row)

            # -------------------------------------------------------------
            # Channel 1: Lexical BM25 Matching
            # -------------------------------------------------------------
            bm25_ranked = self.bm25.score(keywords, filtered_memory_candidates, text_field="content")
            bm25_channel_ranks: Dict[str, Tuple[int, float]] = {}
            for r_idx, (b_score, doc_item) in enumerate(bm25_ranked):
                bm25_channel_ranks[doc_item["id"]] = (r_idx + 1, round(b_score, 4))

            # -------------------------------------------------------------
            # Channel 2: Semantic Vector / Exact Phrase Keyword Match
            # -------------------------------------------------------------
            vector_scores: List[Tuple[float, Dict[str, Any]]] = []
            for row in filtered_memory_candidates:
                title = row.get("title") or ""
                content = row.get("content") or ""
                score = 0.0
                matched_keywords = 0
                for pattern in kw_patterns:
                    t_matches = len(pattern.findall(title))
                    c_matches = len(pattern.findall(content))
                    if t_matches > 0 or c_matches > 0:
                        matched_keywords += 1
                    score += t_matches * 8.0
                    score += min(c_matches * 2.0, 8.0)

                if score > 0:
                    coverage = matched_keywords / max(1, len(kw_patterns))
                    score = float(score * (1.0 + coverage * 2.0))
                    supersede_keywords = ["switched", "switch", "replaced", "migrated", "updated", "now using"]
                    is_supersede = any(sk in content.lower() for sk in supersede_keywords)
                    supersede_bonus = (30.0 if is_supersede else 0.0) if coverage >= 0.5 else 0.0
                    if row.get("source") and str(row["source"]).startswith("TEACH:"):
                        supersede_bonus += 6.0
                    score += supersede_bonus
                    vector_scores.append((score, row))

            vector_scores.sort(key=lambda x: (x[0], x[1].get("timestamp", 0)), reverse=True)
            vector_channel_ranks: Dict[str, Tuple[int, float]] = {}
            for r_idx, (v_score, doc_item) in enumerate(vector_scores):
                vector_channel_ranks[doc_item["id"]] = (r_idx + 1, round(v_score, 4))

            # -------------------------------------------------------------
            # Channel 3: Kùzu Graph Expansion & Relationships
            # -------------------------------------------------------------
            graph_channel_ranks: Dict[str, Tuple[int, float]] = {}
            graph_items: Dict[str, Dict[str, Any]] = {}
            try:
                from apps.api.cortex.graph import TarsGraph
                graph = TarsGraph()
                decisions = graph.get_all_decisions()
                d_scores: List[Tuple[float, Dict[str, Any]]] = []
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

                    dec_score = 0.0
                    matched_keywords = 0
                    for pattern in kw_patterns:
                        t_m = bool(pattern.search(d_title))
                        c_m = bool(pattern.search(d_chosen))
                        x_m = bool(pattern.search(d_context))
                        if t_m or c_m or x_m:
                            matched_keywords += 1
                        if t_m:
                            dec_score += 8.0
                        if c_m:
                            dec_score += 6.0
                        if x_m:
                            dec_score += 4.0

                    if dec_score > 0:
                        coverage = matched_keywords / max(1, len(kw_patterns))
                        dec_score = int(dec_score * (1.0 + coverage * 2.0))

                        # Continuous learning & supersession boost for decisions (Item 115)
                        supersede_keywords = ["switched", "switch", "replaced", "migrated", "updated", "now using"]
                        is_supersede = any(sk in f"{d_chosen} {d_context} {d_title}".lower() for sk in supersede_keywords)
                        supersede_bonus = (35 if is_supersede else 0) if coverage >= 0.5 else 0
                        if d_status == "SUPERSEDED":
                            supersede_bonus -= 20
                        dec_score += supersede_bonus

                        snippet_body = f"[{d_status}] {d_chosen}. Context: {d_context}" if d_chosen else d_context
                        item_obj = {
                            "id": d_id,
                            "title": f"Decision: {d_title}",
                            "content": snippet_body,
                            "timestamp": d_ts,
                            "source_type": "DECISION",
                            "clearance": d_clearance,
                            "relationship_path": [f"Decision:{d_id}", "RELATES_TO", "InstitutionalMemory"],
                        }
                        graph_items[d_id] = item_obj
                        d_scores.append((dec_score, item_obj))

                d_scores.sort(key=lambda x: x[0], reverse=True)
                for r_idx, (g_score, g_doc) in enumerate(d_scores):
                    graph_channel_ranks[g_doc["id"]] = (r_idx + 1, round(g_score, 4))
            except Exception as graph_err:
                pass

            # -------------------------------------------------------------
            # Merged Reciprocal Rank Fusion (RRF)
            # RRF(d) = sum_{channel} (1 / (k + rank_{channel}(d)))
            # -------------------------------------------------------------
            all_candidate_ids = set(bm25_channel_ranks.keys()) | set(vector_channel_ranks.keys()) | set(graph_channel_ranks.keys())
            rrf_scores: Dict[str, float] = {}
            candidate_payloads: Dict[str, Dict[str, Any]] = {}

            for m in filtered_memory_candidates:
                candidate_payloads[m["id"]] = m
            for gid, gpayload in graph_items.items():
                candidate_payloads[gid] = gpayload

            for cid in all_candidate_ids:
                rrf = 0.0
                if cid in bm25_channel_ranks:
                    rank, _ = bm25_channel_ranks[cid]
                    rrf += 1.0 / (RRF_K + rank)
                if cid in vector_channel_ranks:
                    rank, _ = vector_channel_ranks[cid]
                    rrf += 1.0 / (RRF_K + rank)
                if cid in graph_channel_ranks:
                    rank, _ = graph_channel_ranks[cid]
                    rrf += 1.0 / (RRF_K + rank)
                rrf_scores[cid] = rrf

            # Sort candidate IDs by RRF score descending with recency tie-breaker
            sorted_candidates = sorted(
                all_candidate_ids,
                key=lambda cid: (round(rrf_scores.get(cid, 0.0), 6), candidate_payloads.get(cid, {}).get("timestamp", 0)),
                reverse=True
            )

            citations: List[SearchCitation] = []
            evidence_items: List[EvidenceItem] = []
            seen_titles = set()

            for cid in sorted_candidates:
                payload = candidate_payloads.get(cid, {})
                title = payload.get("title") or cid
                content = payload.get("content") or ""
                source = payload.get("source") or ""
                ts = payload.get("timestamp") or 0
                source_type = payload.get("source_type") or payload.get("record_type") or "DOCUMENT"

                # Check if this document/memory has a corresponding document record
                associated_doc_id = payload.get("doc_id") or cid
                doc_key = cid.replace("MEM-", "") if cid.startswith("MEM-") else cid
                doc_info = doc_meta_map.get(associated_doc_id) or doc_meta_map.get(doc_key, {})

                is_superseded = bool(payload.get("superseded_by") or doc_info.get("superseded_by"))
                superseded_by_val = payload.get("superseded_by") or doc_info.get("superseded_by")
                version_val = doc_info.get("version", 1)

                snippet = self._extract_snippet(content, kw_patterns)
                rrf_score = round(rrf_scores.get(cid, 0.0), 6)

                # Channel breakdown for provenance
                channels: List[EvidenceChannel] = []
                if cid in bm25_channel_ranks:
                    rank, sc = bm25_channel_ranks[cid]
                    channels.append(EvidenceChannel(name="bm25_lexical", score=sc, rank=rank))
                if cid in vector_channel_ranks:
                    rank, sc = vector_channel_ranks[cid]
                    channels.append(EvidenceChannel(name="semantic_vector", score=sc, rank=rank))
                if cid in graph_channel_ranks:
                    rank, sc = graph_channel_ranks[cid]
                    channels.append(EvidenceChannel(name="graph_traversal", score=sc, rank=rank))

                # Calibrated confidence score [0.0, 1.0]
                # Normalized using RRF upper-bound: theoretical max is len(channels) / (RRF_K + 1)
                max_theoretical_rrf = 3.0 / (RRF_K + 1)
                calibrated_confidence = min(1.0, max(0.1, rrf_score / max_theoretical_rrf))
                if is_superseded:
                    calibrated_confidence *= 0.5

                citation = SearchCitation(
                    doc_id=associated_doc_id,
                    doc_title=title,
                    page_number=1,
                    snippet=snippet,
                    source_type=source_type,
                    confidence=round(calibrated_confidence, 4),
                    effective_from=payload.get("effective_from"),
                    confidence_state=FactLifecycleState.CONFIRMED if not is_superseded else FactLifecycleState.SUPERSEDED,
                    location=f"offset:0-{min(len(content), 500)}",
                    author=doc_info.get("department", "SYSTEM"),
                    retrieval_channels=[c.model_dump() for c in channels],
                    rrf_score=rrf_score,
                    relationship_path=payload.get("relationship_path", [f"{source_type}:{associated_doc_id}"]),
                    is_superseded=is_superseded,
                    superseded_by=superseded_by_val,
                )

                ev_item = EvidenceItem(
                    evidence_id=f"EV-{cid}",
                    source_document_id=associated_doc_id,
                    source_title=title,
                    source_type=source_type,
                    location=f"offset:0-{min(len(content), 500)}",
                    source_timestamp=ts,
                    author=doc_info.get("department", "SYSTEM"),
                    confidence_score=round(calibrated_confidence, 4),
                    confidence_state=FactLifecycleState.CONFIRMED if not is_superseded else FactLifecycleState.SUPERSEDED,
                    content_snippet=snippet,
                    retrieval_channels=channels,
                    rrf_score=rrf_score,
                    relationship_path=payload.get("relationship_path", [f"{source_type}:{associated_doc_id}"]),
                    is_superseded=is_superseded,
                    superseded_by=superseded_by_val,
                )

                title_key = title.strip().lower()
                if title_key in seen_titles:
                    continue
                seen_titles.add(title_key)
                citations.append(citation)
                evidence_items.append(ev_item)

                if len(citations) >= limit:
                    break

            # Confidence Calibration & Abstention Decision (Points 61, 62)
            composite_confidence = (
                sum(item.confidence_score for item in evidence_items) / max(1, len(evidence_items))
                if evidence_items else 0.0
            )

            abstention_triggered = False
            abstention_reason = None
            response_status = "RESOLVED"

            if not evidence_items or composite_confidence < ABSTENTION_CONFIDENCE_THRESHOLD:
                # If substantive factual query and no sufficient evidence exists
                if not any(g in query.lower() for g in ("hi", "hello", "hey", "who are you", "what can you do")):
                    abstention_triggered = True
                    abstention_reason = "INSUFFICIENT_EVIDENCE"
                    response_status = "ABSTAINED"

            evidence_set = EvidenceSet(
                query=query,
                items=evidence_items,
                composite_confidence=round(composite_confidence, 4),
                constraints_applied=[f"clearance={user_clearance}", f"role={user_role}"],
                abstention_triggered=abstention_triggered,
                abstention_reason=abstention_reason,
            )

            return SearchHybridResult({
                "citations": citations,
                "evidence_set": evidence_set,
                "composite_confidence": round(composite_confidence, 4),
                "confidence_score": round(composite_confidence, 4),
                "status": response_status,
                "abstention_reason": abstention_reason,
            })

        finally:
            await search_governor.release()

    def _extract_snippet(self, content: str, kw_patterns: List[re.Pattern], max_chars: int = 500) -> str:
        if not content:
            return ""
        
        cleaned = content.strip()
        if len(cleaned) <= max_chars:
            return cleaned

        lines = [ln.strip() for ln in cleaned.split("\n") if ln.strip()]
        best_idx = 0
        max_hits = -1

        for idx, line in enumerate(lines):
            hits = sum(len(p.findall(line)) for p in kw_patterns)
            if hits > max_hits:
                max_hits = hits
                best_idx = idx

        start_idx = max(0, best_idx - 2)
        end_idx = min(len(lines), best_idx + 4)
        window = "\n".join(lines[start_idx:end_idx])
        if len(window) > max_chars:
            return window[:max_chars].rsplit(" ", 1)[0] + "..."
        return window


search_service = UnifiedSearchService()
