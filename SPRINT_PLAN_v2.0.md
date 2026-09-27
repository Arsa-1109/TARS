---
created: '2026-09-27'
modified: '2026-09-27'
tags:
- project/async26
- track/sovereign-ai
- type/sprint-plan
- protocol/mcp
- version/2.0.0
- status/ready-to-build
project: ASYNC26-Sovereign-Startup-Brain
type: sprint-plan
status: active
title: 'TARS: MCP-Integrated 4-Contributor Sprint Plan (Version 2.0.0 — Master Superset)'
domain: projects
---

# 🌐 TARS: MCP-Integrated 4-Contributor Sprint Plan (Version 2.0.0 — Master Superset)

**System Name:** TARS (The Autonomous Sovereign Second Brain for Startups)  
**System Version:** 2.0.0 (Frontier Compound SLM & Lean QoS Concurrency Edition)  
**Hackathon Target:** ASYNC'26 Track 1: Sovereign AI (*"Build AI that you can actually own"*)  
**Team Roster:** Four Knights at Freddy’s (USNs: `1MS24CI024, 1MS24CI026, 1MS24CI060, 1MS24CI073`)  
**Lead Architect & Stage Presenter:** Mir Farzin Hussain / Arya (`salimattarya@gmail.com`)  
**Sprint Window:** 30 September – 1 October 2026 (24-Hour On-Campus Sprint at RIT)  
**Target Repository:** [`https://github.com/Arsa-1109/tars`](https://github.com/Arsa-1109/tars)  

---

## 1. Team Roster & Architectural Ownership

| Contributor | Track Name | Exclusive Directory | Primary Tech Stack | Feature Branch |
| :--- | :--- | :--- | :--- | :--- |
| **Contributor 1 (Lead)** | **Core Gateway & Infrastructure** | `apps/api/core/` | FastAPI, SQLite WAL, `sqlite-vec`, Ollama SDK | `feat/core-mcp-host` |
| **Contributor 2 (YOU)** | **Cortex Engine & Sovereign MCP Server** | `apps/api/cortex/` | FastMCP, Tree-sitter, Git Hooks, Stdio Proxy | `feat/cortex-fastmcp-proxy` |
| **Contributor 3** | **Ingestion & Knowledge Graph** | `apps/api/ingestion/` | Markitdown, `faster-whisper` CPU, Kùzu Graph DB | `feat/ingestion-markitdown-audio` |
| **Contributor 4** | **Frontend GUI & Cockpit** | `apps/web/` | React 19, Vite, Tailwind CSS 4, React Flow | `feat/web-mcp-cockpit` |

---

## 2. Track 2 Detailed Specification (Cortex & Sovereign MCP Server)

* **Directory:** `apps/api/cortex/` and `.tars/`
* **Feature Branch:** `feat/cortex-fastmcp-proxy`
* **Tasks:**
  1. Implement **Sovereign MCP Server Loopback Proxy** (`apps/api/cortex/mcp_server.py`):
     * Forwards JSON-RPC tool calls to `http://127.0.0.1:7777/api/mcp/internal-dispatch`.
     * In standalone CLI mode, opens Kùzu strictly with `read_only=True` to eliminate multi-process database file locks.
     * Enforces `PYTHONUNBUFFERED=1` and `sys.stdout.reconfigure(line_buffering=True)` to prevent stdio deadlocks.
  2. Implement FastMCP Tools:
     * `tars_query_company_memory(query: str, department: Optional[str])`
     * `tars_check_architectural_invariant(file_path: str, code_snippet: str)`
     * `tars_get_client_commitments(active_only: bool)`
     * `tars_simulate_decision(proposal: str, delay_days: int, reallocated_devs: int)`
  3. Implement Tree-sitter concrete syntax queries using pre-compiled PyPI wheels (`tree-sitter`, `tree-sitter-python`, `tree-sitter-typescript`).
  4. Hardcode the **4 Killer Rules**:
     * `INV-017`: External HTTP calls inside database transactions (Shopify/GitHub pattern).
     * `INV-021`: Parameter count mismatch between schema and dispatcher (CrowdStrike pattern).
     * `INV-014`: Dead code / dormant flag reuse (Knight Capital pattern).
     * `INV-008`: Plaintext password/token logging (Twitter/X pattern).
  5. Implement `.git/hooks/pre-commit` script invoking `tars check --staged` in $<50\text{ms}$.
  6. Hook up local Qwen 8B prompt to auto-generate MADR records in `docs/adr/ADR-xxx.md`.
