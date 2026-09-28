import httpx
import os
import json
import asyncio
from typing import Optional, Dict, Any
from apps.api.core.concurrency import governor, Priority

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

class OllamaClient:
    def __init__(self, timeout: float = 60.0):
        self.timeout = timeout
        
    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{OLLAMA_URL}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def _get_available_models(self) -> list:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{OLLAMA_URL}/api/tags")
                if res.status_code == 200:
                    data = res.json()
                    return [m.get("name", "") for m in data.get("models", [])]
        except Exception:
            pass
        return []

    async def generate(self, prompt: str, task_complexity: str = "light", structured_format: Optional[str] = None, priority: int = Priority.INTERACTIVE) -> Dict[str, Any]:
        # Acquire QoS lock based on priority
        await governor.acquire(priority)
        try:
            # Local-only / zero-egress safety check
            if "localhost" not in OLLAMA_URL and "127.0.0.1" not in OLLAMA_URL:
                 return {"success": False, "error": "Zero-egress violation: OLLAMA_BASE_URL must be local."}

            available = await self._get_available_models()
            
            # Cascade definitions
            if task_complexity == "deep":
                candidates = ["qwen3:8b", "qwen2.5-coder:7b", "qwen2.5:7b", "qwen2.5:8b", "qwen2.5:1.5b"]
            else:
                candidates = ["qwen3:1.7b", "qwen2.5:1.5b", "qwen2.5-coder:7b", "qwen2.5:7b", "qwen2.5:8b"]

            # Choose first matching available model, or candidate default
            chosen_model = candidates[0]
            for cand in candidates:
                if any(cand in m or m.startswith(cand.split(":")[0]) for m in available):
                    chosen_model = next((m for m in available if cand in m or m.startswith(cand.split(":")[0])), cand)
                    break
                 
            payload = {
                "model": chosen_model,
                "prompt": prompt,
                "stream": False,
                "keep_alive": -1,
                "options": {
                    "num_predict": 300,
                    "temperature": 0.2,
                }
            }
            if structured_format:
                payload["format"] = "json"
                
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
                response.raise_for_status()
                result = response.json()
                
                if structured_format == "json":
                    try:
                        return {"success": True, "response": json.loads(result["response"]), "model_used": chosen_model}
                    except json.JSONDecodeError:
                        return {"success": False, "error": "Invalid JSON response", "raw": result["response"], "model_used": chosen_model}
                
                return {"success": True, "response": result["response"], "model_used": chosen_model}
        except httpx.HTTPError as e:
            return {"success": False, "error": f"Local model unavailable: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            await governor.release()

ollama_client = OllamaClient()
