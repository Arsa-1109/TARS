import sys
import os
from pathlib import Path

# Ensure project root is in sys.path
root_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(root_dir))

import uvicorn
from apps.api.main import app

if __name__ == "__main__":
    # Local-only startup mounting all track routers (Core, Cortex, MCP, Ingestion)
    uvicorn.run("apps.api.main:app", host="127.0.0.1", port=7777, reload=True, app_dir=str(root_dir))
