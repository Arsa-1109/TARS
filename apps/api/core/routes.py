import time
import os
import shutil
import uuid
from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from apps.api.schemas.contracts import (
    ActionItemDTO,
    SystemStatus,
    SearchRequest,
    SearchResponse,
    SearchCitation,
    CompanyProfileDTO,
    CompanyProfileCreate,
    GenesisBloomRequest,
    GenesisBloomResponse,
    UserCreateDTO,
    UserDTO,
    WorkspaceResetRequest,
    WorkspaceResetResponse,
)
from apps.api.core.action_hub import action_hub_repo
from apps.api.core.session import session_manager, SessionData, user_manager
from apps.api.core.ollama_client import ollama_client
from apps.api.core.search import search_service
from apps.api.core.company import company_repo
from apps.api.core.db import db

router = APIRouter()


# --- Search Route with SLM Answering ---
GREETINGS = {"hi", "hello", "hey", "greetings", "good morning", "good afternoon"}

@router.post("/search", response_model=SearchResponse)
async def search_knowledge(req: SearchRequest):
    start_time = time.perf_counter()
    print(f"[SEARCH DEBUG] Incoming search query: {req.query}", flush=True)

    # 1. Greeting Interception (Bug 18 / Joel's "hi" search quality fix)
    clean_q = req.query.strip().lower()
    is_exec = (
        req.clearance == "EXECUTIVE_ONLY" or
        (req.user_role and req.user_role.upper() in ("FOUNDER", "CHIEF_ARCHITECT", "EXECUTIVE"))
    )
    if clean_q in GREETINGS:
        elapsed_ms = (time.perf_counter() - start_time) * 1000
        user_display = req.user_name or ("Alex" if is_exec else "Team Member")
        if is_exec:
            greeting_text = (
                f"Hello {user_display}! Founder clearance active. I am TARS, your strategic & institutional intelligence co-pilot. "
                f"How can I assist you with corporate memory, architecture radar, or active client commitments today?"
            )
        else:
            greeting_text = (
                f"Hello {user_display}! I am TARS, your startup institutional second brain. "
                f"How can I assist you today with company policies, client commitments, or architectural decisions?"
            )
        return SearchResponse(
            query=req.query,
            answer=greeting_text,
            citations=[],
            latency_ms=round(elapsed_ms, 2)
        )

    # 2. RBAC-Filtered Federated Search
    citations = await search_service.search(
        query=req.query,
        user_clearance=req.clearance,
        user_role=req.user_role or "ENGINEER"
    )
    print(f"[SEARCH DEBUG] Citations found: {len(citations)}", flush=True)
    
    # Retrieve and format institutional company facts
    company = company_repo.get_profile() or {}
    comp_name = company.get("company_name", "AetherFlow Technologies, Inc.")
    team_size = company.get("team_size", "12 FTE")
    runway_m = company.get("runway_months", 9.0)

    company_facts = (
        f"Company Name: {comp_name}\n"
        f"Current Team Size: {team_size} (12 full-time employees: Alex Vance CEO, Dr. Elena Rostova CTO, Marcus Chen Product, Sarah Jenkins Sales, Liam Patel Senior Backend, Chloe Dubois Engineer, and 6 core contributors)\n"
        f"Financial Runway: {runway_m} months remaining ($666,000 liquid cash in bank, -$74,000/mo net burn)\n"
        f"Key Metrics: $82,000 MRR ($984K ARR), 72 active enterprise customers, 108% net revenue retention\n"
        f"Core Enterprise Policy (BDR-014): Zero custom enterprise feature forks or bespoke SSO customisations (SAML SSO exception allowed under BDR-018)\n"
        f"Architecture Invariant (INV-017): Outbox pattern required, outbound HTTP calls strictly prohibited inside DB transactions\n"
        f"Tech Stack: Python, TypeScript, FastAPI, React 19, SQLite WAL, Tree-sitter AST, local SLMs\n"
    )

    # Synthesize answer with local Ollama SLM
    user_context = f"\nActive User Context: The current user is '{req.user_name or 'Team Member'}' with the assigned role '{req.user_role or 'ENGINEER'}' and clearance level '{req.clearance}'.\n"
    system_prompt = (
        f"You are TARS, the autonomous startup second brain for {comp_name}. "
        "Answer questions directly, accurately, and professionally based strictly on verified company facts and internal documents. "
        "Do NOT output internal thinking or scratchpad notes. "
        "Do NOT repeat the question or start with robotic self-introductions like 'As TARS, the autonomous startup second brain...'. "
        "Provide a polished, complete answer."
    )
    prompt = (
        f"Company Institutional Knowledge Facts:\n{company_facts}\n"
        f"{user_context}"
        f"IMPORTANT: If the user asks about their role ('what is my role', 'whats my primary role', 'who am i', 'what do i do'), explain THEIR role ({req.user_role or 'their assigned position'}) and their key duties at the company, NOT TARS's role.\n\n"
    )

    # Layer 2 RBAC Guardrail: explicit security policy
    if not is_exec:
        prompt += "SECURITY POLICY: If the user queries cap table allocations, founder equity, or confidential executive finances, state clearly that this information is restricted to Founder/Executive clearance and refuse disclosure.\n"

    prompt += f"Query: {req.query}\n"

    if citations:
        context_str = "\n".join([f"- [{c.doc_title}]: {c.snippet}" for c in citations])
        prompt += f"\nRelevant Internal Documents:\n{context_str}\n"

    prompt += (
        f"\nUser Query: {req.query}\n\n"
        "Provide a structured, refined, and complete response addressing this query directly. "
        f"IMPORTANT: If the user asks about their role ('what is my role', 'whats my primary role', 'who am i', 'what do i do'), explain THEIR role ({req.user_role or 'their assigned position'}) and their key duties at the company, NOT TARS's role.\n"
        "Ensure all points are distinct, actionable, and the answer concludes cleanly without trailing off."
    )

    # 3. Honest Local Ollama Generation & Outage Behavior
    ollama_ok = await ollama_client.is_available()
    if not ollama_ok:
        print("[SEARCH DEBUG] Ollama is OFFLINE. Returning truthful outage response.", flush=True)
        if citations:
            answer = f"Local AI unavailable — Ollama is not running. Found {len(citations)} relevant citations matching '{req.query}' in institutional knowledge memory."
        else:
            answer = f"Local AI unavailable — Ollama is not running. Found 0 relevant citations matching '{req.query}' in the local knowledge lake."
    else:
        print(f"[SEARCH DEBUG] Calling ollama_client.generate...", flush=True)
        llm_res = await ollama_client.generate(prompt, task_complexity="deep", max_tokens=1024, system=system_prompt)
        print(f"[SEARCH DEBUG] ollama_client.generate completed: success={llm_res.get('success')}", flush=True)
        if llm_res.get("success") and llm_res.get("response"):
            answer = str(llm_res.get("response")).strip()
        elif citations:
            answer = f"Found {len(citations)} relevant citations matching '{req.query}' in institutional knowledge memory."
        else:
            answer = f"Found 0 relevant citations matching '{req.query}' in the local knowledge lake."

    # 4. Telemetry Logging (Safe Continuous Learning Telemetry)
    try:
        conn = db.get_connection()
        conn.execute(
            "INSERT INTO interaction_logs (id, user_name, user_role, clearance, event_type, query, response) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (f"LOG-{uuid.uuid4().hex[:8]}", req.user_name or "Anonymous", req.user_role or "ENGINEER", req.clearance, "SEARCH", req.query, answer[:500])
        )
        conn.commit()
    except Exception as log_err:
        print(f"Notice: Interaction telemetry log note: {log_err}")

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

