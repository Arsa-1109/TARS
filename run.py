import uvicorn
from apps.api.core.gateway import app

if __name__ == "__main__":
    # Local-only startup
    uvicorn.run(app, host="127.0.0.1", port=8000)
