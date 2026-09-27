import pytest
from apps.api.core.action_hub import action_hub_repo
from apps.api.schemas.contracts import ActionItemDTO

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
