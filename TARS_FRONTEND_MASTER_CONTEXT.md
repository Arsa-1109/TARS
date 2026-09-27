# TARS — FRONTEND MASTER CONTEXT

**Version:** 5.0
**Status:** Primary frontend/product context for an AI coding agent
**Scope:** `apps/web/`

---

# 1. Agent contract

You are implementing the TARS frontend, not redefining TARS.

## 1.1 Non-negotiable rules

1. The actual repository is the source of truth for code already implemented.
2. The frozen API contracts are the integration boundary once present in the repository.
3. `PRD.md` defines product behaviour.
4. `TARS_FRONTEND_DESIGN_SYSTEM.md` defines visual language and overrides aesthetic guesses.
5. `TARS_FRONTEND_IMPLEMENTATION_REFERENCE.md` defines reusable interaction patterns.
6. Do not invent product capabilities because a modern dashboard would normally have them.
7. Do not invent backend data. Empty, unavailable or pending data must be represented honestly.
8. Do not alter backend contracts from the frontend.
9. Do not move reasoning logic into React.
10. Do not treat mock fixtures as production data.
11. Preserve provenance everywhere it exists.
12. Preserve access/clearance restrictions everywhere they affect content.
13. Never hide important state changes inside animation alone.
14. Every async operation must have an explicit user-readable state.
15. Do not use absolute performance claims unless supplied by a real runtime measurement.
16. Do not visually imply internet connectivity when the product is local-first.
17. Do not use green as a generic connectivity/online indicator.
18. Do not build a “spacecraft AI dashboard”.
19. Do not make all six workspaces visually identical.
20. Do not make any workspace look like a collection of decorative cards.
21. Prefer one strong composition over many small widgets.
22. Build all reusable visuals from semantic tokens.
23. Keep interactive areas at touch-friendly sizes on mobile without making controls visually bulky.
24. Respect reduced motion and keyboard navigation.

---

# 2. Product definition

TARS is an autonomous sovereign second brain for early-stage startups. The system captures company exhaust, transforms it into knowledge, stores durable memory, reasons over the combined state and turns results into action.

The system spans:

- company documents;
- customer/client audio;
- discussions;
- decisions;
- actions;
- source-code structure;
- architectural invariants;
- living ADRs;
- provenance and lifecycle state.

The five-part conceptual pipeline is:

```text
DATA → KNOWLEDGE → MEMORY → REASONING → ACTION
```

The frontend should make that pipeline legible without turning it into a decorative “AI pipeline” graphic.

---

# 3. What makes TARS different

TARS is not just a chatbot or generic RAG interface.

The defining relationship is:

```text
Organisational memory
        ↓
Decision / commitment / invariant
        ↓
New work
        ↓
Evidence
        ↓
Reasoning
        ↓
Action
        ↓
New durable memory
```

The frontend must expose relationships, not just isolated records.

Examples:

- a call commitment can become an Action Hub task;
- a decision can be linked to a contradiction;
- an invariant violation can link to a file and line;
- a generated ADR can link back to its evidence;
- superseded memory must visibly remain historical rather than silently being treated as current.

---

# 4. Visual identity

TARS is:

**quiet, precise, editorial, premium, calm, mature, trustworthy, information-dense but never cramped.**

TARS is not:

**neon, cyberpunk, futuristic, holographic, glossy, gamified, noisy, bubbly, or “AI themed”.**

The product should still look intentional when every shadow, blur and animation is removed.

---

# 5. Apple-aligned product philosophy

Use Apple's current design philosophy as a discipline rather than as a visual imitation.

### Purpose
Every element needs a job.

### Agency
The user controls exploration, progression, destructive actions and when details are revealed.

### Responsibility
Sensitive data must be handled calmly and clearly. Do not make privacy theatre out of security indicators.

### Familiarity
Prefer patterns people already understand: toolbar, segmented control, tabs, list rows, sheets, drawers, standard forms, progressive disclosure.

