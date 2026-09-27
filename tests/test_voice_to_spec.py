# tests/test_voice_to_spec.py
"""
Unit & Edge-Case Tests for VoiceToSpecExtractor (apps/api/ingestion/voice_to_spec.py)
"""
import pytest
from unittest.mock import patch, MagicMock

from apps.api.schemas.contracts import VoiceToSpecResponse
from apps.api.ingestion.voice_to_spec import VoiceToSpecExtractor
from apps.api.ingestion.action_hub import action_hub_repo


@pytest.fixture(autouse=True)
def clean_action_hub():
    action_hub_repo.clear()
    yield
    action_hub_repo.clear()


def test_escalation_sentiment_trigger():
    """When 3 or more pain points are detected, sentiment must be ESCALATION."""
    extractor = VoiceToSpecExtractor()
    transcript = (
        "Client is deeply frustrated with system latency during peak hours. "
        "The current database timeout is a critical blocker for our enterprise roll-out. "
        "We have an active bug causing transaction connection leaks. "
        "We commit to delivering a hotfix patch by tomorrow morning."
    )
    spec = extractor.extract_spec(transcript=transcript, client_name="Fintech Corp", auto_create_action_items=False)
    assert spec.sentiment == "ESCALATION"
    assert len(spec.pain_points) >= 3


def test_negative_sentiment_trigger():
    """When 2 pain points are detected, sentiment must be NEGATIVE."""
    extractor = VoiceToSpecExtractor()
    transcript = (
        "We are frustrated with the slow document indexing. "
        "The team encountered a memory leak in the graph service. "
        "We want SAML SSO support."
    )
    spec = extractor.extract_spec(transcript=transcript, client_name="Beta Client", auto_create_action_items=False)
    assert spec.sentiment == "NEGATIVE"


def test_neutral_sentiment_trigger():
    """When 0-1 pain points are detected, sentiment must be NEUTRAL."""
    extractor = VoiceToSpecExtractor()
    transcript = (
        "General quarterly catch-up call. Discussed roadmap milestones and new feature ideas. "
        "We requested custom export templates. Team will deliver by Friday."
    )
    spec = extractor.extract_spec(transcript=transcript, client_name="Gamma Co", auto_create_action_items=False)
    assert spec.sentiment == "NEUTRAL"


def test_action_item_auto_dispatch():
    """Verifies verbal commitments are transformed and saved into ActionItemDTO records."""
    action_hub_repo.clear()
    extractor = VoiceToSpecExtractor()
    transcript = (
        "Client call with Acme Corp. We promise we will deliver the SAML SSO specification. "
        "We will resolve the transaction leaks by Friday."
    )
    spec = extractor.extract_spec(transcript=transcript, call_id="CALL-DISP-01", auto_create_action_items=True)
    assert len(spec.commitments) > 0

    items = action_hub_repo.list_items(source_type="CALL")
    call_items = [it for it in items if it.source_id == "CALL-DISP-01"]
    assert len(call_items) == len(spec.commitments)
    assert all(it.source_id == "CALL-DISP-01" for it in call_items)
    assert all(it.status == "OPEN" for it in call_items)


def test_action_item_dispatch_disabled():
    """When auto_create_action_items is False, Action Hub must remain empty."""
    extractor = VoiceToSpecExtractor()
    transcript = "We commit to delivering the spec by Friday."
    extractor.extract_spec(transcript=transcript, auto_create_action_items=False)

    items = action_hub_repo.list_items()
    assert len(items) == 0


def test_empty_or_whitespace_transcript():
    """Extractor must handle empty or whitespace-only transcript gracefully without crashing."""
    extractor = VoiceToSpecExtractor()
    spec = extractor.extract_spec(transcript="   \n\t   ", client_name="Empty Client", auto_create_action_items=False)
    assert isinstance(spec, VoiceToSpecResponse)
    assert spec.client_name == "Empty Client"
    assert spec.sentiment == "NEUTRAL"
    assert len(spec.pain_points) > 0  # Fallback message provided
    assert len(spec.commitments) > 0


def test_simulated_ollama_success():
    """Simulates an active Ollama server returning structured JSON."""
    extractor = VoiceToSpecExtractor()
    mock_json = {
        "sentiment": "POSITIVE",
        "summary": "Client loved the sovereign local architecture.",
        "pain_points": ["Minor onboarding docs gap"],
        "feature_requests": ["Dark theme preference"],
        "commitments": ["Send updated deck tonight"],
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {"response": '{"sentiment": "POSITIVE", "summary": "Client loved the sovereign local architecture.", "pain_points": ["Minor onboarding docs gap"], "feature_requests": ["Dark theme preference"], "commitments": ["Send updated deck tonight"]}'}

    with patch("httpx.Client.post", return_value=mock_resp):
        spec = extractor.extract_spec(
            transcript="Great meeting today.",
            call_id="CALL-OLLAMA-1",
            auto_create_action_items=False,
        )
        assert spec.sentiment == "POSITIVE"
        assert spec.summary == "Client loved the sovereign local architecture."
        assert spec.commitments == ["Send updated deck tonight"]
