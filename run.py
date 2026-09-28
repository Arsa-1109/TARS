import uvicorn
from apps.api.main import app

if __name__ == "__main__":
    # Local-only startup mounting all track routers (Core, Cortex, MCP, Ingestion)
    uvicorn.run(app, host="127.0.0.1", port=7777)
