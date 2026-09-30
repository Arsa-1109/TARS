# tests/test_knowledge_chatbot.py
"""
Unit & Integration Tests for Persistent Company Knowledge Chatbot
Covers all 15 required verification targets:
1. create chat
2. list chats
3. send message
4. message persistence
5. history retrieval
6. rename
7. delete
8. clear
9. ownership isolation
10. RBAC enforcement
11. citations preservation
12. Kùzu decision retrieval in chat
13. Ollama offline truthful fallback
14. greeting behavior
15. persistence across refresh / session reconnect
"""
import pytest
import time
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.core.db import db
from apps.api.core.ollama_client import ollama_client


@pytest.fixture
def client():
    return TestClient(app)


@pytest.fixture(autouse=True)
def clean_chats():
    """Purge chat tables between tests for clean isolation."""
    yield
    try:
        conn = db.get_connection()
        conn.execute("DELETE FROM chat_messages")
        conn.execute("DELETE FROM chat_sessions")
        conn.commit()
    except Exception:
        pass


# 1. CREATE CHAT
def test_create_chat(client):
    res = client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "New conversation"})
    assert res.status_code == 200
    data = res.json()
    assert data["id"].startswith("chat-")
    assert data["user_id"] == "usr-alex"
    assert data["title"] == "New conversation"
    assert "created_at" in data
    assert "updated_at" in data
    assert data["is_deleted"] is False


# 2. LIST CHATS
def test_list_chats(client):
    client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "Payment Provider"})
    client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "Acme SAML"})
    
    res = client.get("/api/core/chats?user_id=usr-alex")
    assert res.status_code == 200
    chats = res.json()
    assert len(chats) >= 2
    titles = [c["title"] for c in chats]
    assert "Payment Provider" in titles
    assert "Acme SAML" in titles


# 3. SEND MESSAGE & 4. MESSAGE PERSISTENCE & 5. HISTORY RETRIEVAL
def test_send_message_and_history_persistence(client):
    # Create chat
    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex"})
    chat_id = c_res.json()["id"]

    # Seed a memory
    conn = db.get_connection()
    conn.execute("""
        INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES ('MEM-PAYMENT-1', 'DECISION', 'Payment Provider Selection', 'We selected Stripe as our global payment provider for all card processing.', 'FINANCE', ?, 'payment,stripe', 'ALL_TEAM')
    """, (int(time.time()),))
    conn.commit()

    # Send message with mocked Ollama
    mock_llm = {
        "success": True,
        "response": "Our primary payment provider is Stripe for all global card processing.",
        "model_used": "qwen2.5:3b"
    }
    with patch.object(ollama_client, "is_available", AsyncMock(return_value=True)), \
         patch.object(ollama_client, "generate", AsyncMock(return_value=mock_llm)):
        res = client.post(
            f"/api/core/chats/{chat_id}/messages?user_id=usr-alex",
            json={
                "content": "What is our payment provider?",
                "user_role": "FOUNDER",
                "clearance": "EXECUTIVE_ONLY"
            }
        )
        assert res.status_code == 200
        reply = res.json()
        assert reply["role"] == "assistant"
        assert "Stripe" in reply["content"]
        assert isinstance(reply["citations"], list)

    # Verify history retrieval
    hist_res = client.get(f"/api/core/chats/{chat_id}/messages?user_id=usr-alex")
    assert hist_res.status_code == 200
    messages = hist_res.json()
    assert len(messages) == 2
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "What is our payment provider?"
    assert messages[1]["role"] == "assistant"
    assert "Stripe" in messages[1]["content"]

    # Verify auto-derived title from first message
    chat_info = client.get(f"/api/core/chats/{chat_id}?user_id=usr-alex").json()
    assert chat_info["title"] == "Payment Provider"


# 6. RENAME CHAT
def test_rename_chat(client):
    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "Acme"})
    chat_id = c_res.json()["id"]

    patch_res = client.patch(
        f"/api/core/chats/{chat_id}?user_id=usr-alex",
        json={"title": "Acme SAML"}
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["title"] == "Acme SAML"

    # Confirm persistence
    get_res = client.get(f"/api/core/chats/{chat_id}?user_id=usr-alex")
    assert get_res.json()["title"] == "Acme SAML"


# 7. DELETE CHAT
def test_delete_chat(client):
    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "To Delete"})
    chat_id = c_res.json()["id"]

    del_res = client.delete(f"/api/core/chats/{chat_id}?user_id=usr-alex")
    assert del_res.status_code == 200

    # Must no longer appear in list
    list_res = client.get("/api/core/chats?user_id=usr-alex")
    ids = [c["id"] for c in list_res.json()]
    assert chat_id not in ids

    # Direct GET returns 404
    assert client.get(f"/api/core/chats/{chat_id}?user_id=usr-alex").status_code == 404


