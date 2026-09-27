import pytest
import time
from apps.api.core.session import session_manager

def test_session_creation():
    session = session_manager.create_session("session-123", "alice", "admin")
    assert session.session_id == "session-123"
    assert session.tars_user == "alice"
    assert session.tars_role == "admin"
    assert session.created_at > 0

def test_session_retrieval():
    session_manager.create_session("session-456", "bob", "dev")
    session = session_manager.get_session("session-456")
    assert session is not None
    assert session.tars_user == "bob"

def test_invalid_session():
    session = session_manager.get_session("non-existent")
    assert session is None