### Flexibility
The same information should re-compose gracefully across desktop, laptop, tablet and mobile.

### Simplicity
Simple means frictionless, not featureless. Use disclosure instead of deleting useful detail.

### Craft
Alignment, spacing, motion, loading, focus, touch targets and content transitions are part of the product quality.

### Delight
Delight comes from the interface behaving exceptionally well, not from confetti or visual effects.

---

# 6. Global application shell

## 6.1 Desktop shell

Use a compact top toolbar.

Structure:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ TARS     Workspace navigation                         Action Hub  Profile  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           Current workspace                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

The toolbar should contain:

- application identity at leading edge;
- primary workspace navigation in the central region on wide screens;
- global Action Hub access;
- profile / role context;
- optional theme or preference control only where useful.

The application name is brand identity, not the page title.

## 6.2 Wide desktop workspace navigation

The six workspaces can appear as a compact segmented navigation because six is the practical upper limit for this particular fixed workspace set.

Labels should be short:

- Knowledge
- Calls
- Onboarding
- Think Tank
- Decisions
- Architecture

Action Hub is not included in that six-item workspace group. It is a cross-context utility.

## 6.3 Laptop navigation

At narrower widths, do not force six long labels into a cramped row.

Use one of these layouts according to available width:

1. horizontally scrollable segmented workspace navigation;
2. compact icon + short label navigation;
3. `Workspaces` menu with current workspace title;
4. priority navigation with the rest inside an overflow menu.

Choose based on measured available width, not a hard-coded visual guess.

## 6.4 Mobile navigation

Use a native-feeling bottom tab/navigation bar rather than a floating capsule.

Recommended visible items:

```text
Knowledge   Calls   Think Tank   Decisions   More
```

`More` opens a sheet containing:

- Onboarding;
- Architecture;
- account/context controls that are genuinely needed;
- less frequent workspace actions.

The bar should respect:

```css
padding-bottom: env(safe-area-inset-bottom, 0px);
```

Do not create an oversized floating “glass pill”.

The mobile bar should feel like application chrome, not a visual gadget.

---

# 7. Page composition

Every operational page should have a consistent high-level structure:

```text
Page Header
  title
  concise purpose
  optional primary action

Context / filters / local controls

Primary work surface

Secondary details / history / provenance
```

Use a maximum content width appropriate to the page, generally 1120–1360px for analytical workspaces and narrower reading widths for documents, explanations and onboarding.

Avoid centring every screen inside a small 700–800px column when the content genuinely benefits from width.

Avoid full-bleed dashboards with no reading boundary.

---

# 8. Information hierarchy

Use four layers:

1. **Primary** — what the user needs to decide or do now.
2. **Secondary** — the context that explains the primary item.
3. **Supporting** — details that are useful when needed.
4. **Metadata** — IDs, timestamps, provenance, system facts.

Typography and spacing establish hierarchy first. Colour is secondary.

Do not use a darker colour merely because something is “important” if a stronger typographic scale would be clearer.

---

# 9. Core frontend primitives

Build these before duplicating page-specific UI:

### `AppShell`
Application chrome and responsive viewport management.

### `TopBar`
Identity, page context and global actions.

### `WorkspaceNav`
Desktop/laptop workspace switching.

### `MobileTabBar`
Mobile primary navigation + safe-area support.

### `PageHeader`
Title, description, primary action and secondary controls.

### `Surface`
Neutral bordered surface for grouping related content.

### `Section`
Whitespace-based content grouping that can exist without a card.

### `ListRow`
Primary reusable row for records, decisions, actions and search results.

### `StatusLabel`
Semantic state label that never relies on colour alone.

### `ProvenanceLink`
Small source relationship affordance: document, page, line, commit, timestamp, decision or ADR.

### `DetailDrawer`
Desktop contextual detail surface.

### `Sheet`
Mobile contextual detail surface.

### `Dialog`
Confirmations and focused tasks only.

### `Skeleton`
Shape-preserving loading placeholder.