# --- User Registry Routes ---
@router.post("/users", response_model=UserDTO)
async def create_user(payload: UserCreateDTO):
    try:
        return user_manager.create_user(payload)
    except ValueError as val_err:
        raise HTTPException(status_code=400, detail=str(val_err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to create user: {err}")

@router.get("/users", response_model=List[UserDTO])
async def list_users():
    return user_manager.list_users()

@router.get("/users/{user_id}", response_model=UserDTO)
async def get_user(user_id: str):
    user = user_manager.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

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

# --- Genesis Onboarding & Sovereign Company Profile Routes ---
@router.get("/company/profile", response_model=Optional[CompanyProfileDTO])
async def get_company_profile(company_id: Optional[str] = None, company_name: Optional[str] = None):
    """
    Retrieves the persisted sovereign startup company profile.
    Returns None if the instance has not yet undergone Genesis Onboarding.
    """
    profile = company_repo.get_profile(company_id=company_id, company_name=company_name)
    if not profile:
        return None
    # If the company has registered but not yet completed Genesis Blooming, return None
    if not profile.get("is_bloomed", True):
        return None
    return CompanyProfileDTO(**profile)

@router.post("/company/profile", response_model=CompanyProfileDTO)
async def upsert_company_profile(profile_in: CompanyProfileCreate):
    """
    Creates or updates the institutional company profile in local memory.
    """
    profile = company_repo.upsert_profile(profile_in.model_dump())
    return CompanyProfileDTO(**profile)

@router.post("/genesis/bloom", response_model=GenesisBloomResponse)
async def bloom_genesis(payload: GenesisBloomRequest):
    """
    Executes instant Genesis Blooming in under 3 minutes:
    - Persists sovereign company profile to SQLite and .tars/vault.db.
    - Seeds root Decision nodes into the embedded Kùzu graph.
    - Configures 14-day role-adaptive flight-plans in Unified Action Hub.
    - Ingests golden stage demo assets if requested by the user.
    """
    result = company_repo.bloom_genesis(payload.model_dump())
    return GenesisBloomResponse(
        status=result["status"],
        company_profile=CompanyProfileDTO(**result["company_profile"]),
        seeded_decisions=result["seeded_decisions"],
        flight_plans_count=result["flight_plans_count"],
        loaded_assets=result["loaded_assets"],
        nodes_bloomed=result["nodes_bloomed"],
        timestamp=result["timestamp"],
    )

@router.post("/genesis/seed-document")
async def upload_seed_document(file: UploadFile = File(...)):
    """
    Accepts an initial seed document (Pitch Deck, Pitch Memo, Whitepaper, or Financial Model)
    and ingests it into institutional knowledge lake without external network egress.
    """
    filename = file.filename or "seed_document.txt"
    drop_dir = os.path.abspath(os.path.join(os.getcwd(), "drop"))
    os.makedirs(drop_dir, exist_ok=True)
    temp_path = os.path.join(drop_dir, f"seed_{uuid.uuid4().hex[:6]}_{filename}")

    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    doc_id = f"DOC-SEED-{uuid.uuid4().hex[:8].upper()}"
    pages_count = 1
    tables_count = 0

    try:
        from apps.api.ingestion.markitdown_parser import markitdown_parser
        parsed = markitdown_parser.parse_file(temp_path, department="FOUNDING", clearance="EXECUTIVE_ONLY")
        doc_id = parsed.get("doc_id", doc_id)
        pages_count = parsed.get("page_count", 1)
        tables_count = parsed.get("table_count", 0)
    except Exception:
        # Fallback to plain text memory persistence
        try:
            with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()
            conn = db.get_connection()
            conn.execute('''
                INSERT INTO memories (id, record_type, title, content, source, timestamp, tags)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            ''', (doc_id, "DOCUMENT", filename, content, "GENESIS_SEED", int(time.time()), "genesis,seed"))
            conn.commit()
        except Exception as store_err:
            print(f"Notice: Seed document stored with message: {store_err}")

    return {
        "doc_id": doc_id,
        "title": filename,
        "pages": pages_count,
        "tables": tables_count,
        "message": f"Successfully parsed and ingested '{filename}' into institutional memory."
    }


# --- Sovereign Workspace Management & Data Isolation Routes ---
@router.post("/workspace/reset", response_model=WorkspaceResetResponse)
async def reset_workspace(payload: WorkspaceResetRequest):
    """
    Decouples mock data fixtures and resets sovereign workspace state.
    Provides fine-grained controls to clear demo fixtures or perform a pristine reset for authentic custom company data.
    """
    reset_type = (payload.reset_type or "ALL").upper()
    valid_types = {"ALL", "DEMO_ONLY", "DOCUMENTS", "ACTIONS", "DECISIONS"}
    if reset_type not in valid_types:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid reset_type '{reset_type}'. Must be one of {sorted(valid_types)}."
        )

    cleared: Dict[str, int] = {
        "documents": 0,
        "action_items": 0,
        "memories": 0,
        "decisions": 0,
    }

    conn = db.get_connection()
    cursor = conn.cursor()

    # 1. Reset Documents & Semantic Memories
    if reset_type in {"ALL", "DEMO_ONLY", "DOCUMENTS"}:
        if reset_type == "DEMO_ONLY":
            cursor.execute("SELECT COUNT(*) FROM documents WHERE is_demo = 1 OR doc_id LIKE 'DOC-GEN-%'")
            cleared["documents"] = cursor.fetchone()[0]
            cursor.execute("DELETE FROM documents WHERE is_demo = 1 OR doc_id LIKE 'DOC-GEN-%'")

            cursor.execute("SELECT COUNT(*) FROM memories WHERE is_demo = 1 OR source IN ('GENESIS_SEED', 'SAMPLE', 'DEMO')")
            cleared["memories"] = cursor.fetchone()[0]
            cursor.execute("DELETE FROM memories WHERE is_demo = 1 OR source IN ('GENESIS_SEED', 'SAMPLE', 'DEMO')")
        else:
            cursor.execute("SELECT COUNT(*) FROM documents")
            cleared["documents"] = cursor.fetchone()[0]
            cursor.execute("DELETE FROM documents")

            cursor.execute("SELECT COUNT(*) FROM memories")
            cleared["memories"] = cursor.fetchone()[0]
            cursor.execute("DELETE FROM memories")

        # Synchronise clearing in markitdown_parser cache
        try:
            from apps.api.ingestion.markitdown_parser import markitdown_parser
            if reset_type == "DEMO_ONLY":
                markitdown_parser.ingested_hashes = {
                    h: v for h, v in markitdown_parser.ingested_hashes.items() if not v.get("is_demo")
                }
            else:
                markitdown_parser.ingested_hashes.clear()
        except Exception:
            pass

    # 2. Reset Action Items
    if reset_type in {"ALL", "DEMO_ONLY", "ACTIONS"}:
        if reset_type == "DEMO_ONLY":
            cursor.execute("SELECT COUNT(*) FROM action_items WHERE is_demo = 1 OR id LIKE 'ACT-GEN-%'")
            cleared["action_items"] = cursor.fetchone()[0]
            cursor.execute("DELETE FROM action_items WHERE is_demo = 1 OR id LIKE 'ACT-GEN-%'")
        else:
            cursor.execute("SELECT COUNT(*) FROM action_items")
            cleared["action_items"] = cursor.fetchone()[0]
            cursor.execute("DELETE FROM action_items")

        # Also clear action_hub_repo's database if separate
        try:
            from apps.api.ingestion.action_hub import action_hub_repo
            if reset_type in {"ALL", "ACTIONS"}:
                action_hub_repo.clear()
        except Exception:
            pass

    # 3. Reset Company Decisions
    if reset_type in {"ALL", "DEMO_ONLY", "DECISIONS"}:
        try:
            from apps.api.cortex.graph import TarsGraph
            graph = TarsGraph()
            if reset_type == "DEMO_ONLY":
                demo_decisions = ["DEC-GEN-001", "DEC-GEN-002", "DEC-GEN-003"]
                for dec_id in demo_decisions:
                    try:
                        graph.conn.execute("MATCH (d:Decision {id: $id}) DETACH DELETE d", {"id": dec_id})
                        cleared["decisions"] += 1
                    except Exception:
                        pass
            else:
                try:
                    res = graph.conn.execute("MATCH (d:Decision) RETURN count(d)")
                    if res.has_next():
                        cleared["decisions"] = res.get_next()[0]
                    graph.conn.execute("MATCH (d:Decision) DETACH DELETE d")
                except Exception:
                    pass
        except Exception as graph_err:
            print(f"Notice: Graph decision clearing message: {graph_err}")

    # 4. Reset Company Profile if requested and not preserved
    if reset_type == "ALL" and not payload.preserve_company_profile:
        cursor.execute("DELETE FROM company_profile")

    conn.commit()

    # Mirror changes to .tars/vault.db if present
    try:
        if os.getenv("TARS_IS_TEST") == "1" or os.getenv("TARS_TESTING") == "1" or os.getenv("PYTEST_CURRENT_TEST"):
            vault_path = os.getenv("TARS_VAULT_PATH")
        else:
            vault_path = os.getenv("TARS_VAULT_PATH", os.path.join(os.getcwd(), ".tars", "vault.db"))

        if vault_path and os.path.exists(vault_path):
            import sqlite3
            with sqlite3.connect(vault_path) as v_conn:
                if reset_type in {"ALL", "DEMO_ONLY", "DOCUMENTS"}:
                    if reset_type == "DEMO_ONLY":
                        v_conn.execute("DELETE FROM documents WHERE is_demo = 1 OR doc_id LIKE 'DOC-GEN-%'")
                    else:
                        v_conn.execute("DELETE FROM documents")
                if reset_type == "ALL" and not payload.preserve_company_profile:
                    v_conn.execute("DELETE FROM company_profile")
                v_conn.commit()
    except Exception as v_err:
        print(f"Notice: Non-fatal vault.db clearing message: {v_err}")

    now_ts = int(time.time())
    msg = f"Sovereign workspace reset completed successfully (Mode: {reset_type})."

    return WorkspaceResetResponse(
        status="SUCCESS",
        message=msg,
        cleared=cleared,
        timestamp=now_ts,
    )


# ============================================================
# EXPLICIT INSTITUTIONAL TEACHING ("TEACH TARS") (Track 3)
# ============================================================

class TeachMemoryRequest(BaseModel):
    content: Optional[str] = None
    fact: Optional[str] = None
    title: Optional[str] = None
    category: Optional[str] = "POLICY"
    clearance: str = "ALL_TEAM"
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    user_role: Optional[str] = None

class TeachMemoryResponse(BaseModel):
    memory_id: str
    status: str
    title: str
    clearance: str
    timestamp: int
    message: str

@router.post("/teach", response_model=TeachMemoryResponse)
async def teach_institutional_memory(req: TeachMemoryRequest):
    """
    Directly teaches TARS institutional knowledge (e.g. '/teach Our payment provider is Stripe').
    Persists to SQLite memories with clearance level, tags, and audit telemetry.
    Immediately accessible to future unified search and LLM context synthesis.
    """
    raw_content = (req.content or req.fact or "").strip()
    if not raw_content:
        raise HTTPException(status_code=400, detail="Content cannot be empty")
    
    mem_id = f"MEM-TEACH-{uuid.uuid4().hex[:8].upper()}"
    if req.title:
        title = req.title
    else:
        words = raw_content.split()
        title = " ".join(words[:6]) if len(words) >= 3 else f"Taught Fact ({req.category or 'POLICY'})"
    content = raw_content
    source = f"TEACH:{req.user_name or req.user_role or 'USER'}"
    now_ts = int(time.time())
    tags = f"teach,learned,{(req.category or 'policy').lower()}"

    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO memories (id, record_type, title, content, source, timestamp, tags, clearance)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (mem_id, "INSTITUTIONAL_FACT", title, content, source, now_ts, tags, req.clearance or "ALL_TEAM"))

    # Log to interaction_logs telemetry
    cursor.execute('''
        INSERT INTO interaction_logs (id, session_id, user_name, user_role, clearance, event_type, query, response)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        f"LOG-{uuid.uuid4().hex[:8]}",
        req.user_id,
        req.user_name or "Anonymous",
        req.user_role or "ENGINEER",
        req.clearance or "ALL_TEAM",
        "TEACH",
        title,
        content
    ))
    conn.commit()

    return TeachMemoryResponse(
        memory_id=mem_id,
        status="LEARNED",
        title=title,
        clearance=req.clearance or "ALL_TEAM",
        timestamp=now_ts,
        message=f"Institutional memory successfully updated: '{title}' recorded."
    )


# ============================================================
# THINK TANK PERSISTENCE & CRUD ROUTES (Track 3)
# ============================================================

class ThinkTankChannelDTO(BaseModel):
    id: str
    name: str
    topic: Optional[str] = None
    created_at: Optional[str] = None

class ThinkTankChannelCreate(BaseModel):
    name: str
    topic: Optional[str] = None

class ThinkTankMessageDTO(BaseModel):
    id: str
    channel_id: str
    sender: str
    sender_role: Optional[str] = "ENGINEER"
    sender_type: Optional[str] = "USER"
    text: str
    provenance: Optional[str] = None
    is_ai: bool = False
    is_edited: bool = False
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class ThinkTankMessageCreate(BaseModel):
    channel_id: str = "general"
    sender: Optional[str] = "You"
    sender_name: Optional[str] = None
    sender_id: Optional[str] = None
    sender_role: Optional[str] = "ENGINEER"
    sender_type: Optional[str] = "USER"
    text: Optional[str] = None
    content: Optional[str] = None
    provenance: Optional[str] = None
    is_ai: bool = False

class ThinkTankMessageUpdate(BaseModel):
    text: Optional[str] = None
    content: Optional[str] = None

@router.get("/thinktank/channels", response_model=List[ThinkTankChannelDTO])
async def list_thinktank_channels():
    """Returns all active Think Tank discussion channels."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, name, topic, created_at FROM thinktank_channels WHERE is_deleted = 0 ORDER BY created_at ASC")
    rows = cursor.fetchall()
    return [ThinkTankChannelDTO(
        id=r["id"],
        name=r["name"],
        topic=r["topic"] or "",
        created_at=str(r["created_at"])
    ) for r in rows]

@router.post("/thinktank/channels", response_model=ThinkTankChannelDTO)
async def create_thinktank_channel(payload: ThinkTankChannelCreate):
    """Creates a new persistent Think Tank channel."""
    clean_name = payload.name.strip()
    if not clean_name.startswith("#"):
        clean_name = "#" + clean_name
    ch_id = clean_name.lstrip("#").lower().replace(" ", "-") or f"ch-{uuid.uuid4().hex[:6]}"
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT OR REPLACE INTO thinktank_channels (id, name, topic, is_deleted)
        VALUES (?, ?, ?, 0)
    ''', (ch_id, clean_name, payload.topic or ""))
    conn.commit()
    return ThinkTankChannelDTO(id=ch_id, name=clean_name, topic=payload.topic or "", created_at=str(time.time()))

