import time
from fastapi import APIRouter, HTTPException
from typing import List, Dict, Any
from apps.api.schemas.contracts import ActionItemDTO, SystemStatus, SearchRequest, SearchResponse, SearchCitation
from apps.api.core.action_hub import action_hub_repo
from apps.api.core.session import session_manager, SessionData
from apps.api.core.ollama_client import ollama_client
from apps.api.core.search import search_service

router = APIRouter()

# --- Search Route with SLM Answering ---
@router.post("/search", response_model=SearchResponse)
async def search_knowledge(req: SearchRequest):
    start_time = time.perf_counter()
    citations = await search_service.search(req.query)
    
    # Synthesize answer with local Ollama SLM
    prompt = (
        f"You are TARS, the autonomous startup second brain.\n"
        f"Answer the user's query clearly and concisely based on company context.\n"
        f"Query: {req.query}\n"
    )
    if citations:
        context_str = "\n".join([f"- [{c.doc_title}]: {c.snippet}" for c in citations])
        prompt += f"\nCompany Context:\n{context_str}\n"
    
    llm_res = await ollama_client.generate(prompt, task_complexity="light")
    if llm_res.get("success") and llm_res.get("response"):
        answer = str(llm_res.get("response")).strip()
    elif citations:
        answer = f"Found {len(citations)} relevant citations matching '{req.query}' in institutional knowledge memory."
    else:
        answer = f"Found 0 relevant citations matching '{req.query}' in the local knowledge lake."
    
    elapsed_ms = (time.perf_counter() - start_time) * 1000
    return SearchResponse(
        query=req.query,
        answer=answer,
        citations=citations,
        latency_ms=round(elapsed_ms, 2)
    )

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

