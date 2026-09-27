# tests/test_action_hub.py
"""
Unit & Edge-Case Tests for ActionHubRepository (both core and ingestion implementations).
"""
import os
import pytest
from apps.api.schemas.contracts import ActionItemDTO
from apps.api.core.action_hub import action_hub_repo
from apps.api.ingestion.action_hub import ActionHubRepository

TEST_DB_PATH = os.path.join(os.getcwd(), ".tars", "test_action_hub_unit.sqlite3")


def test_action_hub_crud():
    # Create
    item = ActionItemDTO(
        id="",
        description="Fix bug",
        owner="bob",
        status="OPEN",
        source_type="CHAT",
        source_id="chat-1",
        source_offset="msg-2"
    )
    created = action_hub_repo.create(item)
    assert created.id != ""
    assert created.description == "Fix bug"

    # Get
    retrieved = action_hub_repo.get(created.id)
    assert retrieved is not None
    assert retrieved.id == created.id

    # List
    items = action_hub_repo.list_all()
    assert len(items) > 0

    # Update
    updated = action_hub_repo.update(created.id, {"status": "DONE"})
    assert updated.status == "DONE"

    # Delete
    success = action_hub_repo.delete(created.id)
    assert success is True
    
    deleted = action_hub_repo.get(created.id)
    assert deleted is None


@pytest.fixture
def repo():
    r = ActionHubRepository(db_path=TEST_DB_PATH)
    r.clear()
    yield r
    r.clear()


def test_get_nonexistent_item_returns_none(repo):
    """Retrieving a non-existent action item should safely return None."""
    assert repo.get_by_id("ACT-DOES-NOT-EXIST") is None


def test_update_nonexistent_item_returns_none(repo):
    """Updating a non-existent action item should return None and not raise."""
    result = repo.update("ACT-UNKNOWN", {"status": "DONE"})
    assert result is None


def test_delete_nonexistent_item_returns_false(repo):
    """Deleting a non-existent item should return False."""
    assert repo.delete("ACT-UNKNOWN") is False


def test_empty_database_listing(repo):
    """Listing items in an empty database should return an empty list."""
    assert repo.list_items() == []
    assert repo.list_items(status="OPEN") == []


def test_combined_multi_filter_queries(repo):
    """Filtering by multiple simultaneous criteria (status, owner, source_type)."""
    item1 = ActionItemDTO(
        id="ACT-001",
        description="Verify zero egress air-gap",
        owner="Arya",
        deadline=1700000000,
        status="OPEN",
        source_type="CALL",
        source_id="CALL-01",
        source_offset="00:15",
    )
    item2 = ActionItemDTO(
        id="ACT-002",
        description="Write AST parser pre-commit hook",
        owner="Joe",
        deadline=1700005000,
        status="OPEN",
        source_type="DECISION",
        source_id="DEC-01",
        source_offset="00:30",
    )
    item3 = ActionItemDTO(
        id="ACT-003",
        description="Update presentation slides",
        owner="Arya",
        deadline=1700010000,
        status="DONE",
        source_type="CALL",
        source_id="CALL-02",
        source_offset="01:10",
    )

    repo.create(item1)
    repo.create(item2)
    repo.create(item3)

    # Filter by owner + status
    arya_open = repo.list_items(status="OPEN", owner="Arya")
    assert len(arya_open) == 1
    assert arya_open[0].id == "ACT-001"

    # Filter by source_type + status
    call_done = repo.list_items(status="DONE", source_type="CALL")
    assert len(call_done) == 1
    assert call_done[0].id == "ACT-003"

    # Filter with no matching records
    nomatch = repo.list_items(status="DONE", owner="Joe")
    assert len(nomatch) == 0


def test_sql_injection_payload_sanitization(repo):
    """Parameterized queries must neutralize SQL injection attempts."""
    malicious_item = ActionItemDTO(
        id="ACT-INJ-001",
        description="'; DROP TABLE action_items; --",
        owner="Hacker' OR '1'='1",
        deadline=None,
        status="OPEN",
        source_type="CALL",
        source_id="SRC'; DROP TABLE action_items; --",
        source_offset="Offset 0",
    )
    repo.create(malicious_item)

    fetched = repo.get_by_id("ACT-INJ-001")
    assert fetched is not None
    assert fetched.description == "'; DROP TABLE action_items; --"

    # Table must still exist and function normally
    items = repo.list_items()
    assert len(items) == 1


def test_special_characters_and_emojis(repo):
    """Handles unicode, accents, quotes, and emojis correctly."""
    item = ActionItemDTO(
        id="ACT-UNICODE-99",
        description="Fix résumé parsing 🚀 & handle élite symbols «100% air-gapped»",
        owner="Lead 👨‍💻",
        deadline=None,
        status="IN_PROGRESS",
        source_type="CHAT",
        source_id="CHAT-01",
        source_offset="12:00",
    )
    repo.create(item)
    fetched = repo.get_by_id("ACT-UNICODE-99")
    assert fetched is not None
    assert "🚀" in fetched.description
    assert "élit" in fetched.description


def test_partial_field_updates(repo):
    """Updating only specific fields should not overwrite untouched fields."""
    item = ActionItemDTO(
        id="ACT-PARTIAL-01",
        description="Initial Description",
        owner="Alice",
        deadline=1600000000,
        status="OPEN",
        source_type="CALL",
        source_id="CALL-10",
        source_offset="05:00",
    )
    repo.create(item)

    # Update only status
    updated = repo.update("ACT-PARTIAL-01", {"status": "DONE"})
    assert updated.status == "DONE"
    assert updated.description == "Initial Description"
    assert updated.owner == "Alice"
    assert updated.deadline == 1600000000

    # Update only owner
    updated2 = repo.update("ACT-PARTIAL-01", {"owner": "Bob"})
    assert updated2.owner == "Bob"
    assert updated2.status == "DONE"


def test_clear_all_items(repo):
    """Clear method must remove all records cleanly."""
    for i in range(5):
        repo.create(
            ActionItemDTO(
                id=f"ACT-CLR-{i}",
                description=f"Task {i}",
                owner="Dev",
                status="OPEN",
                source_type="CALL",
                source_id="CALL-01",
                source_offset="00:00",
            )
        )
    assert len(repo.list_items()) == 5
    repo.clear()
    assert len(repo.list_items()) == 0