### `EmptyState`
Reason + next useful action.

### `InlineNotice`
Non-blocking information/warning/error messaging.

### `Timeline`
Historical sequence and event state.

### `Disclosure`
Progressive reveal of secondary/technical detail.

### `SourceCitation`
Citation row/drawer for exact source references.

### `ActionItem`
Cross-workspace task representation.

### `DecisionRow`
Decision ledger representation.

### `InvariantFinding`
Architecture rule finding representation.

### `GraphViewport`
Architecture topology canvas with non-decorative nodes and edges.

---

# 10. State architecture

Every significant data-driven feature should explicitly model:

```text
idle
loading
processing
ready
empty
restricted
error
stale
completed
```

For decisions and actions, use domain-specific states in addition to those generic request states.

A state should change the following only as much as needed:

- label;
- icon;
- supporting copy;
- interaction availability;
- progress;
- semantic colour if necessary.

Do not reorder the entire page because one backend value changes.

---

# 11. Provenance model

TARS depends heavily on traceability.

Whenever backend data contains provenance, the frontend must preserve it.

A provenance affordance should make the following easy to understand:

```text
WHAT        the statement/result is
SOURCE      where it came from
LOCATION    page / line / timestamp / commit
STATE       active / superseded / deprecated
```

Recommended interaction:

```text
Answer / finding
      │
      └── Source · document/page/line
                ↓ tap/click
             Detail drawer
                ↓
        original context/snippet
```

Do not make citations look like generic “AI source chips”. They are evidence navigation.

---

# 12. Access and clearance

The system can mark sensitive records as restricted.

The frontend must:

- hide content the session is not allowed to see;
- avoid showing restricted snippets in search results;
- avoid exposing restricted titles if the backend does not permit them;
- show a neutral restricted state when appropriate;
- never imply the user can bypass clearance.

A restricted state should feel like a normal permissions boundary, not a dramatic security alert.

---

# 13. Lifecycle state

TARS knowledge can have lifecycle state:

```text
ACTIVE
SUPERSEDED
DEPRECATED
EXPERIMENTAL
```

Default operational views should emphasise `ACTIVE` information.

Historical/superseded content should remain discoverable through deliberate exploration but should be visually quieter.

Never use bright colour merely to indicate that something is active.

A superseded label can be neutral gray with a clear word label.

---

# 14. Workspace 1 — Knowledge

## Goal
Answer company questions with provenance.

## Desktop composition

```text
┌───────────────┬─────────────────────────────────────────────┐
│ Sources       │ Search                                       │
│ filters       │ Query                                         │
│ departments   │                                               │
│ collections   │ Answer                                        │
│               │                                               │
│               │ Citations / evidence                          │
└───────────────┴─────────────────────────────────────────────┘
```

Use a source/filter column only when it materially helps. Do not force a sidebar if the search result is the main task.

## Interaction

- Search is the dominant control.
- Enter submits.
- Results retain the query context.
- Citations are inspectable without leaving the result.
- Department filters are subtle controls, not large coloured cards.
- Empty search results explain whether nothing matched or access restricted the result.
- Loading preserves the final answer geometry.

## Mobile

Stack:

```text
Header
Search
Filter button
Results
Citation sheet
```

Filters open as a sheet.

---

# 15. Workspace 2 — Calls

## Goal
Turn audio into structured company knowledge and executable commitments.

## Desktop composition

```text
┌──────────────────────────────────────────────────────────────┐
│ Call header / status / source                                │
├──────────────────────────────┬───────────────────────────────┤
│ Audio + transcript            │ Structured extraction         │
│                              │ Summary                       │
│ Transcript                   │ Pain points                   │
│ timestamped                  │ Feature requests              │
│                              │ Commitments                   │
└──────────────────────────────┴───────────────────────────────┘
```

Keep the transcript readable. The right column is structured interpretation, not another chat feed.

## Audio player

The player should be a calm utility control:

