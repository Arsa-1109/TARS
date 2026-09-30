# apps/api/core/model_router.py
"""
Track 1 & Patch P-08: Standalone Model Router with Fallback Cascade.
Probes local Ollama instance tags on startup and resolves optimal models
for Sub-Second Extraction (Task A) and Deep Reasoning (Task B) tasks.
Operates strictly in zero-egress mode without external network calls.
"""
import os
import logging
from typing import List, Optional, Dict, Any
import httpx

logger = logging.getLogger("tars.core.model_router")

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# Defined fallback cascades prioritizing local Qwen models (qwen3:8b for deep reasoning, qwen3:1.7b for extraction)
DEEP_REASONING_CASCADE: List[str] = [
    "qwen3:8b",
    "qwen2.5-coder:7b",
    "qwen2.5:7b",
    "deepseek-r1:7b",
    "qwen2.5:1.5b",
    "qwen3:1.5b",
    "qwen3.5:0.8b",
]

SUBSECOND_EXTRACTION_CASCADE: List[str] = [
    "qwen3:1.7b",
    "qwen2.5:1.5b",
    "llama3.2:1b",
    "qwen2.5-coder:1.5b",
    "qwen3:1.5b",
    "qwen3.5:0.8b",
]


class ModelRouter:
    """
    Intelligent local model router that dynamically discovers installed
    Ollama models and resolves the highest-capability available candidate
    based on task complexity.
    """

    def __init__(self, ollama_url: str = OLLAMA_URL, auto_probe: bool = True):
        self.ollama_url = ollama_url.rstrip("/")
        self._installed_models: List[str] = []
        self._is_probed: bool = False
        if auto_probe:
            self.probe_installed_models()

    @property
    def installed_models(self) -> List[str]:
        return list(self._installed_models)

    def set_installed_models(self, models: List[str]) -> None:
        """Explicitly override installed models list (useful for testing and deterministic mocking)."""
        self._installed_models = [m.strip().lower() for m in models]
        self._is_probed = True

    def probe_installed_models(self) -> List[str]:
        """
        Synchronously queries GET {OLLAMA_URL}/api/tags to probe installed local models.
        Fails safely if Ollama is unreachable, preserving default cascade order.
        """
        # Enforce zero-egress constraint
        if "localhost" not in self.ollama_url and "127.0.0.1" not in self.ollama_url:
            logger.warning("Zero-egress violation: OLLAMA_BASE_URL must target localhost.")
            return []

        try:
            with httpx.Client(timeout=1.5) as client:
                res = client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [
                        item.get("name", "").strip().lower()
                        for item in data.get("models", [])
                        if item.get("name")
                    ]
                    self._installed_models = models
                    self._is_probed = True
                    logger.info(f"ModelRouter discovered {len(models)} installed models: {models}")
                    return self._installed_models
        except Exception as e:
            logger.debug(f"Could not probe Ollama tags ({e}); will use primary cascade defaults.")

        self._is_probed = True
        return self._installed_models

    async def probe_installed_models_async(self) -> List[str]:
        """Asynchronous probe of installed models via httpx.AsyncClient."""
        if "localhost" not in self.ollama_url and "127.0.0.1" not in self.ollama_url:
            return []

        try:
            async with httpx.AsyncClient(timeout=1.5) as client:
                res = await client.get(f"{self.ollama_url}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    models = [
                        item.get("name", "").strip().lower()
                        for item in data.get("models", [])
                        if item.get("name")
                    ]
                    self._installed_models = models
                    self._is_probed = True
                    return self._installed_models
        except Exception:
            pass

        self._is_probed = True
        return self._installed_models

    def resolve_model(self, task_complexity: str = "light") -> str:
        """
        Resolves the preferred available model using the appropriate cascade.
        - Deep Reasoning Cascade (Task B):
          qwen3:8b -> qwen2.5-coder:7b -> qwen2.5:7b -> deepseek-r1:7b
        - Sub-Second Extraction Cascade (Task A):
          qwen3:1.7b -> qwen2.5:1.5b -> llama3.2:1b -> qwen2.5-coder:1.5b
        """
        is_deep = task_complexity in ("deep", "reasoning", "heavy", "complex")
        cascade = DEEP_REASONING_CASCADE if is_deep else SUBSECOND_EXTRACTION_CASCADE

        # Auto-probe if not already populated
        if not self._installed_models:
            self.probe_installed_models()

        # If models have been probed and any are installed, match against cascade
        if self._installed_models:
            for candidate in cascade:
                cand_lower = candidate.lower()
                for inst in self._installed_models:
                    if self._is_match(cand_lower, inst):
                        return inst

        # Default fallback to primary preferred model in cascade
        return cascade[0]

    @staticmethod
    def _is_match(candidate: str, installed: str) -> bool:
        """Checks if a cascade candidate matches an installed model name."""
        if candidate == installed:
            return True
        # Handle implicit :latest tags
        if candidate.endswith(":latest") and candidate[:-7] == installed:
            return True
        if installed.endswith(":latest") and installed[:-7] == candidate:
            return True
        # If candidate has no tag, match prefix
        if ":" not in candidate and installed.startswith(f"{candidate}:"):
            return True
        return False


# Global singleton router instance
model_router = ModelRouter()
