# apps/api/schemas/platform_contracts.py
"""Domain-Partitioned Schemas for Track 4: Platform AST & Sentinel."""
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional


class AstSentinelResultDTO(BaseModel):
    rule_id: str
    rule_name: str
    violating_file: str
    line_number: int
    rationale: str
    suggested_refactor: str
    is_breached: bool = True
    violating_code: Optional[str] = None


class StagedRadarCheckResponse(BaseModel):
    staged_files_count: int = Field(..., description="Number of Git staged files analyzed")
    inspection_latency_ms: float = Field(..., description="Time taken to scan staged files via Tree-sitter")
    breaches_found: int = Field(..., description="Number of invariant breaches detected")
    breach_details: List[Dict[str, Any]] = Field(default_factory=list, description="Detailed list of invariant violations")
    push_sentinel_active: bool = Field(default=True, description="Whether pre-push sentinel hook is configured and active")


RadarStagedDTO = StagedRadarCheckResponse
