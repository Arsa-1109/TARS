# TARS — SYSTEM DESIGN DOCUMENT FOR FRONTEND IMPLEMENTATION

**Version:** 5.0
**Status:** Consolidated frontend-aware system design
**Audience:** Frontend engineer and AI coding agent

This document intentionally distinguishes confirmed source requirements from implementation assumptions. Do not turn an implementation assumption into a backend contract without checking the actual repository/API.

---

# 1. System overview

TARS is a sovereign second brain for early-stage startups.

The system captures organisational exhaust, converts it into structured knowledge, persists durable memory, reasons across that state locally and turns conclusions into actions.

Core conceptual flow:

```text
DATA
  ↓
KNOWLEDGE
  ↓
MEMORY
  ↓
REASONING
  ↓
ACTION
```

The frontend is the human interaction layer over that system.

---

# 1.1 Frontend design boundary

The frontend is intentionally platform-familiar rather than futuristic. Its job is to make complex local intelligence legible, not to dramatise it. The design language is defined in `TARS_FRONTEND_DESIGN_SYSTEM.md`; interaction mechanics are defined in the pattern catalog and implementation reference.

The browser adapts one semantic product across three presentation classes:

- desktop/wide laptop: full navigation, split panes and contextual drawers;
- compact laptop/tablet: compressed navigation, selective columns and disclosure;
- mobile: single-column task flow, persistent bottom navigation and sheets.

# 2. Frontend responsibility

The frontend owns:

- navigation;
- presentation;
- local UI state;
- form state;
- disclosure/selection state;
- optimistic presentation only where safe and explicitly supported;
- accessibility;
- responsive composition;
- provenance navigation;
- action initiation.

The frontend does not own:

- semantic search computation;
- graph reasoning;
- AST parsing;
- architectural invariant evaluation;
- transcription;
- LLM reasoning;
- simulation mathematics;
- authority/clearance truth;
- persistent source-of-truth data.

---

# 3. Product workspaces

## Knowledge
Retrieve and understand company knowledge with provenance.

## Calls
Transcribe calls and extract summaries, pain points, requests and commitments.

## Onboarding
Deliver role-aware learning and a Socratic mentor experience.

## Think Tank
Support topic discussions, shared notes and optional relationship visualisation.

## Decisions
Maintain durable decisions, contradiction awareness and what-if simulation.

## Architecture
Visualise code topology, expose invariants and show evidence/ADR context.

## Action Hub
Global task surface spanning calls, decisions and discussions.

---

# 4. Runtime topology

Intended local topology:

```text
Browser clients
      │
      │ local network / local host
      ▼
FastAPI gateway
      │
      ├── retrieval / metadata
      ├── graph engine
      ├── ingestion/audio
      ├── invariant engine
      ├── simulation
      └── local model reasoning
```

The browser must not directly access the local model, graph database or filesystem unless the repository explicitly requires it.

---

# 5. Frontend data flow

Generic request:

```text
User action
   ↓
React event
   ↓
service/client method
   ↓
FastAPI endpoint
   ↓
backend engine(s)
   ↓
structured response
   ↓
state update
   ↓
UI + provenance + action affordances
```

Never bypass the service layer by scattering raw `fetch` calls throughout page components.

---

# 6. Mock/live architecture

The frontend should use a single API abstraction:

```text
UI
 ↓
TarsApi interface
 ├── MockTarsApi
 └── LiveTarsApi
```

The UI must not know which implementation is active.

A development switch such as `VITE_USE_MOCK=true` may select mock data, consistent with the sprint plan.

Mock fixtures should match the frozen Pydantic contracts exactly.

Do not let mock-only fields become implicit production API requirements.

---

# 7. Confirmed contract structures

The project sprint plan defines these shared Pydantic DTOs.

## SearchRequest

```python
query: str
department: Optional[str] = "ALL"
clearance: str = "ALL_TEAM"
```

## SearchCitation

```python
doc_id: str
doc_title: str
page_number: int
snippet: str
```

## SearchResponse

```python
query: str
answer: str
citations: List[SearchCitation]
latency_ms: float
```

## VoiceToSpecResponse

```python
call_id: str
client_name: str
sentiment: str
summary: str
pain_points: List[str]
feature_requests: List[str]
commitments: List[str]
audio_duration_seconds: float
```

## DecisionItem

```python
id: str
title: str
category: str
context: str
chosen_option: str
timestamp: int
clearance: str = "ALL_TEAM"
```

## ContradictionCheckResponse

