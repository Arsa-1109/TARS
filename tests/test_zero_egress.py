import pytest
import os
from apps.api.core.ollama_client import OLLAMA_URL

def test_zero_egress_ollama_url():
    """Ensure the system is configured to only talk to local Ollama"""
    assert "localhost" in OLLAMA_URL or "127.0.0.1" in OLLAMA_URL, "Ollama URL must point to localhost"

def test_zero_egress_no_cloud_apis():
    """Ensure no standard cloud API keys are present in the environment"""
    forbidden_keys = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "GEMINI_API_KEY"]
    for key in forbidden_keys:
        assert os.getenv(key) is None, f"Cloud key {key} is present, violating zero-egress policy."
