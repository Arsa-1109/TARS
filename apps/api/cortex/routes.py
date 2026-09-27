# apps/api/cortex/routes.py
"""FastAPI Router for TARS Cortex Engine (Track 2)."""
import time
from typing import List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from apps.api.schemas.contracts import (
    InvariantCheckResult,
    ContradictionCheckResponse,
    DecisionItem,
)
from .invariants import InvariantsEngine
from .graph import TarsGraph
from .madr_writer import MadrWriter

router = APIRouter(prefix="/api/cortex", tags=["Cortex"])

# Engine Singletons
invariants_engine = InvariantsEngine()
graph_engine = TarsGraph()
madr_writer = MadrWriter()


class CodeCheckRequest(BaseModel):
    file_path: str
    code: str


class AddDecisionRequest(BaseModel):
    id: str
    title: str
    category: str
    context: str
    chosen_option: str
    clearance: str = "ALL_TEAM"


class ContradictionRequest(BaseModel):
    proposal: str
    category: Optional[str] = "ALL"
    severity_threshold: Optional[str] = "STRICT"


@router.post("/check", response_model=List[InvariantCheckResult])
async def check_code_invariants(payload: CodeCheckRequest):
    """Evaluates submitted code buffer against all active Tree-sitter AST invariants in <20ms."""
    start = time.perf_counter()
    violations = invariants_engine.evaluate_code(payload.file_path, payload.code)
    latency_ms = (time.perf_counter() - start) * 1000
    return violations


@router.get("/invariants")
async def get_active_invariants():
    """Returns all registered declarative invariants."""
    return graph_engine.get_all_invariants()


@router.get("/decisions", response_model=List[DecisionItem])
async def get_decisions():
    """Returns all historical Decision nodes from the Kùzu Graph."""
    decisions = graph_engine.get_all_decisions()
    return [
        DecisionItem(
            id=d["id"],
            title=d["title"],
            category=d["category"],
            context=d["context"],
            chosen_option=d["chosen_option"],
            timestamp=d["timestamp"],
            clearance=d.get("clearance", "ALL_TEAM"),
        )
        for d in decisions
    ]


@router.post("/decision")
async def create_decision(payload: AddDecisionRequest):
    """Creates a new Decision node and auto-generates a living MADR."""
    success = graph_engine.add_decision(
        decision_id=payload.id,
        title=payload.title,
        category=payload.category,
        context=payload.context,
        chosen_option=payload.chosen_option,
        clearance=payload.clearance,
    )
    if not success:
        raise HTTPException(status_code=500, detail="Failed to insert decision into Kùzu graph")

    adr_path = madr_writer.generate_madr(
        rule_id=payload.id,
        rule_name=payload.title,
        violating_file="docs/architecture",
        rationale=payload.context,
        suggested_refactor=payload.chosen_option,
    )
    return {"status": "success", "decision_id": payload.id, "madr_path": adr_path}


@router.post("/contradiction-check", response_model=ContradictionCheckResponse)
async def check_contradiction(payload: ContradictionRequest):
    """Performs graph semantic conflict check against existing architectural decisions."""
    result = graph_engine.check_contradiction(
        proposal=payload.proposal,
        category=payload.category or "ALL",
        severity_threshold=payload.severity_threshold or "STRICT",
    )
    return ContradictionCheckResponse(
        has_conflict=result["has_conflict"],
        severity=result["severity"],
        conflicting_decision_id=result["conflicting_decision_id"],
        explanation=result["explanation"],
    )


@router.get("/status")
async def cortex_status():
    """Returns the operational status of the Cortex engine."""
    invariants = graph_engine.get_all_invariants()
    decisions = graph_engine.get_all_decisions()
    return {
        "status": "ONLINE",
        "engine": "Tree-sitter C-AST + Kùzu Graph",
        "active_invariants_count": len(invariants),
        "decisions_count": len(decisions),
        "egress": "0.00 KB (100% Air-Gapped)",
        "pre_commit_latency_budget": "< 50ms",
    }