- play/pause;
- elapsed time;
- duration;
- scrubber;
- current timestamp.

Do not create a glowing “AI waveform”. A simple waveform or timeline is sufficient.

## Extraction cards

Use grouped sections, not four oversized cards.

Each extracted item should support:

- source timestamp;
- text;
- confidence only when supplied;
- action affordance.

A commitment can be promoted to the Action Hub with clear ownership and deadline controls.

## Mobile

Use a local segmented control for:

```text
Transcript | Summary | Commitments
```

The audio player stays near the top.

Extraction detail opens as a sheet when needed.

---

# 16. Workspace 3 — Onboarding

## Goal
Provide role-aware, patient access to company knowledge.

Use a guided workflow composition similar to a high-quality setup flow:

```text
Progress
Current step
Explanation
Relevant context
Next / Back
```

The progress indicator is structural, not decorative.

Completed steps become visually quieter.

Current step receives strongest emphasis.

Future steps are clearly visible but subdued.

The mentor panel is secondary to the learning task and should not make onboarding look like a chat product.

---

# 17. Workspace 4 — Think Tank

## Goal
Support focused team discussion with historical context.

Desktop:

```text
Channels | Topic/thread | Context/provenance
```

The optional canvas must remain optional.

When the canvas is open, it should support actual relationships between concepts/decisions/actions rather than acting as decorative infinite whiteboard space.

Mobile:

- channel selector becomes a sheet;
- topic is primary;
- context drawer becomes a sheet;
- composer remains reachable without covering the thread.

Do not make this look like a social network.

---

# 18. Workspace 5 — Decisions

## Goal
Maintain durable strategic decisions and reveal meaningful contradictions or scenario impacts.

Desktop composition:

```text
Decision ledger
      │
      ├── selected decision detail
      │
      └── What-if / contradiction context drawer
```

The sensitivity selector should use a quiet segmented control:

```text
Strict | Balanced | Relaxed
```

Do not build the selector as an oversized liquid-glass or futuristic slider.

Contradiction treatment:

- clear title;
- neutral/amber semantic emphasis only where necessary;
- explanation;
- link to conflicting decision;
- explicit indication of whether the old decision is superseded.

What-if simulation:

- input proposal;
- delay days;
- reallocated developers;
- results grouped as runway impact, delivery delay, affected client promises and affected code modules;
- executive synthesis after the structured results.

The frontend must render supplied simulation values. It must not calculate business outcomes by guessing.

---

# 19. Workspace 6 — Architecture

## Goal
Make architectural structure visible and let invariant findings be understood and acted upon.

Desktop composition:

```text
┌───────────────────────────┬────────────────────────────────┐
│ Invariants / findings     │ Call graph / topology          │
│                           │                                │
│ severity + rule           │ nodes + relationships          │
│                           │                                │
├───────────────────────────┼────────────────────────────────┤
│ Selected finding detail / evidence / diff / ADR             │
└─────────────────────────────────────────────────────────────┘
```

The graph must be visually analytical, not futuristic.

### Graph visual language

- neutral background;
- restrained node surfaces;
- thin gray edges;
- steel accent for selected path;
- red only for an actual blocked/critical finding;
- no glowing node halos;
- no animated particle flows;
- no 3D perspective.

### Invariant finding

A finding should present:

```text
Rule
Why it matters
File
Line
Observed evidence
Suggested refactor
ADR reference
```

The deterministic nature of the finding should be visually distinguishable from the generative explanation without using “AI” branding.

### Diff presentation

Use a quiet code/diff view:

- file path;
- line numbers;
- changed region;
- finding highlight;
- explanation panel.

Do not restyle the entire app as a terminal.

---

# 20. Unified Action Hub

The Action Hub is globally reachable.

Desktop: right-side drawer.

Mobile: near-full-height sheet / bottom sheet depending on content length.

Actions have:

- description;
- owner;
- optional deadline;
- status;
- source type;
- source ID;
- exact source offset.

Primary interaction is status progression:

