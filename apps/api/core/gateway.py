from fastapi import FastAPI
from apps.api.core.events.models import Event
from apps.api.core.orchestrator import orchestrator, OrchestrationResult
from apps.api.core.routes import router as core_router

app = FastAPI(
    title="TARS API Gateway",
    description="Local-first Core API Gateway for TARS",
    version="1.0.0"
)

app.include_router(core_router, prefix="/api/core", tags=["Core"])

@app.post("/events", response_model=OrchestrationResult)
async def process_event(event: Event):
    return await orchestrator.process_event(event)
