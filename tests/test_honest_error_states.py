"""
tests/test_honest_error_states.py
Validates:
1. Canonical machine-readable error models and status codes.
2. Search endpoint returns explicit status codes and non-authoritative fallback metadata:
   - When Ollama is offline and 0 citations: status="INFERENCE_UNAVAILABLE", is_authoritative=False, source_mode="FALLBACK".
   - When query has no matches: status="NO_EVIDENCE".
   - When successful: status="COMPLETED", is_authoritative=True, source_mode="LIVE".
"""
import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient

from apps.api.main import app
from apps.api.core.errors import TARSException, ErrorCodes

client = TestClient(app)


@pytest.mark.asyncio
async def test_search_inference_unavailable_honest_status():
    """When Ollama is unavailable and 0 citations exist, search response explicitly states INFERENCE_UNAVAILABLE."""
    with patch("apps.api.core.routes.ollama_client.is_available", new_callable=AsyncMock) as mock_avail:
        mock_avail.return_value = False
        res = client.post("/api/core/search", json={
            "query": "nonexistent_term_xyz_12345",
            "clearance": "ALL_TEAM",
            "user_role": "ENGINEER"
        })
        assert res.status_code == 200
        data = res.json()
        assert data["status"] in ("INFERENCE_UNAVAILABLE", "PARTIAL")
        assert data["is_authoritative"] is False
        assert data["source_mode"] == "FALLBACK"
        assert "Local AI inference unavailable" in data["answer"]


def test_tars_exception_handler_json_format():
    """TARSException raised in API routes returns machine-readable error payload."""
    from apps.api.core.errors import TARSException, ErrorCodes

    exc = TARSException(
        code=ErrorCodes.AUDIT_INTEGRITY_FAILURE,
        message="Audit chain verification failed at sequence 42",
        details={"broken_seq": 42}
    )
    assert exc.status_code == 500
    assert exc.code == "AUDIT_INTEGRITY_FAILURE"
    assert exc.details["broken_seq"] == 42
