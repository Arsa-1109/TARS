import httpx
import os
import json
from typing import Optional, Dict, Any

OLLAMA_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_DEFAULT_MODEL", "qwen2.5-coder")

class OllamaClient:
    def __init__(self, timeout: float = 30.0):
        self.timeout = timeout
        
    async def is_available(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                response = await client.get(f"{OLLAMA_URL}/api/tags")
                return response.status_code == 200
        except Exception:
            return False

    async def generate(self, prompt: str, model: str = DEFAULT_MODEL, structured_format: Optional[str] = None) -> Dict[str, Any]:
        try:
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
        except Exception as e:
            return {"success": False, "error": str(e)}

ollama_client = OllamaClient()
