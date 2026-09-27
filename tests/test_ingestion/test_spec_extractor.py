# tests/test_ingestion/test_spec_extractor.py
"""
Unit tests for sub-second Voice-to-Spec extractor (Patch P-08, P-06).
"""
import pytest
from apps.api.schemas.contracts import VoiceToSpecResponse
from apps.api.ingestion.spec_extractor import VoiceToSpecExtractor


@pytest.fixture
def extractor():
    return VoiceToSpecExtractor()


def test_contract_compliance(extractor):
    """Verify extracted spec strictly conforms to frozen VoiceToSpecResponse schema."""
    sample_transcript = (
        "Client mentioned that the slow search query response time is a huge problem. "
        "They explicitly requested support for multi-column filtering. "
        "Our tech lead committed to delivering the indexing fix before next Monday."
    )

    spec = extractor.extract_spec(
        transcript=sample_transcript,
        call_id="CALL-TEST001",
        client_name="Stripe Partner",
        audio_duration=120.0,
        sync_to_graph=False,
    )

    assert isinstance(spec, VoiceToSpecResponse)
    assert spec.call_id == "CALL-TEST001"
    assert spec.client_name == "Stripe Partner"
    assert spec.sentiment in ["POSITIVE", "NEUTRAL", "NEGATIVE", "ESCALATION"]
    assert isinstance(spec.pain_points, list)
    assert isinstance(spec.feature_requests, list)
    assert isinstance(spec.commitments, list)
    assert spec.audio_duration_seconds == 120.0


def test_heuristic_extraction_accuracy(extractor):
    """Verify heuristic extractor correctly classifies pain points, requests, and promises."""
    transcript = (
        "We are hitting a fatal crash when uploading Excel files over 50MB. "
        "We need dark mode and role-based permissions. "
        "We will schedule a migration workshop next Friday."
    )

    res = extractor._extract_with_heuristics(transcript, "BigCorp")

    assert any("crash" in p.lower() for p in res["pain_points"])
    assert any("dark mode" in f.lower() or "permissions" in f.lower() for f in res["feature_requests"])
    assert any("migration workshop" in c.lower() or "schedule" in c.lower() for c in res["commitments"])


def test_sentiment_escalation_detection(extractor):
    """Verify escalation sentiment when harsh customer complaints are present."""
    escalated_transcript = (
        "This latency is totally unacceptable. The product is broken and our users are furious. "
        "We will escalate this to the executive team immediately."
    )
    res = extractor._extract_with_heuristics(escalated_transcript, "AngryClient")
    assert res["sentiment"] in ["NEGATIVE", "ESCALATION"]