# 8. CLEAR CHAT
def test_clear_chat(client):
    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "Chat To Clear"})
    chat_id = c_res.json()["id"]

    with patch.object(ollama_client, "is_available", AsyncMock(return_value=False)):
        client.post(
            f"/api/core/chats/{chat_id}/messages?user_id=usr-alex",
            json={"content": "Hello TARS"}
        )

    # Verify messages exist
    m1 = client.get(f"/api/core/chats/{chat_id}/messages?user_id=usr-alex").json()
    assert len(m1) > 0

    # Clear chat
    clear_res = client.delete(f"/api/core/chats/{chat_id}/messages?user_id=usr-alex")
    assert clear_res.status_code == 200

    # Messages are now empty
    m2 = client.get(f"/api/core/chats/{chat_id}/messages?user_id=usr-alex").json()
    assert len(m2) == 0

    # But chat itself still exists
    c_check = client.get(f"/api/core/chats/{chat_id}?user_id=usr-alex")
    assert c_check.status_code == 200


# 9. OWNERSHIP ISOLATION
def test_ownership_isolation(client):
    # Alex creates chat
    alex_chat = client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "Alex Secret"}).json()["id"]
    # Chloe creates chat
    chloe_chat = client.post("/api/core/chats", json={"user_id": "usr-chloe", "title": "Chloe Notes"}).json()["id"]

    # Chloe listing chats cannot see Alex's chat
    chloe_chats = client.get("/api/core/chats?user_id=usr-chloe").json()
    chloe_ids = [c["id"] for c in chloe_chats]
    assert chloe_chat in chloe_ids
    assert alex_chat not in chloe_ids

    # Chloe trying to access Alex's chat gets 403 Forbidden
    alex_view_by_chloe = client.get(f"/api/core/chats/{alex_chat}?user_id=usr-chloe")
    assert alex_view_by_chloe.status_code == 403

    # Chloe trying to post into Alex's chat gets 403 Forbidden
    post_by_chloe = client.post(
        f"/api/core/chats/{alex_chat}/messages?user_id=usr-chloe",
        json={"content": "Snooping"}
    )
    assert post_by_chloe.status_code == 403

    # Chloe trying to rename Alex's chat gets 403 Forbidden
    rename_by_chloe = client.patch(
        f"/api/core/chats/{alex_chat}?user_id=usr-chloe",
        json={"title": "Hacked"}
    )
    assert rename_by_chloe.status_code == 403

    # Chloe trying to delete Alex's chat gets 403 Forbidden
    del_by_chloe = client.delete(f"/api/core/chats/{alex_chat}?user_id=usr-chloe")
    assert del_by_chloe.status_code == 403


# 10. RBAC / CLEARANCE ENFORCEMENT
def test_rbac_clearance_enforcement(client):
    # Chloe (Engineer / ALL_TEAM) asks about cap table
    c_res = client.post("/api/core/chats", json={"user_id": "usr-chloe"})
    chat_id = c_res.json()["id"]

    res = client.post(
        f"/api/core/chats/{chat_id}/messages?user_id=usr-chloe",
        json={
            "content": "Show me the cap table and founder shares allocation",
            "user_role": "NEW_HIRE",
            "clearance": "ALL_TEAM"
        }
    )
    assert res.status_code == 200
    data = res.json()
    assert "Access restricted" in data["content"]
    assert "EXECUTIVE_ONLY" in data["content"]
    assert len(data["citations"]) == 0