```text
OPEN → IN PROGRESS → DONE
```

No gamification.

The source link is more important than decorative priority colours.

---

# 21. Search, filters and segmented controls

## Search fields

Use a full-height, highly legible field.

Structure:

```text
icon  input text                                  shortcut/action
```

Do not put five badges inside the search field.

## Filters

Use compact segmented controls or a filter button that opens a sheet/popover.

Default filters should be visible only when they materially affect the current task.

## Segmented control

Use sentence-case labels.

Active segment is high-contrast neutral.

Inactive segments remain readable but subdued.

---

# 22. Buttons

Priority hierarchy:

1. Primary filled neutral.
2. Secondary bordered neutral.
3. Borderless/ghost for low-emphasis actions.
4. Destructive text or restrained outline.

Only one primary action should dominate a local region.

Avoid using status colours for primary buttons.

---

# 23. Status communication

The product does not need generic “online/offline/live” dots.

Use meaning-specific text:

```text
Local
Processing
Waiting for transcription
Restricted
Superseded
Blocked
Completed
```

Use an icon + text where useful.

Green is reserved for genuinely positive/completed semantic states, never for ambient connectivity.

---

# 24. Loading and processing

Use skeletons when final content shape is known.

Use an inline spinner when the operation is small and indeterminate.

Use a progress bar when progress is measurable.

Use copy such as:

- `Transcribing…`
- `Building index…`
- `Checking staged changes…`
- `Preparing citations…`

Do not use “AI is thinking…” as the default processing message.

---

# 25. Empty states

Good empty state:

```text
What is empty
Why
What to do next
```

Avoid giant illustrations.

Example:

```text
No decisions yet
Company decisions you record here will become part of the shared memory.
[Record a decision]
```

---

# 26. Errors

Error states must be actionable.

Prefer:

```text
Couldn’t load this workspace.
The local service did not return a response.
[Retry]
```

Avoid vague “Something went wrong”.

Never blame the user without evidence.

---

# 27. Drawers, sheets and dialogs

Use a drawer for contextual detail that should not destroy the underlying workspace.

Use a dialog for focused decisions or confirmations.

Use a mobile sheet when a desktop drawer would become cramped.

Every overlay needs:

- clear title;
- close action;
- focus management;
- Escape support on desktop;
- appropriate scroll containment;
- background inertness where appropriate;
- predictable return to the triggering control.

Do not stack three overlays.

---

# 28. Motion

Motion communicates:

- where something came from;
- what changed;
- what is selected;
- what completed;
- what opened.

Recommended:

- micro interaction: 120–160ms;
- small appearance: 160–200ms;
- content transition: 180–220ms;
- drawer/sheet: 220–280ms.

Use ease-out curves.

No elastic/bouncy “AI” animation.

No permanent pulsing.

Reduced motion must collapse animation to near-zero duration.

---

# 29. Mobile behaviour

### Touch targets

Keep the actual interactive target at least 44×44px for primary mobile actions, even if the visual glyph is smaller.

### Safe areas

Fixed bottom chrome must account for the device safe area.

### Forms

- labels above fields;
- no tiny inline labels only;
- full-width controls;
- avoid multi-column forms below tablet width;
- keep the primary button near the end of the visible flow.

### Navigation

Use bottom navigation for high-frequency areas and sheets for secondary areas.

### Tables

Do not force wide tables onto phones. Convert to stacked record rows or horizontally scroll only when column comparison is itself the task.

### Graphs

Provide a focused detail view rather than requiring users to inspect the entire graph on a 390px display.

---

# 30. Accessibility

Must support:

- keyboard navigation;
- visible focus;
- semantic buttons/links/inputs;
- labelled icon-only controls;
- status information not encoded only by colour;
- reduced motion;
- sufficient contrast;
- sensible heading hierarchy;
- screen-reader friendly expandable sections;
- no inaccessible pointer-only interactions.

The UI should remain understandable in grayscale.

---

