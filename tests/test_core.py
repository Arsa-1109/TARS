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

def test_user_creation_with_new_company():
    from apps.api.core.session import user_manager
    from apps.api.schemas.contracts import UserCreateDTO
    from apps.api.core.company import CompanyProfileRepository

    dto = UserCreateDTO(
        name="Alice Sovereign",
        email="alice@solari.tech",
        role="FOUNDER",
        company_name="Solari Orbital"
    )
    user = user_manager.create_user(dto)
    assert user.name == "Alice Sovereign"
    assert user.company_name == "Solari Orbital"
    assert user.company_id is not None
    assert user.company_id.startswith("CMP-")

    # Verify company profile was initialized in the repository
    repo = CompanyProfileRepository()
    prof = repo.get_profile(user.company_id)
    assert prof is not None
    assert prof["company_name"] == "Solari Orbital"


def test_workspace_reset_demo_only():
    """Verify reset_type='DEMO_ONLY' purges sample fixtures while preserving custom sovereign records."""
    from fastapi.testclient import TestClient
    from apps.api.main import app
    client = TestClient(app)

    conn = db.get_connection()
    cursor = conn.cursor()

    # Seed 1 demo document and 1 custom document
    cursor.execute('''
        INSERT OR REPLACE INTO documents (
            doc_id, filename, file_path, file_hash, department, clearance, format,
            file_size_bytes, page_count, table_count, character_count, chunk_count,
            content, ingested_at, is_demo
        ) VALUES
        ('DOC-DEMO-99', 'sample_demo.xlsx', '/tmp/demo.xlsx', 'hash_demo_99', 'FINANCE', 'ALL_TEAM', 'xlsx', 100, 1, 0, 10, 1, 'demo', 1000, 1),
        ('DOC-CUSTOM-01', 'custom_ip.pdf', '/tmp/custom.pdf', 'hash_custom_01', 'ENG', 'ALL_TEAM', 'pdf', 200, 1, 0, 20, 1, 'custom', 2000, 0)
    ''')

    # Seed 1 demo action item and 1 custom action item
    cursor.execute('''
        INSERT OR REPLACE INTO action_items (
            id, description, owner, status, source_type, source_id, source_offset, is_demo
        ) VALUES
        ('ACT-GEN-DEMO', 'Demo sample task', 'Demo Lead', 'OPEN', 'DECISION', 'DEC-1', '01:00', 1),
        ('ACT-CUSTOM-01', 'Custom production task', 'Custom Lead', 'OPEN', 'CALL', 'CALL-1', '02:00', 0)
    ''')
    conn.commit()

    res = client.post("/api/core/workspace/reset", json={"reset_type": "DEMO_ONLY"})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"
    assert data["cleared"]["documents"] >= 1
    assert data["cleared"]["action_items"] >= 1

    # Verify custom records remain untouched
    cursor.execute("SELECT doc_id FROM documents WHERE doc_id = 'DOC-CUSTOM-01'")
    assert cursor.fetchone() is not None

    cursor.execute("SELECT id FROM action_items WHERE id = 'ACT-CUSTOM-01'")
    assert cursor.fetchone() is not None

    # Verify demo records are purged
    cursor.execute("SELECT doc_id FROM documents WHERE doc_id = 'DOC-DEMO-99'")
    assert cursor.fetchone() is None

    cursor.execute("SELECT id FROM action_items WHERE id = 'ACT-GEN-DEMO'")
    assert cursor.fetchone() is None


def test_workspace_reset_all():
    """Verify reset_type='ALL' cleanly resets documents, actions, and memories."""
    from fastapi.testclient import TestClient
    from apps.api.main import app
    client = TestClient(app)

    res = client.post("/api/core/workspace/reset", json={"reset_type": "ALL", "preserve_users": True})
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "SUCCESS"

    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM documents")
    assert cursor.fetchone()[0] == 0

    cursor.execute("SELECT COUNT(*) FROM action_items")
    assert cursor.fetchone()[0] == 0


def test_workspace_reset_invalid_type_400():
    """Invalid reset_type should return 400 Bad Request."""
    from fastapi.testclient import TestClient
    from apps.api.main import app
    client = TestClient(app)

    res = client.post("/api/core/workspace/reset", json={"reset_type": "INVALID_RESET"})
    assert res.status_code == 400
    assert "invalid reset_type" in res.json()["detail"].lower()