# 11. CITATIONS PRESERVED
def test_citations_preserved(client):
    conn = db.get_connection()
    conn.execute("""
        INSERT OR REPLACE INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES ('MEM-CIT-1', 'POLICY', 'Enterprise Customisation Policy BDR-014', 'Zero custom forks permitted for enterprise clients.', 'POLICY_DOC', ?, 'policy,enterprise', 'ALL_TEAM')
    """, (int(time.time()),))
    conn.commit()

    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex"})
    chat_id = c_res.json()["id"]

    mock_llm = {
        "success": True,
        "response": "According to policy BDR-014, zero custom forks are permitted.",
        "model_used": "qwen2.5:3b"
    }
    with patch.object(ollama_client, "is_available", AsyncMock(return_value=True)), \
         patch.object(ollama_client, "generate", AsyncMock(return_value=mock_llm)):
        res = client.post(
            f"/api/core/chats/{chat_id}/messages?user_id=usr-alex",
            json={
                "content": "What is our enterprise customisation policy?",
                "user_role": "FOUNDER",
                "clearance": "EXECUTIVE_ONLY"
            }
        )
        assert res.status_code == 200
        reply = res.json()
        assert len(reply["citations"]) > 0
        assert any("Enterprise Customisation" in c["doc_title"] for c in reply["citations"])

    # Reload from persistence and confirm citations intact
    msgs = client.get(f"/api/core/chats/{chat_id}/messages?user_id=usr-alex").json()
    assert len(msgs[1]["citations"]) > 0
    assert "Enterprise Customisation" in msgs[1]["citations"][0]["doc_title"]


# 12. KÙZU DECISION RETRIEVAL IN CHAT
def test_kuzu_decision_retrieval_in_chat(client):
    try:
        from apps.api.cortex.graph import TarsGraph
        graph = TarsGraph()
        graph.conn.execute("""
            MERGE (d:Decision {id: 'DEC-TEST-PAY-01'})
            SET d.title = 'Payment Provider Evaluation',
                d.chosen_option = 'Stripe Connect',
                d.context = 'Stripe Connect was selected for global billing compliance',
                d.clearance = 'ALL_TEAM',
                d.status = 'ACTIVE',
                d.timestamp = 1700000000
        """)
    except Exception:
        pass

    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex"})
    chat_id = c_res.json()["id"]

    mock_llm = {
        "success": True,
        "response": "The decision was Stripe Connect for global billing.",
        "model_used": "qwen2.5:3b"
    }
    with patch.object(ollama_client, "is_available", AsyncMock(return_value=True)), \
         patch.object(ollama_client, "generate", AsyncMock(return_value=mock_llm)):
        res = client.post(
            f"/api/core/chats/{chat_id}/messages?user_id=usr-alex",
            json={"content": "What did we decide about payment providers?"}
        )
        assert res.status_code == 200
        reply = res.json()
        assert any("Payment Provider" in c["doc_title"] for c in reply["citations"])


# 13. OLLAMA OFFLINE BEHAVIOR
def test_ollama_offline_behavior(client):
    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex"})
    chat_id = c_res.json()["id"]

    with patch.object(ollama_client, "is_available", AsyncMock(return_value=False)):
        res = client.post(
            f"/api/core/chats/{chat_id}/messages?user_id=usr-alex",
            json={"content": "What is our AWS deployment region?"}
        )
        assert res.status_code == 200
        reply = res.json()
        assert "Local AI unavailable — Ollama is not running" in reply["content"]


# 14. GREETING BEHAVIOR
def test_greeting_behavior(client):
    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex"})
    chat_id = c_res.json()["id"]

    for greeting in ["hi", "hello", "good morning"]:
        res = client.post(
            f"/api/core/chats/{chat_id}/messages?user_id=usr-alex",
            json={"content": greeting, "user_name": "Alex", "user_role": "FOUNDER"}
        )
        assert res.status_code == 200
        reply = res.json()
        assert "Hello Alex!" in reply["content"]
        assert len(reply["citations"]) == 0


# 15. PERSISTENCE ACROSS RECONNECT / REFRESH
def test_persistence_across_reconnect(client):
    c_res = client.post("/api/core/chats", json={"user_id": "usr-alex", "title": "Long Lived Session"})
    chat_id = c_res.json()["id"]

    # Send user message
    with patch.object(ollama_client, "is_available", AsyncMock(return_value=False)):
        client.post(
            f"/api/core/chats/{chat_id}/messages?user_id=usr-alex",
            json={"content": "Preserve me across server restart"}
        )

    # Close DB connection simulating server restart
    db.close_connection()

    # Re-fetch from a new connection via API
    refetched_chat = client.get(f"/api/core/chats/{chat_id}?user_id=usr-alex")
    assert refetched_chat.status_code == 200
    assert refetched_chat.json()["title"] == "Long Lived Session"

    refetched_messages = client.get(f"/api/core/chats/{chat_id}/messages?user_id=usr-alex")
    assert refetched_messages.status_code == 200
    msgs = refetched_messages.json()
    assert len(msgs) == 2
    assert msgs[0]["content"] == "Preserve me across server restart"
    assert "Local AI unavailable" in msgs[1]["content"]
