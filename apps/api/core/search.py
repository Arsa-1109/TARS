from typing import List, Dict, Any
from apps.api.core.db import db
from apps.api.schemas.contracts import SearchCitation
from apps.api.core.concurrency import search_governor, Priority

class UnifiedSearchService:
    def __init__(self):
        pass

    async def search(self, query: str, limit: int = 5, priority: int = Priority.INTERACTIVE) -> List[SearchCitation]:
        await search_governor.acquire(priority)
        try:
            # Simple fallback lexical search for MVP
            conn = db.get_connection()
            cursor = conn.cursor()
            
            # Search in memory titles and contents
            cursor.execute('''
            SELECT id, title, content, source 
            FROM memories 
            WHERE title LIKE ? OR content LIKE ?
            LIMIT ?
        ''', (f'%{query}%', f'%{query}%', limit))
        
            results = []
            for row in cursor.fetchall():
                content_str = row["content"]
                results.append(SearchCitation(
                    doc_id=row["id"],
                    doc_title=row["title"],
                    page_number=1,
                    snippet=content_str[:200] + "..." if len(content_str) > 200 else content_str
                ))
            return results
        finally:
            await search_governor.release()

search_service = UnifiedSearchService()
