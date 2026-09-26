# TARS: Sovereign Startup Brain

> Sovereign AI Knowledge, Architectural Cortex & Audio Intelligence Engine for High-Velocity Teams.

## Monorepo Architecture

TARS is structured as a 4-track isolated monorepo:

- **Track 1 (`apps/api/core/`)**: Core Gateway, Concurrency Queue, Session DB & Vector Search.
- **Track 2 (`apps/api/cortex/`)**: Graph Engine (Kùzu), AST Parser (Tree-sitter), Architectural Invariants & Pre-commit Hooks.
- **Track 3 (`apps/api/ingestion/`)**: Ambient Drop Folder Watcher, Faster-Whisper Background Pipeline, Voice-to-Spec Extractor & Unified Action Hub.
- **Track 4 (`apps/web/`)**: React 19 Frontend Shell & Workspaces Cockpit.

## Frozen Schema Boundary

All communication across tracks is governed by frozen Pydantic contracts located in `apps/api/schemas/contracts.py`.

## Directory Isolation Invariant

Each contributor develops exclusively within their assigned directory tree to maintain zero-conflict Git rebase and merge operations.
