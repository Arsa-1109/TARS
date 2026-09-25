import pytest
import asyncio
from apps.api.core.db import db
from apps.api.core.search import search_service
from apps.api.core.concurrency import governor
from apps.api.core.gateway import app
from apps.api.core.ollama_client import ollama_client

def test_db_initialization():
    conn = db.get_connection()
    cursor = conn.cursor()
    # Check if tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='memories'")
    assert cursor.fetchone() is not None
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='mcp_audit'")
    assert cursor.fetchone() is not None

@pytest.mark.asyncio
async def test_search_service_fallback():
    # Insert a test memory
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp) VALUES (?, ?, ?, ?, ?, ?)",
                   ("test-1", "doc", "Test Title", "Test content snippet", "test_source", 123456789))
    conn.commit()
    
    results = await search_service.search("Test content")
    assert len(results) > 0
    assert results[0].doc_id == "test-1"
    
def test_gateway_app():
    assert app.title == "TARS API Gateway"
