from enum import Enum
from typing import Any, Dict, Optional
from pydantic import BaseModel, Field

class EventType(str, Enum):
    INVARIANT_BREACH = "INVARIANT_BREACH"
    ACTION_ITEM_CREATED = "ACTION_ITEM_CREATED"
    DOCUMENT_INGESTED = "DOCUMENT_INGESTED"
    DECISION_CREATED = "DECISION_CREATED"

class Event(BaseModel):
    event_id: str
    event_type: EventType
    source: str
    timestamp: int
    payload: Dict[str, Any]
    provenance: Optional[str] = None

class ActionProposal(BaseModel):
    summary: str
    reasoning_context: str
    tool_name: str
    tool_arguments: Dict[str, Any]
    risk_level: str
    requires_approval: bool
    source_event_id: str
    confidence: float
