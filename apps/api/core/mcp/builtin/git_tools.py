import subprocess
import os
from pathlib import Path
from apps.api.core.mcp.registry import registry
from apps.api.core.mcp.schemas import ToolMetadata, RiskLevel, ExecutionResult

# Explicit configured repository root (Item 124, 125)
REPO_ROOT = Path(os.getenv("TARS_WORKSPACE_ROOT") or Path(__file__).resolve().parents[5]).resolve()

def run_subprocess(cmd: list) -> ExecutionResult:
    try:
        # Prevent arbitrary shell execution by using shell=False and strict command lists
        # Enforce explicit repository root working directory (Item 125)
        workdir = REPO_ROOT if REPO_ROOT.exists() else Path.cwd()
        res = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True,
            shell=False,
            stdin=subprocess.DEVNULL,
            cwd=str(workdir)
        )
        return ExecutionResult(success=True, data=res.stdout)
    except subprocess.CalledProcessError as e:
        return ExecutionResult(success=False, error=e.stderr)
    except Exception as e:
        return ExecutionResult(success=False, error=str(e))

async def handle_git_status(args: dict) -> ExecutionResult:
    return run_subprocess(["git", "status"])

async def handle_git_diff(args: dict) -> ExecutionResult:
    return run_subprocess(["git", "diff"])

async def handle_git_log(args: dict) -> ExecutionResult:
    try:
        count = min(max(int(args.get("n", 10)), 1), 100)
    except (ValueError, TypeError):
        count = 10
    return run_subprocess(["git", "log", "-n", str(count), "--oneline"])

def register_git_tools():
    registry.register(
        ToolMetadata(name="git.status", description="Get git status", input_schema={}, category="git", read_only=True, risk=RiskLevel.LOW, requires_approval=False),
        handle_git_status
    )
    registry.register(
        ToolMetadata(name="git.diff", description="Get git diff", input_schema={}, category="git", read_only=True, risk=RiskLevel.LOW, requires_approval=False),
        handle_git_diff
    )
    registry.register(
        ToolMetadata(name="git.log", description="Get git log", input_schema={"type": "object", "properties": {"n": {"type": "integer"}}}, category="git", read_only=True, risk=RiskLevel.LOW, requires_approval=False),
        handle_git_log
    )