# 31. Performance

Avoid:

- rendering thousands of graph nodes simultaneously if not required;
- large animated backgrounds;
- unnecessary layout effects on scroll;
- full-page spinners;
- repeated component remounting;
- expensive blur filters on large surfaces.

Stable geometry is more important than animation.

For live streams, preserve current scroll position unless the user is already at the end of the feed.

---

# 32. Repository structure

Expected frontend organisation:

```text
apps/web/
  src/
    components/
      layout/
      primitives/
      navigation/
      provenance/
      actions/
      workspaces/
    mocks/
    services/
    state/
    styles/
    App.tsx
    main.tsx
```

Do not force this exact structure if the existing repository already establishes a compatible structure; preserve established conventions first.

---

# 33. Mock/live boundary

Use a single service layer:

```ts
interface TarsApi {
  search(...): Promise<SearchResponse>;
  getCall(...): Promise<VoiceToSpecResponse>;
  getDecisions(...): Promise<DecisionItem[]>;
  checkContradiction(...): Promise<ContradictionCheckResponse>;
  simulate(...): Promise<SimulationResponse>;
  getInvariant(...): Promise<InvariantCheckResult>;
  getActions(...): Promise<ActionItemDTO[]>;
}
```

Method names are conceptual until the repository's actual API surface is confirmed.

The UI components should not know whether data is mocked or live.

---

# 34. Data ownership

Frontend owns:

- presentation state;
- selected record state;
- navigation state;
- local preference state;
- disclosure state;
- transient form state.

Backend owns:

- source-of-truth records;
- AI reasoning;
- graph relationships;
- invariant detection;
- simulation values;
- provenance records;
- access/clearance truth.

---

# 35. Cross-workspace continuity

A user should feel that each workspace is querying the same brain.

Examples:

Knowledge citation → opens source context.

Call commitment → opens Action Hub.

Action → opens originating call/decision.

Decision contradiction → opens the old decision.

Invariant finding → opens code evidence and ADR.

This continuity is more important than visual novelty.

---

# 36. Visual QA checklist

Before every screen is accepted:

- [ ] clear primary action;
- [ ] calm neutral foundation;
- [ ] no AI-slop palette;
- [ ] no unnecessary gradients;
- [ ] no glowing effects;
- [ ] no generic live/online green dot;
- [ ] no pill-shaped buttons;
- [ ] no redundant cards;
- [ ] consistent 1px borders;
- [ ] correct surface hierarchy;
- [ ] consistent type scale;
- [ ] metadata visually subordinate;
- [ ] loading state preserves layout;
- [ ] empty state explains next step;
- [ ] error state is actionable;
- [ ] restricted state is honest;
- [ ] citations are obvious and inspectable;
- [ ] current selection is clear without colour alone;
- [ ] mobile composition is intentional;
- [ ] touch targets are usable;
- [ ] focus state is visible;
- [ ] reduced motion respected;
- [ ] no unnecessary dependency added;
- [ ] no invented backend behaviour.

---

# 37. Quality bar

The frontend should look like the result of a mature product design team reviewing every interaction, not the result of an AI generating a dashboard template.

The correct question before adding anything is:

> Does this make the user's task clearer, faster, safer or more understandable?

If not, do not add it.


# 38. Non-negotiable final review before declaring a screen complete

Before considering a frontend screen complete, verify:

```text
Does the hierarchy read correctly without colour?
Does the primary task have one obvious focal point?
Are secondary actions quiet enough?
Are there any decorative cards that can be removed?
Are any pills, gradients, glows or green status dots present without a semantic need?
Does mobile feel re-composed rather than shrunk?
Do drawers become sheets where width requires it?
Are touch targets comfortable?
Can a keyboard user reach every important action?
Are loading, empty, unavailable, restricted, superseded and error states honest?
Is provenance visible when evidence exists?
Does the screen still feel premium after removing shadow, blur and animation?
```

If any answer is poor, iterate before adding another visual element.
