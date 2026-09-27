import uuid
import time
from apps.api.core.db import db
from apps.api.core.mcp.registry import registry
from apps.api.core.mcp.schemas import ToolMetadata, RiskLevel, ExecutionResult

async def handle_memory_create(args: dict) -> ExecutionResult:
    mem_id = str(uuid.uuid4())
    record_type = args.get("record_type", "document")
    title = args.get("title")
    content = args.get("content")
    source = args.get("source", "mcp")
    
    conn = db.get_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO memories (id, record_type, title, content, source, timestamp)
        VALUES (?, ?, ?, ?, ?, ?)
    ''', (mem_id, record_type, title, content, source, int(time.time())))
    conn.commit()
    
    return ExecutionResult(success=True, data={"id": mem_id})

async def handle_adr_create(args: dict) -> ExecutionResult:
    # Just an alias to create an ADR memory
    args["record_type"] = "adr"
    return await handle_memory_create(args)

def register_memory_tools():
    registry.register(
        ToolMetadata(
            name="memory.create", 
            description="Create a new memory record", 
            input_schema={"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}, "required": ["title", "content"]}, 
            category="memory", 
            read_only=False, 
            risk=RiskLevel.MEDIUM, 
            requires_approval=True
        ),
        handle_memory_create
    )
    registry.register(
        ToolMetadata(
            name="adr.create", 
            description="Create a new ADR record", 
            input_schema={"type": "object", "properties": {"title": {"type": "string"}, "content": {"type": "string"}}, "required": ["title", "content"]}, 
            category="memory", 
            read_only=False, 
            risk=RiskLevel.MEDIUM, 
            requires_approval=True
        ),
        handle_adr_create
    )
