# TARS — FRONTEND SCREEN BLUEPRINTS

**Version:** 5.0
**Status:** Screen-composition authority
**Scope:** `apps/web/`

This document translates the TARS product requirements into concrete screen compositions. It is deliberately implementation-oriented: use it to decide what belongs on each screen, what should be visually prominent, what should collapse on smaller devices, and which interactions should become drawers or sheets.

The goal is not to make every screen look identical. The goal is to make every screen feel as though it belongs to the same calm, precise product.

---

# 1. Global shell blueprint

## Wide desktop / large laptop (≥1280px)

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ TARS     Knowledge Calls Onboarding Think Tank Decisions Architecture   Action Hub  … │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                        │
│  page header                                                                           │
│  title / short description                                      primary action          │
│                                                                                        │
│  ┌───────────────────────────────────────┐  ┌───────────────────────────────────────┐ │
│  │ primary work surface                  │  │ contextual secondary surface          │ │
│  │                                       │  │ optional                              │ │
│  └───────────────────────────────────────┘  └───────────────────────────────────────┘ │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

Rules:

- shell chrome is persistent, compact and quiet;
- workspace content owns almost all visual area;
- contextual panels appear only when they add information;
- global Action Hub is a utility, not a seventh navigation destination.

## Compact laptop / tablet (768–1279px)

```text
┌─────────────────────────────────────────────────────────────┐
│ TARS                 workspace selector             action │
├─────────────────────────────────────────────────────────────┤
│ title                                                     │
│ description                                               │
│                                                             │
│ primary surface                                            │
│                                                             │
│ contextual detail → disclosure / drawer                   │
└─────────────────────────────────────────────────────────────┘
```

Use one primary column. Secondary information should move into disclosure rather than forcing two cramped columns.

## Mobile (<768px)

```text
┌───────────────────────────────────────┐
│ page title                    action  │
│ short context                       │
├───────────────────────────────────────┤
│                                       │
│ primary task surface                 │
│                                       │
│ secondary information                 │
│ becomes inline disclosure or sheet   │
│                                       │
├───────────────────────────────────────┤
│ Knowledge Calls ThinkTank Decisions More │
└───────────────────────────────────────┘
```

Never simply scale the desktop screen down. Re-compose it.

---

# 2. Workspace 1 — Knowledge

## Desktop composition

```text
Knowledge
Search the company's memory and inspect the original source context.

┌───────────────────────────────────────────────────────────────┐
│ Search company knowledge                                  ⌕ │
│ Filters: Department   Clearance                              │
└───────────────────────────────────────────────────────────────┘

┌───────────────────────────────┬───────────────────────────────┐
│ Sources / results             │ Answer / evidence              │
│                               │                               │
│ document row                  │ concise answer                 │
│ document row                  │                               │
│ document row                  │ source references             │
│                               │                               │
└───────────────────────────────┴───────────────────────────────┘
```

The answer must feel like an **evidence workspace**, not a chat application.

### Search result row

- source type icon;
- document title;
- one-line snippet;
- quiet metadata: department, page, lifecycle;
- disclosure affordance.

### Citation detail

Open a contextual drawer on desktop and a sheet on mobile. Show the exact source title, page, snippet and provenance. Do not invent citations.

### States

- empty knowledge base: explain how to add the first source;
- searching: preserve the query and show restrained progress;
- no results: explain the scope used and offer filter adjustment;
- restricted: explain that the source is unavailable under the current clearance without leaking content;
- superseded: show historical status distinctly from active content.

---

# 3. Workspace 2 — Client Calls

## Desktop composition

```text
Client Calls
Review recordings, understand what was requested, and turn commitments into work.

┌────────────────────────────────────────────────────────────────────────────┐
│ call list / selected call                                                  │
├───────────────────────────────┬────────────────────────┬───────────────────┤
│ transcript                    │ audio / timeline        │ extracted facts   │
│                               │                        │                   │
│ speaker                       │ play / pause           │ summary           │
│ speaker                       │ scrubber               │ pain points       │
│ speaker                       │ timestamps             │ feature requests  │
│                               │                        │ commitments       │
└───────────────────────────────┴────────────────────────┴───────────────────┘
```

