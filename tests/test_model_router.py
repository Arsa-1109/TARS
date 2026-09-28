# tests/test_model_router.py
"""
Unit and edge-case tests for the Standalone Model Router with Fallback Cascade (Patch P-08).
Validates dynamic model resolution and fallback cascades for extraction and deep reasoning tasks.
"""
import pytest
from unittest.mock import patch, MagicMock
from apps.api.core.model_router import (
    ModelRouter,
    DEEP_REASONING_CASCADE,
    SUBSECOND_EXTRACTION_CASCADE,
)
from apps.api.core.ollama_client import ollama_client


def test_default_cascades_without_installed_models():
    """When no local models are detected, the router must fall back to primary preference."""
    router = ModelRouter(auto_probe=False)
    router.set_installed_models([])

    assert router.resolve_model("light") == "qwen3:1.7b"
    assert router.resolve_model("deep") == "qwen3:8b"


def test_deep_reasoning_cascade_fallbacks():
    """Tests the 4-tier Deep Reasoning fallback sequence: qwen3:8b -> qwen2.5-coder:7b -> qwen2.5:7b -> deepseek-r1:7b."""
    router = ModelRouter(auto_probe=False)

    # 1. Preferred qwen3:8b present
    router.set_installed_models(["qwen3:8b", "qwen2.5:7b"])
    assert router.resolve_model("deep") == "qwen3:8b"

    # 2. qwen3:8b missing, fallback to qwen2.5-coder:7b
    router.set_installed_models(["qwen2.5-coder:7b", "llama3.2:1b"])
    assert router.resolve_model("deep") == "qwen2.5-coder:7b"

    # 3. First two missing, fallback to qwen2.5:7b
    router.set_installed_models(["qwen2.5:7b", "mistral:latest"])
    assert router.resolve_model("deep") == "qwen2.5:7b"

    # 4. First three missing, fallback to deepseek-r1:7b
    router.set_installed_models(["deepseek-r1:7b"])
    assert router.resolve_model("deep") == "deepseek-r1:7b"

    # 5. None of the cascade models installed
    router.set_installed_models(["phi3:mini", "custom-model:latest"])
    assert router.resolve_model("deep") == "qwen3:8b"


def test_subsecond_extraction_cascade_fallbacks():
    """Tests the 4-tier Extraction fallback sequence: qwen3:1.7b -> qwen2.5:1.5b -> llama3.2:1b -> qwen2.5-coder:1.5b."""
    router = ModelRouter(auto_probe=False)

    # 1. Preferred qwen3:1.7b present
    router.set_installed_models(["qwen3:1.7b", "qwen2.5:7b"])
    assert router.resolve_model("light") == "qwen3:1.7b"

    # 2. qwen3:1.7b missing, fallback to qwen2.5:1.5b
    router.set_installed_models(["qwen2.5:1.5b", "qwen2.5-coder:7b"])
    assert router.resolve_model("light") == "qwen2.5:1.5b"

    # 3. First two missing, fallback to llama3.2:1b
    router.set_installed_models(["llama3.2:1b"])
    assert router.resolve_model("light") == "llama3.2:1b"

    # 4. First three missing, fallback to qwen2.5-coder:1.5b
    router.set_installed_models(["qwen2.5-coder:1.5b"])
    assert router.resolve_model("light") == "qwen2.5-coder:1.5b"

    # 5. None installed -> default fallback
    router.set_installed_models(["phi3:mini"])
    assert router.resolve_model("light") == "qwen3:1.7b"


def test_probe_installed_models_via_tags_mock():
    """Asserts that probe_installed_models parses tags payload correctly and sets cascade selection."""
    router = ModelRouter(auto_probe=False)
    mock_tags = {
        "models": [
            {"name": "qwen2.5-coder:7b", "size": 4700000000},
            {"name": "llama3.2:1b", "size": 1300000000},
        ]
    }

    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = mock_tags

    with patch("httpx.Client.get", return_value=mock_resp):
        probed = router.probe_installed_models()
        assert "qwen2.5-coder:7b" in probed
        assert "llama3.2:1b" in probed

        # Now test resolution based on probed payload
        assert router.resolve_model("deep") == "qwen2.5-coder:7b"
        assert router.resolve_model("light") == "llama3.2:1b"


def test_ollama_client_integration():
    """Asserts that OllamaClient routes model resolution through ModelRouter."""
    assert hasattr(ollama_client, "router")
    ollama_client.router.set_installed_models(["qwen2.5:7b", "llama3.2:1b"])
    assert ollama_client.router.resolve_model("deep") == "qwen2.5:7b"
    assert ollama_client.router.resolve_model("light") == "llama3.2:1b"
