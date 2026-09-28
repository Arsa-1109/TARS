import pytest
import time
from apps.api.core.session import session_manager, user_manager
from apps.api.schemas.contracts import UserCreateDTO

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

def test_user_creation_and_persistence():
    payload = UserCreateDTO(
        name="Dr. Brand",
        email="brand@tars.sovereign",
        role="ENGINEER",
        department="Astrophysics",
    )
    user = user_manager.create_user(payload)
    assert user.id.startswith("usr-")
    assert user.name == "Dr. Brand"
    assert user.email == "brand@tars.sovereign"
    assert user.role == "ENGINEER"
    assert user.department == "Astrophysics"
    assert user.clearance == "ALL_TEAM"

    # Query back
    fetched = user_manager.get_user_by_id(user.id)
    assert fetched is not None
    assert fetched.name == "Dr. Brand"

    # Verify in list
    users = user_manager.list_users()
    assert any(u.email == "brand@tars.sovereign" for u in users)

def test_user_role_validation_and_clearance():
    # Invalid role must raise ValueError
    with pytest.raises(ValueError):
        user_manager.create_user(UserCreateDTO(
            name="Rogue Agent",
            email="rogue@tars.sovereign",
            role="SUPERUSER",
        ))

    # Invalid email must raise ValueError
    with pytest.raises(ValueError):
        user_manager.create_user(UserCreateDTO(
            name="Bad Email",
            email="not-an-email",
            role="ENGINEER",
        ))
