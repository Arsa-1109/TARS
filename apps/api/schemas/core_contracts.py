# apps/api/schemas/core_contracts.py
"""
Track 3: Core Storage, Chat & RBAC Contracts
Exclusive domain schema definitions for Teammate 3.
"""
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any


class ChatMessageCreate(BaseModel):
    channel_id: str
    content: str
    reply_to_id: Optional[str] = None
    sender_id: Optional[str] = None
    sender_name: Optional[str] = None
    sender_role: Optional[str] = None


class ChatMessageUpdate(BaseModel):
    content: str


class ChatMessageResponse(BaseModel):
    id: str
    channel_id: str
    user_id: str
    user_name: str
    user_role: str
    content: str
    reply_to_id: Optional[str] = None
    is_edited: bool = False
    created_at: str


class ClearanceFilterRequest(BaseModel):
    query: str
    department: str
    user_clearance: str  # 'EXECUTIVE_ONLY' | 'ALL_TEAM'
    user_role: str       # 'FOUNDER' | 'ENGINEER' | 'MARKETING'


class TeachMemoryRequest(BaseModel):
    content: str = Field(..., description="Institutional fact, guideline, or corporate rule")
    category: str = Field(default="STRATEGY", description="STRATEGY | ENGINEERING | POLICY | OPERATIONS")
    clearance: str = Field(default="ALL_TEAM", description="ALL_TEAM | EXECUTIVE_ONLY")
    title: Optional[str] = None


class TeachMemoryResponse(BaseModel):
    memory_id: str
    status: str
    timestamp: str


class CoreSearchResponse(BaseModel):
    query: str
    total_hits: int
    results: List[Dict[str, Any]]
    conversational_response: Optional[str] = None
    starter_chips: Optional[List[str]] = None
