from pydantic import BaseModel, Field
from typing import Dict, Any, Optional, Callable, Awaitable
from enum import Enum

class RiskLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class ToolMetadata(BaseModel):
    name: str
    description: str
    input_schema: Dict[str, Any]
    category: str
    read_only: bool
    risk: RiskLevel
    requires_approval: bool

class ExecutionResult(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
