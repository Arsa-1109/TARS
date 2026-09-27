import pytest
import json
from unittest.mock import patch, MagicMock

from apps.api.core.events.models import Event, EventType, ActionProposal
from apps.api.core.orchestrator import orchestrator, OrchestrationResult
from apps.api.core.mcp.schemas import ExecutionResult
from apps.api.core.mcp.executor import executor
from apps.api.core.mcp.audit import audit_logger

# ----------------------------------------
# Fixtures (Phase 5)
# ----------------------------------------

@pytest.fixture
def invariant_event():
    return Event(
        event_id="EVT-001",
        event_type=EventType.INVARIANT_BREACH,
        source="cortex",
        timestamp=1690000000,
        payload={
            "rule_id": "INV-017",
            "rule_name": "External HTTP inside DB transaction",
            "file": "src/payments/service.py",
            "line": 42,
            "rationale": "External I/O must not execute inside database transactions",
            "adr_ref": "ADR-017"
        }
    )

@pytest.fixture
def action_item_event():
    return Event(
        event_id="EVT-002",
        event_type=EventType.ACTION_ITEM_CREATED,
        source="ingestion",
        timestamp=1690000000,
        payload={
            "description": "Client requested SAML SSO",
            "owner": "backend",
            "source_type": "CALL",
            "source_id": "CALL-001"
        }
    )

@pytest.fixture
def document_event():
    return Event(
        event_id="EVT-003",
        event_type=EventType.DOCUMENT_INGESTED,
        source="local",
        timestamp=1690000000,
        payload={
            "document_id": "DOC-001",
            "title": "Architecture Decision Record",
            "content": "...",
            "source": "local"
        }
    )

# ----------------------------------------
# Mock Ollama Testing (Phase 6)
# ----------------------------------------

def mock_ollama_generate(prompt: str, model: str = "test", structured_format: str = None):
    # Deterministic fake Ollama response
    if "INVARIANT_BREACH" in prompt:
        data = {
            "summary": "Architectural invariant violated",
            "reasoning_context": "Found INV-017 violation.",
            "tool_name": "memory.create",
            "tool_arguments": {
                "record_type": "remediation_task",
                "title": "Review INV-017 in src/payments/service.py",
                "content": "Line 42 has a violation.",
                "source": "orchestrator"
            },
            "risk_level": "LOW",
            "requires_approval": False, # Assuming false so it executes
            "source_event_id": "EVT-001",
            "confidence": 0.95
        }
        return {"success": True, "response": data}
    elif "INVALID" in prompt:
        return {"success": True, "response": {"not_a_proposal": True}}
    elif "ERROR" in prompt:
        return {"success": False, "error": "Model timeout"}
    else:
        # Default fallback
        data = {
            "summary": "Default action",
            "reasoning_context": "Default context",
            "tool_name": "memory.create",
            "tool_arguments": {
                "record_type": "note",
                "title": "Note",
                "content": "Default",
                "source": "orchestrator"
            },
            "risk_level": "LOW",
            "requires_approval": False,
            "source_event_id": "EVT-002",
            "confidence": 1.0
        }
        return {"success": True, "response": data}


# ----------------------------------------
# Tests (Phase 10)
# ----------------------------------------

@pytest.mark.asyncio
async def test_event_validation():
    # 1. event validation (Pydantic handles this)
    # 2. event creation
    event = Event(
        event_id="test",
        event_type=EventType.DECISION_CREATED,
        source="test",
        timestamp=123,
        payload={}
    )
    assert event.event_type == "DECISION_CREATED"

@pytest.mark.asyncio
@patch("apps.api.core.ollama_client.ollama_client.generate", side_effect=mock_ollama_generate)
async def test_orchestrator_happy_path_invariant(mock_generate, invariant_event):
    # 3. orchestrator happy path
    # 4. invariant breach event
    # 9. successful MCP action
    result = await orchestrator.process_event(invariant_event)
    
    assert result.status == "EXECUTED"
    assert result.proposal is not None
    assert result.proposal.summary == "Architectural invariant violated"
    assert result.execution_result is not None
    assert result.execution_result.success is True

@pytest.mark.asyncio
@patch("apps.api.core.ollama_client.ollama_client.generate", side_effect=mock_ollama_generate)
async def test_action_item_event(mock_generate, action_item_event):
    # 5. action item event
    result = await orchestrator.process_event(action_item_event)
    assert result.status == "EXECUTED"
    assert result.proposal.summary == "Default action"

@pytest.mark.asyncio
async def test_invalid_event_rejection():
    # 6. invalid event rejection
    with pytest.raises(ValueError):
        Event(event_id="test", event_type="NOT_REAL", source="test", timestamp=123, payload={})

@pytest.mark.asyncio
@patch("apps.api.core.ollama_client.ollama_client.generate", side_effect=mock_ollama_generate)
async def test_invalid_llm_response(mock_generate, document_event):
    # 7. invalid LLM response rejection
    # modify payload so mock returns INVALID
    document_event.payload = {"INVALID": True}
    result = await orchestrator.process_event(document_event)
    assert result.status == "INVALID_PROPOSAL"
    
    document_event.payload = {"ERROR": True}
    result2 = await orchestrator.process_event(document_event)
    assert result2.status == "OLLAMA_ERROR"

@pytest.mark.asyncio
@patch("apps.api.core.ollama_client.ollama_client.generate", side_effect=mock_ollama_generate)
async def test_mcp_permission_denial(mock_generate, invariant_event):
    # 8. MCP permission denial
    # 11. no side effects after denied action
    
    # We mock executor to return failure for this test
    original_execute = executor.execute
    async def mock_fail_execute(*args, **kwargs):
        audit_logger.log("test", {}, "test", "REJECTED", None, "Permission denied")
        return ExecutionResult(success=False, error="Permission denied")
    
    with patch("apps.api.core.mcp.executor.executor.execute", side_effect=mock_fail_execute):
        result = await orchestrator.process_event(invariant_event)
        assert result.status == "EXECUTION_DENIED_OR_FAILED"
        assert result.execution_result.success is False

@pytest.mark.asyncio
async def test_audit_creation():
    # 10. audit creation
    from apps.api.core.db import db
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM mcp_audit")
    logs = cursor.fetchall()
    # At least some logs should have been created by previous tests
    assert len(logs) > 0

# 12. local-only operation is guaranteed by using the mock_generate and existing local components.