```python
has_conflict: bool
severity: str
conflicting_decision_id: Optional[str] = None
explanation: Optional[str] = None
```

## SimulationRequest

```python
proposal: str
delay_days: int
reallocated_devs: int
```

## SimulationResponse

```python
runway_impact_months: float
delivery_delay_weeks: float
affected_client_promises: List[str]
affected_code_modules: List[str]
executive_synthesis: str
```

## InvariantCheckResult

```python
is_breached: bool
rule_id: str
rule_name: str
violating_file: str
line_number: int
rationale: str
adr_ref: str
suggested_refactor: str
```

## ActionItemDTO

```python
id: str
description: str
owner: str
deadline: Optional[int] = None
status: str = "OPEN"
source_type: str
source_id: str
source_offset: str
```

The frontend must not change these shapes for convenience.

---

# 8. Backend/frontend route boundary

The sprint plan specifies separate route modules for the core, cortex and ingestion subsystems, but does not fully freeze the final HTTP endpoint names in the supplied documents.

Therefore:

- use the actual repository/OpenAPI route surface when available;
- do not invent endpoint paths solely from component names;
- centralise endpoint mapping in `services/api.ts` or equivalent;
- keep DTO transformation in the service layer.

---

# 9. Knowledge flow

```text
Document
 ↓
ingestion
 ↓
metadata + content + embeddings
 ↓
retrieval
 ↓
answer
 ↓
exact citation
```

The frontend should treat citations as first-class navigation objects.

---

# 10. Call flow

```text
Audio
 ↓
Whisper
 ↓
Transcript
 ↓
Voice-to-Spec extraction
 ↓
summary / pain points / features / commitments
 ↓
Action Hub
```

A commitment must not silently become a task. The user should have an explicit promotion action unless the actual backend contract says otherwise.

---

# 11. Decision flow

```text
Decision entry
 ↓
stored decision
 ↓
future statement/proposal
 ↓
contradiction check
 ↓
conflict presentation
 ↓
user review
```

The frontend should make the relationship between current and conflicting decisions obvious.

---

# 12. Simulation flow

```text
proposal + delay + developer allocation
                 ↓
           backend simulation
                 ↓
 structured impacts + synthesis
                 ↓
             result UI
```

Do not make the browser infer runway, schedule or dependency impacts.

---

# 13. Architecture flow

```text
repository diff
 ↓
Tree-sitter
 ↓
Kùzu graph / invariant evaluation
 ↓
InvariantCheckResult
 ↓
frontend finding view
 ↓
local model explanation / ADR
```

The frontend should distinguish:

```text
STRUCTURAL FACT
from
GENERATIVE EXPLANATION
```

but without branding the latter as magical “AI output”.

---

# 14. 4 killer invariants

The current sprint plan targets four rules:

- `INV-017` — external HTTP calls inside database transactions;
- `INV-021` — parameter count mismatch between schema and dispatcher;
- `INV-014` — dead code / dormant flag reuse;
- `INV-008` — plaintext password/token logging.

The frontend should display these rule IDs, names, evidence and suggested action when the backend supplies them.

The frontend should not claim that the entire 100-problem catalogue has been implemented.

---

# 15. 100-problem taxonomy relationship

The 100-problem document is the broader long-term capability catalogue.

It spans:

1. architectural drift;
2. database/ORM;
3. security/secrets;
4. concurrency/async;
5. API/schema drift;
6. monorepo/dependencies;
7. startup knowledge/silos;
8. DevOps/CI;
9. governance/compliance;
10. cost/reliability.

Workspace 6 should be able to represent the broader concept, but the MVP UI should focus on the currently implemented rules and their evidence.

---

# 16. Graph model

The sprint plan defines core Kùzu nodes:

```text
Document
Decision
ActionItem
Invariant
CodeEntity
```

and relationships including:

```text
SUPERSEDES
RELATES_TO
ENFORCES
```

The UI may visualise these and other backend-provided relationships.

Do not create fake relationships solely to make the graph look connected.

---

# 17. Lifecycle model

Knowledge nodes can be:

```text
ACTIVE
SUPERSEDED
DEPRECATED
EXPERIMENTAL
```

Default operational views should favour ACTIVE state.

SUPERSEDED nodes remain accessible when the user intentionally examines history.

---

# 18. Access/clearance

The system uses a default open-team model with executive-only clearance for sensitive material.

Frontend implication:

```text
allowed → render content
restricted → render neutral restricted state
```

Never render restricted source snippets and then hide them with CSS.

---

# 19. Global action model

Any action item should remain traceable to its source.

