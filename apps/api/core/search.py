import re
from typing import List, Dict, Any
from apps.api.core.db import db
from apps.api.schemas.contracts import SearchCitation
from apps.api.core.concurrency import search_governor, Priority
from apps.api.ingestion.markitdown_parser import markitdown_parser

class UnifiedSearchService:
    def __init__(self):
        pass

    async def search(self, query: str, limit: int = 5, priority: int = Priority.INTERACTIVE) -> List[SearchCitation]:
        await search_governor.acquire(priority)
        try:
            tokens = [t.lower() for t in re.findall(r"\w+", query) if len(t) > 2]
            stop_words = {"the", "and", "for", "with", "what", "how", "our", "are", "from", "that", "this", "can", "you", "about"}
            keywords = [t for t in tokens if t not in stop_words]
            if not keywords:
                keywords = tokens or [query.lower()]

            conn = db.get_connection()
            cursor = conn.cursor()

            # Retrieve all candidate memories
            cursor.execute("SELECT id, title, content, source FROM memories")
            rows = cursor.fetchall()
            
            scored_results = []
            for row in rows:
                doc_id = row["id"]
                title = row["title"] or ""
                content = row["content"] or ""
                combined = f"{title}\n{content}".lower()

                # Calculate match score based on keyword hits
                score = 0
                matched_keywords = []
                for kw in keywords:
                    if kw in title.lower():
                        score += 5
                        matched_keywords.append(kw)
                    if kw in content.lower():
                        count = content.lower().count(kw)
                        score += min(count, 3)
                        matched_keywords.append(kw)

                if score > 0:
                    # Find best snippet window containing the most keywords
                    snippet = self._extract_snippet(content, keywords)
                    scored_results.append((score, SearchCitation(
                        doc_id=doc_id,
                        doc_title=title,
                        page_number=1,
                        snippet=snippet
                    )))

            # If no sqlite results, search in-memory markitdown parsed cache
            if not scored_results:
                for fhash, doc in markitdown_parser.ingested_hashes.items():
                    content = doc.get("content", "")
                    title = doc.get("filename", "")
                    score = sum(1 for kw in keywords if kw in content.lower() or kw in title.lower())
                    if score > 0:
                        scored_results.append((score, SearchCitation(
                            doc_id=doc.get("doc_id", fhash[:8]),
                            doc_title=title,
                            page_number=1,
                            snippet=self._extract_snippet(content, keywords)
                        )))

            # Sort descending by match score
            scored_results.sort(key=lambda x: x[0], reverse=True)
            return [item[1] for item in scored_results[:limit]]
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
