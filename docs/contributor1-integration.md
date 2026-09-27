# TARS Integration Guide (Contributor 1)

This document explains the new Core Orchestration and Event pipeline, and how other tracks (Cortex, Ingestion) should connect to it.

## 1. What is an Event?
The `Event` model (in `apps/api/core/events/models.py`) is a standardized payload representing any asynchronous trigger in the TARS system.

## 2. Event Types
Currently supported types:
- `INVARIANT_BREACH`: When Cortex detects a violation in code structure.
- `ACTION_ITEM_CREATED`: When Ingestion extracts a task from a meeting or document.
- `DOCUMENT_INGESTED`: When a new document has been parsed and is ready for analysis.
- `DECISION_CREATED`: When an architectural decision is formalized.

## 3. How Cortex Should Send Events
When Cortex's AST/Graph engine detects a violation, instead of simply returning it, it should post an `Event` of type `INVARIANT_BREACH` to the Orchestrator via `POST /events`.

```json
{
  "event_id": "EVT-100",
  "event_type": "INVARIANT_BREACH",
  "source": "cortex",
  "timestamp": 1690000000,
  "payload": {
    "rule_id": "INV-017",
    "file": "src/payments/service.py",
    "line": 42
  }
}
```

## 4. How Ingestion Should Send Events
When the Action Hub saves an `ActionItemDTO`, it should forward it as an `ACTION_ITEM_CREATED` Event to `POST /events`.

## 5. What the Orchestrator Returns
The `/events` endpoint responds with an `OrchestrationResult`, which contains:
- The parsed `ActionProposal` from local reasoning (Ollama).
- The `ExecutionResult` representing what MCP actually did (if approved).
- A top-level `status` (e.g., `EXECUTED`, `EXECUTION_DENIED_OR_FAILED`).

## 6. How MCP Handles Actions
MCP intercepts the proposed action, verifies it against the tool registry, evaluates permission rules, and executes the local tool (e.g., git commits, memory updates). It logs every decision in the Audit Logger.

## 7. Frontend Integration
The frontend can later poll the Audit Logger or subscribe to the OrchestrationResult to show the user exactly what TARS decided to do and why it was permitted or blocked.