@router.get("/thinktank/messages", response_model=List[ThinkTankMessageDTO])
async def list_thinktank_messages(channel_id: str = "general"):
    """Returns persistent discussion thread messages for a specific channel."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, channel_id, sender, sender_role, sender_type, text, provenance, is_ai, is_edited, created_at, updated_at
        FROM thinktank_messages
        WHERE channel_id = ? AND is_deleted = 0
        ORDER BY created_at ASC
    """, (channel_id,))
    rows = cursor.fetchall()
    return [
        ThinkTankMessageDTO(
            id=r["id"],
            channel_id=r["channel_id"],
            sender=r["sender"],
            sender_role=r["sender_role"] or "ENGINEER",
            sender_type=r["sender_type"] or "USER",
            text=r["text"],
            provenance=r["provenance"],
            is_ai=bool(r["is_ai"]),
            is_edited=bool(r["is_edited"]),
            created_at=str(r["created_at"]),
            updated_at=str(r["updated_at"])
        ) for r in rows
    ]

@router.post("/thinktank/messages", response_model=ThinkTankMessageDTO)
async def create_thinktank_message(payload: ThinkTankMessageCreate):
    """Persists a new user prompt or assistant reply to Think Tank channel."""
    raw_text = (payload.text or payload.content or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Message text cannot be empty")
    msg_id = f"m-{uuid.uuid4().hex[:8]}"
    sender = payload.sender or payload.sender_name or payload.sender_id or "You"
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO thinktank_messages (
            id, channel_id, sender, sender_role, sender_type, text, provenance, is_ai, is_edited, is_deleted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0)
    ''', (
        msg_id,
        payload.channel_id,
        sender,
        payload.sender_role or "ENGINEER",
        payload.sender_type or ("AI" if payload.is_ai else "USER"),
        raw_text,
        payload.provenance,
        1 if payload.is_ai else 0
    ))
    conn.commit()

    cursor.execute("SELECT id, channel_id, sender, sender_role, sender_type, text, provenance, is_ai, is_edited, created_at, updated_at FROM thinktank_messages WHERE id = ?", (msg_id,))
    r = cursor.fetchone()
    return ThinkTankMessageDTO(
        id=r["id"],
        channel_id=r["channel_id"],
        sender=r["sender"],
        sender_role=r["sender_role"] or "ENGINEER",
        sender_type=r["sender_type"] or "USER",
        text=r["text"],
        provenance=r["provenance"],
        is_ai=bool(r["is_ai"]),
        is_edited=bool(r["is_edited"]),
        created_at=str(r["created_at"]),
        updated_at=str(r["updated_at"])
    )

@router.patch("/thinktank/messages/{message_id}", response_model=ThinkTankMessageDTO)
async def update_thinktank_message(message_id: str, payload: ThinkTankMessageUpdate):
    """Edits an existing Think Tank message and marks it as edited."""
    raw_text = (payload.text or payload.content or "").strip()
    if not raw_text:
        raise HTTPException(status_code=400, detail="Updated text cannot be empty")
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        UPDATE thinktank_messages
        SET text = ?, is_edited = 1, updated_at = CURRENT_TIMESTAMP
        WHERE id = ? AND is_deleted = 0
    ''', (raw_text, message_id))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    conn.commit()

    cursor.execute("SELECT id, channel_id, sender, sender_role, sender_type, text, provenance, is_ai, is_edited, created_at, updated_at FROM thinktank_messages WHERE id = ?", (message_id,))
    r = cursor.fetchone()
    return ThinkTankMessageDTO(
        id=r["id"],
        channel_id=r["channel_id"],
        sender=r["sender"],
        sender_role=r["sender_role"] or "ENGINEER",
        sender_type=r["sender_type"] or "USER",
        text=r["text"],
        provenance=r["provenance"],
        is_ai=bool(r["is_ai"]),
        is_edited=bool(r["is_edited"]),
        created_at=str(r["created_at"]),
        updated_at=str(r["updated_at"])
    )

@router.delete("/thinktank/messages/{message_id}")
async def delete_thinktank_message(message_id: str):
    """Soft deletes a Think Tank message."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE thinktank_messages SET is_deleted = 1 WHERE id = ?", (message_id,))
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Message not found")
    conn.commit()
    return {"status": "deleted", "id": message_id}

@router.delete("/thinktank/channels/{channel_id}/messages")
async def clear_thinktank_channel_messages(channel_id: str):
    """Clears all message history in a channel."""
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM thinktank_messages WHERE channel_id = ? AND is_deleted = 0", (channel_id,))
    count = cursor.fetchone()[0]
    cursor.execute("UPDATE thinktank_messages SET is_deleted = 1 WHERE channel_id = ?", (channel_id,))
    conn.commit()
    return {"status": "cleared", "channel_id": channel_id, "cleared_count": count}



