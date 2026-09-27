from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from apps.api.schemas.contracts import ActionItemDTO, SystemStatus
from apps.api.core.action_hub import action_hub_repo
from apps.api.core.session import session_manager, SessionData
from apps.api.core.ollama_client import ollama_client

router = APIRouter()

# --- Action Hub Routes ---
@router.post("/action_hub", response_model=ActionItemDTO)
async def create_action_item(item: ActionItemDTO):
    return action_hub_repo.create(item)

@router.get("/action_hub/{item_id}", response_model=ActionItemDTO)
async def get_action_item(item_id: str):
    item = action_hub_repo.get(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.get("/action_hub", response_model=List[ActionItemDTO])
async def list_action_items():
    return action_hub_repo.list_all()

@router.patch("/action_hub/{item_id}", response_model=ActionItemDTO)
async def update_action_item(item_id: str, updates: Dict[str, Any]):
    item = action_hub_repo.update(item_id, updates)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item

@router.delete("/action_hub/{item_id}")
async def delete_action_item(item_id: str):
    success = action_hub_repo.delete(item_id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"status": "deleted"}

# --- Session Routes ---
@router.post("/session", response_model=SessionData)
async def create_session(session_id: str, tars_user: str, tars_role: str):
    return session_manager.create_session(session_id, tars_user, tars_role)

@router.get("/session/{session_id}", response_model=SessionData)
async def get_session(session_id: str):
    session = session_manager.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

# --- System Routes ---
@router.get("/system/status", response_model=SystemStatus)
async def system_status():
    ollama_ok = await ollama_client.is_available()
    return SystemStatus(
        status="ONLINE",
        database="SQLite WAL",
        ollama="ONLINE" if ollama_ok else "OFFLINE",
        mcp_tools=3, # Hardcoded for now based on mcp/builtin
        airplane_mode=True
    )