The transcript is the primary evidence surface. Extraction is interpretation of that evidence.

### Primary action

The key action is **promote a commitment to Action Hub**, not a generic “Ask AI” button.

### Mobile transformation

Use a segmented control or compact tab row:

```text
Transcript | Summary | Commitments
```

The audio player remains persistent near the top when the selected call is active. Extraction details can open in a sheet.

### Audio interaction rules

- playback controls stay familiar;
- waveform is functional, not decorative;
- timestamps are tappable;
- speaker changes are readable without oversized colour coding;
- processing/transcription status uses icon + text rather than a green live dot.

### States

- uploading;
- processing;
- transcription ready;
- extraction ready;
- incomplete transcript;
- unavailable source;
- failure with retry.

---

# 4. Workspace 3 — Onboarding

## Desktop

```text
Onboarding
Your role-based path through the company.

┌──────────────────────────────────────────────────────────────┐
│ 1 Start ─── 2 Learn ─── 3 Apply ─── 4 Complete              │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────┬────────────────────────────────┐
│ day / module list            │ current module                 │
│                              │                                │
│ Day 1  ✓                     │ title                          │
│ Day 2  →                     │ explanation                    │
│ Day 3                         │ examples                       │
│ ...                          │ source links                   │
│                              │                                │
│                              │ Back          Next              │
└──────────────────────────────┴────────────────────────────────┘
```

The **current step** is visually strongest; completed steps compress rather than competing for attention.

### Mobile

Use a compact progress indicator, current-step content and bottom-aligned Next/Back controls. The day list becomes a sheet or collapsible outline.

### Mentor drawer

The Socratic mentor should open as a contextual drawer/sheet from the current onboarding step. It should feel like a tutor embedded in the task, not a full-screen chatbot takeover.

---

# 5. Workspace 4 — Think Tank

## Desktop

```text
Think Tank

┌───────────────┬──────────────────────────────────────┬────────────────────┐
│ topics        │ discussion                            │ context             │
│               │                                      │                     │
│ #pricing      │ message / note                       │ decisions           │
│ #roadmap      │ message / note                       │ source material     │
│ #hiring       │ message / note                       │ related actions     │
│               │                                      │                     │
└───────────────┴──────────────────────────────────────┴────────────────────┘

                     [Optional: Canvas]
```

The discussion should read like a focused professional collaboration surface. Do not overuse chat bubbles, avatars or decorative message chrome.

### Canvas

The canvas is optional. In document mode, the discussion remains the primary surface. In split mode, the canvas is secondary. In canvas mode, the diagram is allowed to become primary. The graph should use neutral nodes, thin connectors and one restrained selection accent.

### Mobile

Channels become a top selector. Context becomes a sheet. Canvas opens as an explicit mode rather than appearing automatically.

---

# 6. Workspace 5 — Decisions

## Desktop

```text
Decisions
The durable record of what the company decided and why.

┌────────────────────────────┬────────────────────────────────────┐
│ decision ledger            │ selected decision                  │
│                            │                                    │
│ Decision 14                │ title                              │
│ Decision 13                │ context                            │
│ Decision 12                │ options                            │
│ ...                        │ chosen direction                   │
│                            │ related records                    │
└────────────────────────────┴────────────────────────────────────┘

             [What-If Simulation]   [Contradiction Review]
```

The selected decision should read like an editorial record, not a dashboard card.

### Sensitivity control

Use a compact segmented control:

```text
Strict  |  Balanced  |  Relaxed
```

Do not use a glossy or liquid visual slider.

### What-if simulation

Open a drawer on desktop and near-full-height sheet on mobile. Separate:

1. inputs;
2. computed impacts;
3. affected promises/modules;
4. executive synthesis.

Numbers and affected entities should be visibly distinguishable from generated narrative.

### Contradiction review

Use a clear comparison:

