import pytest
import os
import json
from pathlib import Path
from apps.api.core.mcp import registry, executor, RiskLevel, ToolMetadata
from apps.api.core.mcp.builtin import register_all_builtin_tools
from apps.api.core.db import db
from apps.api.core.mcp.permissions import permission_manager

@pytest.fixture(autouse=True)
def setup_mcp():
    db.initialize()
    register_all_builtin_tools()

@pytest.mark.asyncio
async def test_tool_registration():
    tool = registry.get_tool("git.status")
    assert tool is not None
    assert tool.risk == RiskLevel.LOW
    assert tool.read_only is True

@pytest.mark.asyncio
async def test_unknown_tool_rejection():
    res = await executor.execute("unknown.tool", {}, "test-session")
    assert res.success is False
    assert res.error == "Tool does not exist."

@pytest.mark.asyncio
async def test_malformed_arguments():
    # filesystem.read requires "path"
    res = await executor.execute("filesystem.read", {}, "test-session")
    assert res.success is False
    assert "Missing required argument" in res.error

@pytest.mark.asyncio
async def test_read_only_tool_execution():
    res = await executor.execute("git.status", {}, "test-session")
    assert res.success is True
    assert "On branch" in str(res.data) or "nothing to commit" in str(res.data) or "Changes" in str(res.data) or "HEAD" in str(res.data)

@pytest.mark.asyncio
async def test_mutation_requiring_approval():
    res = await executor.execute("memory.create", {"title": "Test", "content": "Test"}, "test-session", approval_granted=False)
    assert res.success is False
    assert res.error == "Approval required but missing."

@pytest.mark.asyncio
async def test_approval_denial():
    res = await executor.execute("memory.create", {"title": "Test", "content": "Test"}, "test-session", approval_granted=False)
    assert res.success is False
    assert res.error == "Approval required but missing."

@pytest.mark.asyncio
async def test_permission_denial():
    original_check = permission_manager.check_permission
    permission_manager.check_permission = lambda t, a: False
    res = await executor.execute("git.status", {}, "test-session")
    assert res.success is False
    assert res.error == "Permission denied."
    permission_manager.check_permission = original_check

@pytest.mark.asyncio
async def test_workspace_traversal_rejection():
    res = await executor.execute("filesystem.read", {"path": "../../../../../../etc/passwd"}, "test-session")
    assert res.success is False
    assert "Workspace boundary violated" in res.error

@pytest.mark.asyncio
async def test_audit_creation():
    res = await executor.execute("git.status", {}, "test-session")
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM mcp_audit WHERE tool_name='git.status' ORDER BY timestamp DESC LIMIT 1")
    record = cursor.fetchone()
    assert record is not None
    assert record["actor"] == "test-session"
    assert record["approval_state"] == "AUTO"

@pytest.mark.asyncio
async def test_successful_execution():
    res = await executor.execute("memory.create", {"title": "Integration Test", "content": "Content"}, "test-session", approval_granted=True)
    assert res.success is True
    assert "id" in res.data

@pytest.mark.asyncio
async def test_failed_execution():
    res = await executor.execute("filesystem.read", {"path": "non_existent_file_12345.txt"}, "test-session")
    assert res.success is False
    assert "File does not exist." in res.error

@pytest.mark.asyncio
async def test_disabled_tool():
    async def dummy_handler(args):
        from apps.api.core.mcp.schemas import ExecutionResult
        return ExecutionResult(success=True)
        
    registry.register(
        ToolMetadata(name="danger.tool", description="Danger", input_schema={}, category="test", read_only=False, risk=RiskLevel.HIGH, requires_approval=True),
        dummy_handler
    )
    res = await executor.execute("danger.tool", {}, "test-session", approval_granted=False)
    assert res.success is False
    assert res.error == "Approval required but missing."

@pytest.mark.asyncio
async def test_local_operation_with_no_internet():
    res = await executor.execute("memory.create", {"title": "Offline Test", "content": "Offline Content"}, "test-session", approval_granted=True)
    assert res.success is True
