# apps/api/schemas/cortex_contracts.py
"""Domain-Partitioned Pydantic Schemas for Track 1 (Cortex & Strategy).

Owned by Teammate 1 to prevent merge conflicts with legacy contracts.py.
"""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class DecisionPatchRequest(BaseModel):
    title: Optional[str] = None
    context: Optional[str] = None
    drivers: Optional[List[str]] = None
    chosen_option: Optional[str] = None
    lifecycle_status: Optional[str] = Field(default=None, description="ACTIVE | SUPERSEDED | REPEALED")
    superseded_by: Optional[str] = None


class DecisionCreateRequest(BaseModel):
    id: Optional[str] = None
    title: str
    category: Optional[str] = "STRATEGY"
    context: Optional[str] = ""
    chosen_option: Optional[str] = ""
    clearance: Optional[str] = "ALL_TEAM"
    drivers: Optional[List[str]] = None
    options: Optional[List[str]] = None


class SimulationScenarioRequest(BaseModel):
    scenario_prompt: str = Field(..., description="Natural language prompt e.g. 'What if Acme delays SAML by 2 months?'")
    burn_delta_monthly: float = Field(default=0.0, description="Monthly burn change in USD")
    timeline_shift_days: int = Field(default=0, description="Delay in days")
    devs_reallocated: int = Field(default=0, description="Headcount shifted")


class SimulationScenarioResponse(BaseModel):
    baseline_runway_months: float
    simulated_runway_months: float
    runway_delta_months: float
    compromised_clients: List[Dict[str, Any]]
    compromised_deliverables: List[Dict[str, Any]]
    strategic_narrative: str
    pre_populated_adr: Dict[str, Any]
