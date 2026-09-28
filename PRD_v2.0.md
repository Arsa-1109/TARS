---
created: '2026-09-22'
modified: '2026-09-27'
tags:
- project/async26
- track/sovereign-ai
- type/prd
- status/ready-to-build
- version/2.0.0
- model/compound-slm-qwen3
- architecture/lean-qos
project: ASYNC26-Sovereign-Startup-Brain
type: prd
status: active
title: 'PRD v2.0: TARS — Autonomous Sovereign Second Brain for Early-Stage Startups'
domain: projects
---

# Product Requirements Document (PRD): TARS (Version 2.0.0)

## Project Name: TARS (The Autonomous Sovereign Second Brain for Startups)
### *A Private, Collaborative Operating System for Founders, Product, Sales, Operations, and Engineering with Deterministic Architectural Memory*

> [!NOTE]
> **Active Specification (Version 2.0.0 — Superset Architecture)**
> This document is the full, superset Product Requirements Document for TARS. It fully preserves all functional specifications, personas, workflows, epistemological health protocols, and customization options from the [v1.0.0 Baseline](file:///c:/Users/arsal/Documents/Second%20brain/Projects/ASYNC26-Sovereign-Startup-Brain/PRD_v1.0.md), while expanding the architecture with the September 2026 Frontier Compound SLM stack (`qwen3:8b` + `qwen3:1.7b`), Lean QoS Concurrency Engine, Tri-Modal Sovereign Ingestion, Model Context Protocol (MCP) server bridge, and pre-flight hardening patches (P-01 to P-09).
>
> **Formal Relationship:** $\text{PRD}_{\text{v1.0}} \subset \text{PRD}_{\text{v2.0}}$.

**System Version:** 2.0.0 (Frontier Compound SLM & Lean QoS Concurrency Edition)  
**Hackathon:** ASYNC'26 Flagship 24-Hour Hackathon  
**Track:** Track 1: Sovereign AI (*"Build AI that you can actually own"*)  
**Organisers:** Dept. of CSE(AI & ML) & Dept. of CSE(CY), Ramaiah Institute of Technology $\times$ CyreneAI  
**Milestone:** Broad Full-Stack MVP (Sprint Build: 26 Sept – 1 Oct 2026)  
**Lead Architect & Stage Presenter:** Arya / Mir Farzin Hussain (5th Sem B.Tech CSE AI & ML, RIT — `salimattarya@gmail.com`)  
**Target Repository:** [`https://github.com/Arsa-1109/tars`](https://github.com/Arsa-1109/tars)  
**Associated Design Specifications:**
- System Design Document v2.0: [`SDD_v2.0.md`](file:///c:/Users/arsal/Documents/Second%20brain/Projects/ASYNC26-Sovereign-Startup-Brain/SDD_v2.0.md) (and canonical [`SDD.md`](file:///c:/Users/arsal/Documents/Second%20brain/Projects/ASYNC26-Sovereign-Startup-Brain/SDD.md))
- Historical Baseline v1.0 (Archived): [`PRD_v1.0.md`](file:///c:/Users/arsal/Documents/Second%20brain/Projects/ASYNC26-Sovereign-Startup-Brain/PRD_v1.0.md)
- Compound SLM Routing Report: [`COMPOUND-SLM-MODEL-ROUTING-REPORT.md`](file:///c:/Users/arsal/Documents/Second%20brain/Projects/ASYNC26-Sovereign-Startup-Brain/COMPOUND-SLM-MODEL-ROUTING-REPORT.md)
- Master Sprint Plan v2.0: [`MCP-INTEGRATED-CONTRIBUTOR-SPRINT-PLAN-V2.md`](file:///c:/Users/arsal/Documents/Second%20brain/Projects/ASYNC26-Sovereign-Startup-Brain/MCP-INTEGRATED-CONTRIBUTOR-SPRINT-PLAN-V2.md)
- 100-Problem Test Taxonomy: [`TARS_100_Problems_Master_Report.md`](file:///c:/Users/arsal/Documents/Second%20brain/Projects/ASYNC26-Sovereign-Startup-Brain/TARS_100_Problems_Master_Report.md)

---

## 1. Executive Summary & Problem Wedge

### 1.1 The Startup Knowledge Crisis
Early-stage startups (2–15 team members) operate at breakneck execution speeds. High velocity produces catastrophic organisational fragmentation:
1. **Tribal Knowledge Decay & Amnesia:** Strategic agreements made on midnight calls, customer commitments, and engineering trade-offs evaporate from team memory within 14 days.
2. **The Documentation Graveyard:** Conventional tools (Notion, Confluence, Google Docs) demand high manual curation friction. In high-pressure sprints, documentation is abandoned, resulting in $\text{Bus Factor} = 1$ risks and $15+\text{ hours/week}$ lost per founder re-explaining context.
3. **The Sovereign Privacy Paradox:** Early-stage startups possess hyper-sensitive intellectual property: unredacted runway bank balances, cap tables, investor term sheets, enterprise client audio under strict NDAs, and core unpatented source code. Founders cannot legally or prudently paste these assets into public cloud SaaS (Notion AI, Glean, ChatGPT) where data leaks, model retraining, or SaaS subscription costs (\$30/user/mo) threaten company security.
4. **The Monolithic Model Latency Bottleneck (Exposed in v1.0):** In v1.0, routing every ingestion and triage task to a single heavy 7B/8B model incurred a $6–8\text{s}$ latency penalty per document or audio snippet, causing severe UI queuing and developer friction on terminal commits.

### 1.2 The TARS Solution (v2.0 Architectural Paradigm)
**TARS** is an **Autonomous Sovereign Second Brain** hosted centrally on a startup’s private local cloud host (an office Mac Studio, dedicated PC, or private Docker container at `http://tars.local:7777`). Team members access a local React 19 web application over the office Wi-Fi with zero client-side installation and zero cloud data egress ($E_{\text{net}} = 0.00\text{ KB}$).

TARS unifies company operations across 6 cohesive workspaces and 1 central execution hub:
1. **Universal Knowledge Base:** Instant multi-department document lake citing exact source lines in $<200\text{ms}$.
2. **Client Call Studio:** 100% on-device Whisper transcription extracting customer pain points, feature requests, and verbal commitments into actionable roadmap items.
3. **Fast Onboarding Hub:** Role-specific flight-plans and Socratic mentor sandboxes that accelerate new-hire time-to-productivity from 3 weeks to 3 days.
4. **Collaborative Think Tank:** Multi-channel topic discussions and shared meeting notes with an optional visual whiteboard canvas (React Flow) that is never imposed.
5. **Strategic Decision Registry:** Immutable company decision ledger featuring a 3-tier contradiction sensitivity slider and counterfactual "what-if" impact simulation.
6. **Tech & Architecture Workspace:** Dedicated engineering cortex leveraging Tree-sitter AST parsing and embedded Kùzu graph analysis to track system call graphs, code invariants, and plain-English PR summaries.
7. **Unified Action Hub:** Cross-department execution checklist directly linked to source audio timestamps and decision nodes.

Version 2.0 supercharges this foundation with four pivotal advancements:
1. **Frontier Compound SLM Cascade (Patch P-08):** Replaces the monolithic LLM with specialized, co-resident Small Language Models:
   - **`qwen3:1.7b` (Sub-second Ingestion & JSON Extraction):** $1.40\text{ GB}$ VRAM, $120+\text{ t/s}$, sub-$600\text{ms}$ Voice-to-Spec extraction.
   - **`qwen3:8b` (Deep AST Reasoning, ADRs & What-If Simulations):** $5.20\text{ GB}$ VRAM, $40\text{k}$ context, native tool-calling agentic reasoning.
   - **Automated Fallback:** Seamless fallback to `qwen2.5-coder:7b` and `qwen2.5:1.5b` for legacy local hardware.
   - **VRAM Invariant:** Static concurrent footprint of $\mathbf{6.60\text{ GB}}$ VRAM, leaving $\mathbf{4.06\text{ GB}}$ safety headroom on a 16GB machine.
2. **Lean QoS Concurrency Engine (Patch P-09):** Priority-queued execution (`asyncio.PriorityQueue`) guaranteeing developer pre-commit Git hooks ($<50\text{ms}$) pre-empt interactive web chat and background transcription.
3. **Tri-Modal Sovereign Ingestion (Patch P-05 & P-06):** Unredacted ingestion of Audio Transcripts, Markitdown Office Files (PDF, Excel, PPTX, Word), and Text Memos, protected by `<untrusted_external_data>` XML prompt framing.
4. **MCP Sovereign Bridge (Patch P-01 & P-02):** Operates simultaneously as an MCP Host (consuming local tools) and an MCP Server (exposing company memory and invariant validation directly into Cursor IDE and Claude Desktop).

---

## 2. Target Personas & Core Workflows

| Persona | Primary Friction | How TARS Solves It | Core Workspace |
| :--- | :--- | :--- | :--- |
| **Founder / CEO** | Forgetting past rationale; blind spots between cash runway, customer promises, and dev delivery. | Evaluates strategic contradictions; runs multi-layer "what-if" simulations on unredacted company data. | Decision Registry & Think Tank |
| **Head of Product** | Feature drift; customer promises made by sales never reaching engineering specs. | Transforms raw customer call audio into structured user stories, acceptance criteria, and roadmap items in $<600\text{ms}$. | Client Call Studio & Action Hub |
| **Sales & Growth Lead** | Juggling enterprise client requirements, custom commitments, and outdated marketing decks. | Transcribes calls locally under strict NDA; verifies feature feasibility against active company decisions. | Client Call Studio & Knowledge Base |
| **Software Engineer** | Code architectural erosion; breaking unspoken invariants; opaque business rationale. | Inspects system call graphs; enforces architectural invariants at commit time ($<50\text{ms}$); auto-generates MADRs in Cursor via MCP. | Tech & Architecture Workspace |
| **New Hire (Any Role)** | Overwhelmed by fragmented docs; hesitating to ask "stupid questions" to busy founders. | Follows interactive role flight-plans; asks unlimited Socratic questions in a private, patient sandbox. | Fast Onboarding Hub |

---

## 3. Product Architecture & Hosting Model

### 3.1 Local Cloud Deployment (`http://tars.local:7777`)
* **Centralized Private Host:** TARS runs as a lightweight service on a central office machine (e.g. Mac Studio, Linux/Windows mini-server, or private office Docker container).
* **Zero Client Footprint:** Team members require zero software installations, Python environments, or local model downloads. They navigate to `http://tars.local:7777` on Chrome, Safari, or Brave.
* **Zero-Config Persistent Sessions:** Persistent browser session cookies store the user's name and role profile upon first entry. Zero tedious per-seat password logins; zero external auth providers.
* **$100\%$ Sovereign Perimeter:** Outbound telemetry and external API calls are blocked at the socket level. TARS operates flawlessly in total air-gap conditions (Airplane Mode).

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        OFFICE LOCAL NETWORK (http://tars.local:7777)                   │
├──────────────────────┬──────────────────────┬───────────────────┬──────────────────────┤
│  Founder (MacBook)   │  Sales Lead (Windows)│ Engineer (Cursor) │  Mobile PWA (/memo)  │
│  Browser GUI         │  Browser GUI         │ Stdio MCP Proxy   │  1-Tap Audio Debrief │
└──────────┬───────────┴──────────┬───────────┴─────────┬─────────┴──────────┬───────────┘
           │                      │                     │                    │
           └──────────────────────┼─────────────────────┴────────────────────┘
                                  ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                      CENTRAL LOCAL HOST (Office Server / Mac Studio)                    │
│                                                                                        │
│  FastAPI Gateway (Port 7777) ◄──► Lean QoS Priority Queue (apps/api/core/concurrency)  │
│  ┌─────────────────────────────┐         ┌──────────────────────────────────────────┐  │
│  │ Priority 1: Git Hook (<50ms)│         │ Priority 2: Web Cockpit Chat (<250ms)    │  │
│  │ • Tree-sitter AST queries   │         │ • High-priority token streaming (np=4)   │  │
│  │ • Microsecond Model Router  │         │ • Strategic What-If Simulation           │  │
│  └─────────────────────────────┘         └──────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Priority 3: Offline Background Workers (apps/api/ingestion/)                     │  │
│  │ • faster-whisper CPU (compute_type="int8", 2 threads, Semaphore(1), 0.00 MB VRAM)│  │
│  │ • Markitdown Office Ingestion (PDF / Excel / PPTX / Word)                        │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                        │
│  Compound SLM Engine (Ollama Local HTTP JSON-RPC :11434):                              │
│  • qwen3:1.7b (Sub-second Ingestion & JSON Extraction, 1.40 GB VRAM, 120+ t/s)         │
│  • qwen3:8b   (AST Invariants, Living ADRs, Deep Reasoning, 5.20 GB VRAM)              │
│  • Static VRAM Total: 6.60 GB (4.06 GB Safety Buffer on 16GB RAM)                      │
│                                                                                        │
│  Storage: Local SSD (Markdown + SQLite WAL + Kùzu DB + Raw Audio / Docs)               │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Functional Specifications: The 6 Workspaces & Central Hubs

### 4.1 Workspace 1: Universal Knowledge Base
* **Multi-Format Ingestion via Markitdown:** Drag-and-drop support for PDF (pitch decks, contracts), Word (`.docx`), Spreadsheets (`.csv`, `.xlsx`), PowerPoint (`.pptx`), Markdown, and Plain Text (`.txt`).
* **Spreadsheet Markdown Table Conversion:** Automatically flattens multi-tab financial models into markdown tables for semantic indexing.
* **Instant Semantic & Hybrid Search:** Sub-$200\text{ms}$ query latency across all company records using local dense embeddings combined with BM25 lexical search.
* **Exact Line-Level Citations:** Every AI answer provides clickable references displaying the original document name, page number, and paragraph snippet.
* **Department Filtering:** Quick-toggle filters for Executive, Product, Sales, Marketing, and Engineering repositories.

### 4.2 Workspace 2: Client Call Studio (Tri-Modal Sovereign Ingestion)
* **On-Device Whisper Transcription:** Fully air-gapped transcription of `.mp3`, `.wav`, and `.m4a` client and investor recordings using `faster-whisper` pinned strictly to CPU (`compute_type="int8"`, 2 threads).
* **Sub-Second Voice-to-Spec Extraction (`qwen3:1.7b`):** Automated parsing of raw transcripts into 4 structured outputs in $<600\text{ms}$ at $120+\text{ t/s}$:
  1. *Executive Summary & Client Sentiment*
  2. *Unfiltered Customer Pain Points*
  3. *Requested Features & Technical Constraints*
  4. *Explicit Verbal Commitments & Deadlines*
* **1-Click Push to Action Hub & Roadmap:** Promotes any extracted commitment to an active company task with an attributed owner.
* **De-scoping Notice:** Modality C (Live Microphone Streaming via browser WASM/WebAudio) is formally de-scoped to post-hackathon to avoid multi-thread browser crash risks on stage.

### 4.3 Workspace 3: Fast Onboarding Hub
* **Role-Based Flight-Plans:** Tailored 14-day interactive checklists for Sales, Engineering, Product, Marketing, and Operations.
* **Multimedia Journey Tour:** Interactive company history milestones, founding thesis audio recordings, and key customer stories.
* **Socratic Mentor Sandbox:** An unconstrained AI mentor environment where new hires can query company terminology, past project context, and internal procedures without pulling founders away from execution.

### 4.4 Workspace 4: Collaborative Think Tank
* **Channel-Based Topic Discussions:** Clean, focused text chat channels (e.g., `#pricing-strategy`, `#q3-roadmap`, `#hiring-plan`) where teams converse asynchronously.
* **Active AI Co-Pilot (`@TARS`):** Injects historical context, benchmarks competitor patterns, and synthesises meeting notes on command.
* **Live Room Audio Capture:** Transcribes in-person office brainstorms in real time, automatically isolating consensus points and open debates.
* **Optional Visual Canvas (React Flow):** The visual whiteboard canvas is **strictly optional and never imposed**. Users can toggle between pure document view, split view, or full interactive diagramming canvas on demand.

### 4.5 Workspace 5: Strategic Decision Registry
* **Structured Decision Ledger:** Logs company Architectural Decision Records (ADR) and Business Decision Records (BDR) with context, drivers, options considered, and chosen direction.
* **3-Tier Contradiction Sensitivity Slider:**
  * *Strict:* Flags minor premise or wording divergences.
  * *Balanced (Default):* Flags direct strategy, pricing, or commitment reversals.
  * *Relaxed:* Flags only explicit 180° contradictions.
* **Counterfactual "What-If" Simulation (`qwen3:8b`):** Allows founders to test speculative hypotheses (e.g., *"What happens if we delay Feature X by 60 days to close Client Y's enterprise customisation?"*) by cross-referencing cash burn, committed client deliverables, and engineering call graphs.
* **Stale Decision Cadence:** Configurable 30, 60, or 90-day automated review reminders to review aging assumptions.

### 4.6 Workspace 6: Tech & Architecture Workspace & MCP Server Bridge
* **Dedicated Engineering View:** Shields non-technical team members from code complexity while providing technical founders and developers with deep architectural visibility.
* **Deterministic Code Invariants:** Enforces foundational rules (e.g., *"No external API calls inside database transactions"*, *"Multi-tenant queries must include tenant_id"*) using sub-$50\text{ms}$ Tree-sitter AST queries.
* **Interactive Call Graphs:** Visualises cross-module dependency topologies using embedded Kùzu graph queries.
* **Plain-English PR Summaries:** Translates complex Git staged diffs into executive-level impact summaries for non-technical stakeholders.
* **Sovereign MCP Server & 1-Click Cursor Exporter:** Exposes company memory and AST verification directly to external developer IDEs via `apps/api/cortex/mcp_server.py`. Developers click one button in the Cockpit to download `.cursor/mcp.json`.

### 4.7 Central Feature: Unified Action Hub
* **Automated Task Extraction:** Gathers all commitments, deadlines, and action items extracted across meetings, client calls, and Think Tank chats into a single centralized view.
* **Full CRUD Backend:** Robust API endpoints (`POST`, `GET`, `PATCH`, `DELETE` at `/api/actions/`) managed by `apps/api/core/`.
* **Direct Source Linking:** Every action item features a 1-click link back to the exact timestamp in the call recording or the precise sentence in the decision document.
* **Frictionless Workflow:** Filterable by department and owner, featuring 1-click status toggles (`Open`, `In Progress`, `Done`) and 1-click clipboard export for daily standups.

---

## 5. Epistemological Health & Ambient Capture

### 5.1 Ambient Ingestion Architecture
To prevent the manual documentation graveyard, TARS captures institutional knowledge passively:
1. **The "TARS Drop Folder":** A local OS network share (`//tars.local/drop`). Dragging any PDF, contract, or recording into this folder automatically triggers a background file-watcher (`watchdog`), OCRs/transcribes it, and routes it to the relevant department.
2. **Mobile Voice Memo PWA (`/memo`):** A lightweight mobile shortcut where founders tap one button to record a 2-minute post-meeting audio note on their phone over local Wi-Fi.
3. **Universal Clipboard Shortcut:** Quick hotkey (`Ctrl+Shift+T`) to capture selected browser text or competitor specs into the TARS inbox.

### 5.2 Day 1 Cold Start: The 15-Minute "Genesis Interview"
For brand-new startups with zero existing documents:
* **Interactive Socratic Audio/Text Interview:** TARS conducts a 15-minute voice or text interview with the founders, probing the core customer thesis, market assumptions, and technical stack choices.
* **Live Knowledge Graph Blooming:** The right side of the screen visualises the company's initial knowledge graph blooming in real time as the founders speak.
* **Pre-Loaded Operational Flight-Plans:** Ships with battle-tested seed templates (YC-style investor updates, customer discovery scripts, engineering decision records).
* **Instant State of the Union:** Within 20 minutes of first launch, TARS generates the company's first cohesive executive briefing memo.

### 5.3 Graph Drift & Epistemological Pruning
To prevent obsolete policies from polluting RAG search:
* **Temporal Node Metadata:** All nodes contain `valid_from`, `valid_until`, and `lifecycle_status` (`ACTIVE`, `SUPERSEDED`, `DEPRECATED`, `EXPERIMENTAL`).
* **Explicit `[:SUPERSEDES]` Edges:** Logging a conflicting decision automatically attaches a `[:SUPERSEDES]` edge to the old decision.
* **Active-Only Default Retrieval:** Standard team searches only retrieve `ACTIVE` entities. Superseded documents are labeled with visual warning badges and excluded from operational prompts.
* **Stale Knowledge Radar:** Monthly local sweep identifying unreferenced assumptions older than 60 days for 1-click founder re-validation.

---

## 6. Customization, Privacy, Host Controls & Security Boundaries

### 6.1 Flexible Internal Privacy
* **Open Alignment by Default:** Documents, transcripts, and decisions are open company-wide to foster speed and cross-functional alignment.
* **1-Click Executive Clearance:** Founders can toggle any sensitive item (cap table, payroll, investor term sheets, acquisition talks) to `Founders/Executive Only`.
* **Zero-Leak Filtering:** Executive-flagged files are mathematically excluded from search indexes and LLM prompt contexts for non-executive sessions.

### 6.2 Complete Customization Suite
* **Industry Taxonomy Templates:** 1-click configuration for B2B SaaS, D2C / E-commerce, DeepTech / HardTech, and Agency / Services.
* **Dynamic Department Builder:** Add, merge, or rename operational units (e.g. "Customer Success", "Compliance") via the GUI.
* **Company Vocabulary & Acronym Dictionary:** Define internal product codenames, client shorthand, and acronyms to eliminate AI misunderstandings.
* **Role-Based Tone Switcher:**
  * *Devil's Advocate:* Challenges assumptions and stresses business models during pitch prep.
  * *Socratic Guide:* Patient, pedagogical explanations for onboarding.
  * *Concise Executive:* Bullet-pointed, high-density briefings for rapid search.
* **Outbound Webhooks (Air-Gap Compliant):** 100% air-gapped by default (PDF/Markdown exports). Optional outbound Slack, Discord, or SMTP webhooks with **mandatory human-in-the-loop confirmation**.
* **Host Resource Governor:** GUI sliders on the host machine to cap RAM and VRAM allocation.

### 6.3 4-Layer Host Security & Sandboxing Architecture
1. **OS Job Object Quota Enforcement (Windows/POSIX):** All child processes spawned by TARS are governed by OS Job Objects capping RAM to $512\text{ MB}$ and wall-clock execution to $15.0\text{s}$.
2. **Environment Allowlisting (`SAFE_ENV_ALLOWLIST`):** Sub-processes never inherit host parent environment variables or API keys.
3. **Line-Buffered Stdio Pipes:** `PYTHONUNBUFFERED=1` and `sys.stdout.reconfigure(line_buffering=True)` prevent protocol deadlocks between Cursor IDE and the FastAPI gateway.
4. **Indirect Prompt Injection Framing:** All ingested untrusted document and audio text is isolated within `<untrusted_external_data>` XML delimiters with explicit prompt invariants.

---

## 7. ASYNC'26 Track 1 Hackathon Alignment & Live Demo Strategy

### 7.1 Track 1 Evaluation Criteria Mapping

| ASYNC'26 Evaluation Criterion | Weight | How TARS Dominates the Track |
| :--- | :--- | :--- |
| **Sovereign Execution & Privacy** | 25% | 100% on-premise execution; zero cloud GPU bills; zero data egress; runs in complete Airplane Mode ($E_{\text{net}} = 0.00\text{ KB}$). |
| **Multi-Layer System Reasoning** | 25% | Combines dense vector search, Kùzu graph Cypher traversals, Tree-sitter AST syntax parsing, and Compound SLM reasoning (`qwen3:8b` + `qwen3:1.7b`). |
| **Product Completeness & UX** | 20% | Broad Full-Stack MVP featuring a polished React 19 GUI, 6 cohesive workspaces, Action Hub, and 1-Click Cursor configuration exporter. |
| **Real-World Startup Impact** | 15% | Directly solves tribal knowledge decay, bus factor risks, customer promise leakage, and onboarding friction. |
| **Live Demo Wow Factor** | 15% | "The Boardroom War Room" simulation proves capabilities physically impossible on cloud SaaS. |

### 7.2 The 3-Minute Live Hackathon Demo: "The Boardroom War Room"
1. **0:00 – 0:45 (The Air-Gap Proof):** Disconnect laptop Wi-Fi on stage. Drop in an unredacted financial runway spreadsheet (`demo_runway_q4.xlsx`) and an enterprise client call transcript (`acme_nda_call_sample.vtt`).
2. **0:45 – 1:30 (Voice-to-Spec Ingestion):** `qwen3:1.7b` parses the recording in $<600\text{ms}$ at $120+\text{ t/s}$ and extracts: *"Client requires on-prem deployment and custom SAML SSO by May 1st or they cancel the \$80,000 contract."*
3. **1:30 – 2:15 (The Multi-Layer Simulation):** Founder prompts in the Think Tank: *"Simulate impact: If we assign two engineers to custom SAML SSO, how does it affect our core product launch date and runway survival?"* `qwen3:8b` cross-references payroll burn, client commitments, and codebase call graphs to display an exact financial and delivery forecast.
4. **2:15 – 2:45 (Deterministic Contradiction Alert):** TARS sounds a proactive alert: *"Warning: This contradicts Decision #14 logged 10 days ago: 'Zero enterprise customisations before Q4'."*
5. **2:45 – 3:00 (Cursor IDE MCP Live Invariant Check):** Switch to Cursor IDE. Developer attempts to commit code violating `INV-017` (external HTTP call inside database transaction). Cursor queries TARS via MCP and displays: *"Commit rejected by TARS Sovereign Cortex: Transaction wrapping detected. Recommendation: Refactor to Outbox Pattern."*

---

## 8. Delivery Milestones (Broad Full-Stack MVP)

* **Phase 1 (Pre-Build Days 1–2): Core Engine & Local Cloud Foundation**
  * FastAPI gateway, SQLite WAL schema, Kùzu graph initialization, and Compound SLM dual-model serving (`qwen3:8b` + `qwen3:1.7b`).
  * Lean QoS Concurrency Engine (`asyncio.PriorityQueue`, Faster-Whisper CPU Semaphore, dynamic load-shedding).
* **Phase 2 (Pre-Build Days 3–4): Workspaces 1–3 & Ingestion Pipelines**
  * Modern React 19 GUI shell with responsive navigation and session cookie role switcher.
  * Universal Knowledge Base (Markitdown Office ingestion + hybrid search).
  * Client Call Studio (`faster-whisper` CPU integration + `qwen3:1.7b` voice-to-spec extractor).
  * Fast Onboarding Hub (flight-plan checklist + Socratic chat).
* **Phase 3 (Hackathon Sprint Hours 1–16): Workspaces 4–6, Action Hub & MCP Bridge**
  * Collaborative Think Tank (multi-channel chat + optional React Flow canvas).
  * Strategic Decision Registry (contradiction sensitivity slider + what-if simulation).
  * Tech & Architecture Workspace (Tree-sitter AST parser + Kùzu call-graph viewer).
  * Unified Action Hub (full CRUD task checklist with direct audio/decision linking).
  * Sovereign MCP Server (`apps/api/cortex/mcp_server.py`) with 1-Click Cursor configuration exporter.
* **Phase 4 (Hackathon Sprint Hours 17–24): Customization, Polish & Stage Demo Rehearsal**
  * Customization Suite (glossary, tone switcher, industry templates, host resource sliders).
  * Ambient Drop Folder watcher and mobile `/memo` PWA endpoint.
  * 3-minute "Boardroom War Room" live demo dry run under Airplane Mode with pre-flight script (`demo_preflight.sh`).