```text
Current proposal
        ↕
Existing decision
        ↓
Why they conflict / why they may coexist
```

The user must remain in control of accepting a change in direction.

---

# 7. Workspace 6 — Architecture

## Desktop

```text
Architecture
Inspect the system topology and the rules protecting it.

┌─────────────────────────────┬──────────────────────────┬────────────────────┐
│ findings / invariants       │ graph                    │ evidence           │
│                             │                          │                    │
│ INV-017  Blocked            │ A ─→ B ─→ C             │ file               │
│ INV-021  Passing            │      ↘ D                │ line               │
│ INV-014  Review             │                          │ rationale          │
│ INV-008  Passing            │                          │ ADR                │
└─────────────────────────────┴──────────────────────────┴────────────────────┘
```

This is the one workspace where technical density is expected, but the layout should still feel like professional engineering software rather than a command centre.

### Finding detail

When a finding is selected, the detail surface should show:

- rule ID;
- rule name;
- status;
- file;
- line;
- concise rationale;
- evidence;
- ADR reference;
- suggested refactor.

### Graph rules

- 2D only;
- neutral nodes;
- thin connectors;
- restrained selected-path accent;
- semantic red only for a real violation;
- no glow, particle motion or 3D perspective.

### Mobile

Findings become the primary list. Selecting one opens the evidence sheet. Graph becomes a separate explicit view rather than a permanently visible half-width panel.

---

# 8. Unified Action Hub

## Desktop

Use a right-side drawer or utility panel.

```text
┌──────────────────────────────────────────────────┐
│ Action Hub                                  ×    │
│ 8 open                                          │
├──────────────────────────────────────────────────┤
│ Prepare SAML requirements                         │
│ Mir · 04 May · from Client Call                  │
│                                                  │
│ Review Decision 14                                │
│ Arya · from Think Tank                            │
│                                                  │
│ Fix INV-017                                       │
│ Engineering · from Architecture                  │
└──────────────────────────────────────────────────┘
```

The source relationship is first-class. Every task should answer: **what is this action, who owns it, when is it due, where did it come from?**

## Mobile

Use a near-full-height sheet. Preserve source links and status controls without requiring horizontal scrolling.

---

# 9. Shared record-detail pattern

Any detail view should follow:

```text
Context
 ↓
Title
 ↓
Primary evidence / content
 ↓
Supporting metadata
 ↓
Provenance / relationships
 ↓
Available actions
```

Do not place action buttons before the user understands the record.

---

# 10. Shared loading / empty / error patterns

### Loading

Use skeletons only where the final layout is known and waiting is long enough to justify them. Otherwise use simple inline progress.

### Empty

Explain why the space is empty and the next useful action. Never show an empty dashboard full of placeholder cards.

### Error

State what failed, preserve the user's input, and offer the smallest useful recovery action.

### Restricted

Show that access is limited without exposing the protected source or hinting at its contents.

### Superseded

Retain the record for provenance while making its historical status clear.

---

# 11. Responsive transformation rules

Every desktop composition must answer three questions before implementation:

1. What is the primary task?
2. What secondary information can safely move into a drawer/sheet?
3. What interaction needs a touch-first redesign rather than a scale-down?

Default transformations:

| Desktop | Compact | Mobile |
|---|---|---|
| split panes | selective split | stacked flow |
| right drawer | drawer | sheet |
| six-item nav | compressed nav | 5-item bottom bar + More |
| hover disclosure | click disclosure | tap disclosure |
| dense table | reduced columns | row list + detail |
| side context | collapsible context | sheet |
| large canvas | reduced canvas | explicit full-screen mode |

---

# 12. Visual quality gates for every screen

Before considering a screen complete:

- remove one unnecessary surface;
- remove one unnecessary badge;
- remove one unnecessary colour;
- confirm the primary action is obvious without animation;
- confirm the screen remains coherent in grayscale;
- confirm mobile has a deliberate composition;
- confirm every meaningful state is represented honestly;
- confirm source/provenance remains accessible;
- confirm no control looks decorative unless it is also functional.
