import os
from pathlib import Path
from apps.api.core.mcp.registry import registry
from apps.api.core.mcp.schemas import ToolMetadata, RiskLevel, ExecutionResult

# Restrict to project root
PROJECT_ROOT = Path(os.getcwd()).resolve()

def validate_path(filepath: str) -> bool:
    target = (PROJECT_ROOT / filepath).resolve()
    # Ensure the target is within the project root to prevent workspace boundary violation
    try:
        target.relative_to(PROJECT_ROOT)
        return True
    except ValueError:
        return False

async def handle_fs_read(args: dict) -> ExecutionResult:
    filepath = args.get("path")
    if not filepath:
        return ExecutionResult(success=False, error="Workspace boundary violated: Path is required.")
        
    if not validate_path(filepath):
        return ExecutionResult(success=False, error="Workspace boundary violated: Path is outside the project root.")
    
    target = PROJECT_ROOT / filepath
    if not target.exists():
        return ExecutionResult(success=False, error="File does not exist.")
    if not target.is_file():
        return ExecutionResult(success=False, error="Path is not a file.")
        
    try:
        content = target.read_text(encoding="utf-8")
        return ExecutionResult(success=True, data=content)
    except Exception as e:
        return ExecutionResult(success=False, error=str(e))

def register_filesystem_tools():
    registry.register(
        ToolMetadata(
            name="filesystem.read", 
            description="Read a file in the workspace", 
            input_schema={"type": "object", "properties": {"path": {"type": "string"}}, "required": ["path"]}, 
            category="filesystem", 
            read_only=True, 
            risk=RiskLevel.LOW, 
            requires_approval=False
        ),
        handle_fs_read
    )