```text
ActionItem
 ├── source_type
 ├── source_id
 └── source_offset
```

This enables:

```text
Action → call timestamp
Action → decision location
Action → conversation source
```

The UI should expose those relationships directly.

---

# 20. Error/processing model

For any request:

```text
idle
 ↓
loading / processing
 ↓
ready
```

Alternative branches:

```text
empty
restricted
error
```

A stale response should not overwrite a newer request result.

Prefer request IDs/abort controllers in rapidly changing search/filter operations.

---

# 21. Concurrency and live updates

The backend may perform background transcription, ingestion, indexing and model work.

The frontend must therefore support:

- pending processing states;
- asynchronous result appearance;
- polling or server push only if the actual backend supports it;
- stable list ordering;
- preservation of reading position.

Do not introduce fake “real-time” updates.

---

# 22. File ingestion UI

Supported document/audio inputs are defined by the product requirements.

Use:

```text
picker
optional drag/drop desktop
selected file summary
processing state
result state
```

Keep original filename and relevant source metadata visible.

Do not expose filesystem paths unnecessarily.

---

# 23. Session and preferences

The application may persist lightweight UI state such as:

- theme;
- current workspace;
- selected record;
- onboarding completion.

Avoid storing raw company documents, transcripts, financial details or LLM context in browser storage unless the backend/product explicitly requires it.

---

# 24. Local-first proof

The UI can expose a local-only status area, but the source material is inconsistent about exact network wording (`air-gapped`, `local Wi-Fi`, `pre-commit` vs `pre-push`).

Therefore the frontend should use a factually safe local wording such as:

```text
Local
Local host
Internet access disabled
```

when the runtime actually provides that fact.

Do not claim `0.00 KB egress` from the browser alone unless the application/runtime exposes a measured value.

---

# 25. Performance claims

The source material includes multiple latency figures with different scopes.

Do not hard-code those figures into permanent UI copy.

When a runtime metric is supplied by the backend, display it with:

- label;
- numeric value;
- unit;
- scope.

Example:

```text
AST check
38 ms
local hook execution
```

Never display a bare “<50 ms” badge without knowing exactly what was measured.

---

# 26. Design/system boundaries

The design system intentionally improves the earlier reference implementation in several ways:

- removes dominant glass from ordinary content;
- removes oversized capsule navigation;
- removes generic status dots;
- makes Apple principles behavioural rather than ornamental;
- uses a neutral steel accent instead of AI-gradient colours;
- favours sheets/drawers and strong hierarchy over card accumulation;
- treats mobile as a composed layout rather than a scaled desktop.

These are frontend presentation changes. They do not alter TARS product functionality.

---

# 27. Recommended frontend code organisation

```text
apps/web/
  src/
    components/
      layout/
      navigation/
      primitives/
      data-display/
      provenance/
      overlays/
      actions/
      audio/
      graph/
      code/
      workspaces/
    mocks/
    services/
      api.ts
    state/
    styles/
    App.tsx
    main.tsx
```

Use the repository's current structure if it differs but remains coherent.

---

# 28. Testing responsibilities

Frontend checks should cover:

### Layout

- 320px mobile;
- 390px mobile;
- 768px tablet;
- 1024px laptop;
- 1280px desktop;
- 1440px wide desktop.

### State

- loading;
- processing;
- success;
- empty;
- restricted;
- error;
- long text;
- missing optional fields;
- slow backend.

### Interaction

- keyboard navigation;
- focus restoration;
- Escape close;
- mobile sheet behaviour;
- safe-area spacing;
- no horizontal overflow.

### Visual

- no prohibited palettes/effects;
- token usage;
- consistent spacing;
- consistent typography;
- consistent status semantics.

---

# 29. Known source inconsistencies

The supplied project documents are not perfectly aligned on several implementation facts.

### Model name

Some materials use Qwen 2.5 8B; the engineering taxonomy and deck use Qwen3 8B.

### Hook timing

Some materials describe pre-commit; others describe pre-push.

### Air-gap terminology

The architecture also describes local Wi-Fi browser access, so the frontend should not casually equate “local” with strict physical air-gap unless the runtime proves it.

### Performance scope

Several latency figures exist with different scopes.

These are intentionally not silently resolved in this document.

The frontend should render the current backend truth.

---

# 30. Final system rule

The frontend should make TARS's intelligence visible through **relationships, evidence, context and action**, not through visual effects.

The design system is successful when a user can understand:

```text
what is happening
why it matters
where it came from
what changed
what they can do next
```

without needing the interface to tell them that it is “AI”.
