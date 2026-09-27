# apps/api/main.py
"""
TARS Central API Gateway
Mounts track-specific sub-routers while preserving strict directory boundaries.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="TARS Sovereign Local API",
    description="Offline-first Knowledge, Architectural Cortex & Audio Intelligence Gateway",
    version="1.0.0",
)

# Allow local network & client connections
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TARS Sovereign Local Engine",
        "version": "1.0.0",
        "mode": "offline-sovereign",
    }


# Modular Track Routers mounted dynamically
try:
    from apps.api.ingestion.routes import router as ingestion_router
    app.include_router(ingestion_router, prefix="/api/ingestion", tags=["Track 3: Ingestion"])
except ImportError as e:
    print(f"Warning: Ingestion router not mounted: {e}")

try:
    from apps.api.core.routes import router as core_router
    app.include_router(core_router, prefix="/api/core", tags=["Track 1: Core"])
except ImportError as e:
    print(f"Warning: Core router not mounted: {e}")

try:
    from apps.api.cortex.routes import router as cortex_router, mcp_router
    app.include_router(cortex_router)
    app.include_router(mcp_router)
except ImportError as e:
    print(f"Warning: Cortex router not mounted: {e}")

try:
    from apps.api.core.events.models import Event
    from apps.api.core.orchestrator import orchestrator, OrchestrationResult
    @app.post("/events", response_model=OrchestrationResult, tags=["Gateway Events"])
    async def process_event(event: Event):
        return await orchestrator.process_event(event)
except ImportError:
    pass
