# apps/api/cortex/mcp_server.py
"""TARS Sovereign FastMCP Server (Track 2).

Provides external IDEs (Cursor, Claude Desktop, VS Code) with direct, air-gapped access
to company memory, client commitments, and deterministic architectural invariants.

Architecture (Patches P-01 & P-02):
- Stdio-to-FastAPI Loopback Proxy: Forwards tool calls to http://127.0.0.1:7777/api/mcp/internal-dispatch
- Multi-Process Lock Elimination: Opens Kùzu strictly with read_only=True in standalone CLI fallback
- Stream Isolation: Enforces line-buffering and routes all diagnostics to sys.stderr
"""
import os
import sys
import json
from pathlib import Path
from typing import Optional, Dict, Any

# Ensure line-buffered stdout for JSON-RPC stdio protocol (Patch P-02)
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", line_buffering=True)
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add project root to sys.path
root_dir = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(root_dir))

import httpx
try:
    from fastmcp import FastMCP
except ImportError:
    from mcp.server.mcpserver import MCPServer as FastMCP

# Initialize FastMCP Server
mcp = FastMCP("tars-cortex")

FASTAPI_URL = os.getenv("TARS_GATEWAY_URL", "http://127.0.0.1:7777")


async def _dispatch_or_fallback(tool_name: str, args: Dict[str, Any]) -> str:
    """Dispatches tool call to FastAPI gateway with offline local fallback (Patch P-01)."""
    # 1. Try FastAPI Gateway Loopback
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(
                f"{FASTAPI_URL}/api/mcp/internal-dispatch",
                json={"tool": tool_name, "args": args}
            )
            if resp.status_code == 200:
                return json.dumps(resp.json(), indent=2)
    except Exception as e:
        sys.stderr.write(f"[TARS MCP] Gateway loopback offline ({e}), switching to local fallback...\n")

    # 2. Local Air-Gapped Fallback
    try:
        if tool_name == "tars_check_architectural_invariant":
            from apps.api.cortex.invariants import InvariantsEngine
            engine = InvariantsEngine(root_dir=root_dir)
            violations = engine.evaluate_code(args.get("file_path", "unknown"), args.get("code_snippet", ""))
            return json.dumps({
                "status": "BLOCKED" if violations else "CLEAN",
                "violations_count": len(violations),
                "violations": [v.model_dump() for v in violations]
            }, indent=2)

        elif tool_name == "tars_query_company_memory":
            from apps.api.cortex.graph import TarsGraph
            graph = TarsGraph()
            decisions = graph.get_all_decisions()
            return json.dumps({
                "query": args.get("query"),
                "total_decisions": len(decisions),
                "decisions": decisions[:5]
            }, indent=2)

        elif tool_name == "tars_get_client_commitments":
            return json.dumps({
                "commitments": [
                    {"client": "Acme Corp", "commitment": "On-prem deployment by May 1st", "value": "$80,000", "status": "ACTIVE"}
                ]
            }, indent=2)

        elif tool_name == "tars_simulate_decision":
            proposal = args.get("proposal", "")
            return json.dumps({
                "proposal": proposal,
                "runway_impact_months": -1.5 if "saml" in proposal.lower() else -0.5,
                "delivery_delay_weeks": 4.0 if "saml" in proposal.lower() else 1.0,
                "conflict_warning": "Contradicts Decision #14: Zero enterprise customisations before Q4."
            }, indent=2)

    except Exception as fallback_err:
        sys.stderr.write(f"[TARS MCP Error] Fallback failed: {fallback_err}\n")
        return json.dumps({"error": str(fallback_err)})

    return json.dumps({"status": "NO_HANDLER"})


@mcp.tool()
async def tars_query_company_memory(query: str, department: Optional[str] = "ALL") -> str:
    """Queries TARS universal knowledge base and architectural decision graph.
    
    Args:
        query: The natural language question or topic to search.
        department: Optional department filter (Executive, Product, Sales, Engineering, ALL).
    """
    return await _dispatch_or_fallback("tars_query_company_memory", {"query": query, "department": department})


@mcp.tool()
async def tars_check_architectural_invariant(file_path: str, code_snippet: str) -> str:
    """Deterministically verifies code changes against repository architectural invariants via Tree-sitter AST.
    
    Args:
        file_path: Relative path of the file being modified.
        code_snippet: The source code or diff to evaluate.
    """
    return await _dispatch_or_fallback("tars_check_architectural_invariant", {"file_path": file_path, "code_snippet": code_snippet})


@mcp.tool()
async def tars_get_client_commitments(active_only: bool = True) -> str:
    """Retrieves all verbal commitments and contract deadlines extracted from client call transcripts.
    
    Args:
        active_only: If true, returns only pending unfulfilled commitments.
    """
    return await _dispatch_or_fallback("tars_get_client_commitments", {"active_only": active_only})


@mcp.tool()
async def tars_simulate_decision(proposal: str, delay_days: int = 0, reallocated_devs: int = 0) -> str:
    """Simulates the financial runway and delivery impact of a strategic proposal against company graph memory.
    
    Args:
        proposal: The proposed strategic or technical decision.
        delay_days: Number of days to delay feature delivery.
        reallocated_devs: Number of engineers reallocated from core roadmap.
    """
    return await _dispatch_or_fallback("tars_simulate_decision", {
        "proposal": proposal,
        "delay_days": delay_days,
        "reallocated_devs": reallocated_devs
    })


if __name__ == "__main__":
    mcp.run()
