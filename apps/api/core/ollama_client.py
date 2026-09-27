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

    async def generate(self, prompt: str, task_complexity: str = "light", structured_format: Optional[str] = None, priority: int = Priority.INTERACTIVE) -> Dict[str, Any]:
        # Acquire QoS lock based on priority
        await governor.acquire(priority)
        try:
            # Local model routing abstraction
            # qwen3:1.7b for lightweight extraction/ingestion tasks
            # qwen3:8b for deeper reasoning
            model = "qwen3:8b" if task_complexity == "deep" else "qwen3:1.7b"
            
            # Local-only / zero-egress safety check
            if "localhost" not in OLLAMA_URL and "127.0.0.1" not in OLLAMA_URL:
                 # Just in case environment variables try to hijack
                 return {"success": False, "error": "Zero-egress violation: OLLAMA_BASE_URL must be local."}
                 
            payload = {
                "model": model,
                "prompt": prompt,
                "stream": False
            }
            if structured_format:
                payload["format"] = "json"
                
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(f"{OLLAMA_URL}/api/generate", json=payload)
                response.raise_for_status()
                result = response.json()
                
                if structured_format == "json":
                    try:
                        return {"success": True, "response": json.loads(result["response"])}
                    except json.JSONDecodeError:
                        return {"success": False, "error": "Invalid JSON response", "raw": result["response"]}
                
                return {"success": True, "response": result["response"]}
        except httpx.HTTPError as e:
            return {"success": False, "error": f"Local model unavailable: {str(e)}"}
        except Exception as e:
            return {"success": False, "error": str(e)}
        finally:
            await governor.release()

ollama_client = OllamaClient()
