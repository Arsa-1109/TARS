import os
from pathlib import Path
from apps.api.core.mcp.registry import registry
from apps.api.core.mcp.schemas import ToolMetadata, RiskLevel, ExecutionResult

# Item 124: Explicit workspace root via TARS_WORKSPACE_ROOT or fallback
WORKSPACE_ROOT_ENV = os.getenv("TARS_WORKSPACE_ROOT")
PROJECT_ROOT = Path(WORKSPACE_ROOT_ENV).resolve() if WORKSPACE_ROOT_ENV else Path(os.getcwd()).resolve()

# Item 126: Hard 1 MB read cap
MAX_READ_BYTES = 1024 * 1024  # 1 MB


def validate_path(filepath: str) -> bool:
    # Item 123: Reject explicit traversal tokens before resolving
    if ".." in filepath or filepath.startswith("/") or filepath.startswith("\\"):
        target = (PROJECT_ROOT / filepath).resolve()
        try:
            target.relative_to(PROJECT_ROOT)
        except ValueError:
            return False
    target = (PROJECT_ROOT / filepath).resolve()
    try:
        target.relative_to(PROJECT_ROOT)
        return True
    except ValueError:
        return False


async def handle_fs_read(args: dict) -> ExecutionResult:
    filepath = args.get("path")
    if not filepath:
        return ExecutionResult(success=False, error="Workspace boundary violated: Path is required.")

    # Item 123: Input string bounding (max 1000 chars)
    if len(str(filepath)) > 1000:
        return ExecutionResult(success=False, error="File path exceeds maximum allowed length of 1000 characters.")

    if not validate_path(filepath):
        return ExecutionResult(success=False, error="Workspace boundary violated: Path is outside the project root.")

    target = (PROJECT_ROOT / filepath).resolve()
    if not target.exists():
        return ExecutionResult(success=False, error="File does not exist.")
    if not target.is_file():
        return ExecutionResult(success=False, error="Path is not a file.")

    # Item 126: Check file size and enforce 1MB cap
    file_size = target.stat().st_size
    try:
        with open(target, "rb") as f:
            raw_bytes = f.read(MAX_READ_BYTES)

        # Detect binary files by checking for null bytes in initial chunk
        if b"\x00" in raw_bytes[:1024]:
            return ExecutionResult(success=False, error="Binary file read rejected under safe sandboxing policy.")

        content = raw_bytes.decode("utf-8", errors="replace")
        is_truncated = file_size > MAX_READ_BYTES
        data = {
            "content": content,
            "size_bytes": file_size,
            "truncated": is_truncated,
        } if is_truncated else content

        return ExecutionResult(success=True, data=data)
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
