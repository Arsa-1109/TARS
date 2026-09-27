# TARS — FRONTEND PATTERN CATALOG

**Version:** 5.0
**Purpose:** Concrete UI/UX patterns to reuse when implementing TARS.

This file is a pattern reference. It is not a product-scope document.

---

# 1. What this catalog governs

Use these patterns whenever TARS needs:

- application chrome;
- navigation;
- lists;
- detail views;
- uploads;
- media playback;
- guided workflows;
- overlays;
- forms;
- reports;
- mobile interactions;
- persistent user context;
- lightweight feedback.

The patterns are intentionally calm and platform-familiar.

---

# 1.1 Audit basis

The reusable patterns in this catalog were distilled from a complete frontend implementation audit, including its source tree, component implementations, route screens, global CSS, interaction handlers, responsive classes, persistence helpers, media interactions and supporting design specifications. The intent is to preserve proven interaction mechanics while selectively removing visual treatments that conflict with TARS's quieter design language.

Observed implementation strengths carried forward include: compact persistent application chrome, responsive navigation, safe-area-aware mobile controls, step-based workflows, media capture/playback, upload/preview flows, contextual overlays, report/document surfaces, touch-aware canvas interaction, lightweight persistence and focused feedback patterns.

Visual treatments that do not carry into TARS are deliberately excluded by the design system.

# 2. Application shell pattern

## Desktop

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ TARS        Knowledge Calls Onboarding Think Tank Decisions Architecture   │
│                                                        Action Hub  Profile │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                             workspace                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Behaviour

- top bar remains visible while workspace content scrolls;
- workspace selection is immediate;
- current workspace is visibly selected;
- secondary global actions remain grouped on the trailing side;
- the bar never becomes a dashboard itself.

### Size

Use approximately 48–52px height.

### Visual treatment

- neutral surface;
- 1px separator;
- optional very mild translucency;
- no giant blur;
- no floating capsule.

---

# 3. Mobile navigation pattern

Use a bottom application bar.

```text
┌───────────────────────────────────────────────┐
│                                               │
│                 page content                  │
│                                               │
├───────────────────────────────────────────────┤
│ Knowledge  Calls  Think Tank  Decisions  More │
└───────────────────────────────────────────────┘
```

### Behaviour

- fixed to the viewport;
- safe-area aware;
- 44px+ touch targets;
- selected item uses high-contrast neutral emphasis;
- `More` opens a sheet for lower-frequency destinations;
- content reserves bottom inset;
- no requirement for pointer dragging.

### Why

It preserves the successful principle of giving mobile users persistent, thumb-reachable navigation while avoiding an oversized decorative dock.

---

# 4. Segmented control pattern

Use for closely related mutually exclusive views.

```text
┌──────────────────────────────────────┐
│  Active  │  Inactive  │  Inactive   │
└──────────────────────────────────────┘
```

### Behaviour

- one tap/click selects;
- selection is immediate;
- active state is stronger through surface + contrast;
- no saturated colour required;
- labels are short;
- keyboard navigation is supported.

Good TARS uses:

- simulation sensitivity;
- transcript views;
- small local view switches.

---

# 5. List row pattern

```text
[icon]  Primary title
        Context / secondary description
        metadata                         >
```

### Behaviour

- entire row can be interactive when appropriate;
- hover is subtle;
- selected state is stronger than hover;
- trailing disclosure signals deeper detail;
- no row is visually louder merely because it exists.

Prefer list rows over card grids for records and history.

---

# 6. Compact record card pattern

Use a card only when the record needs a boundary.

```text
┌──────────────────────────────────────────┐
│ Title                         State       │
│                                           │
│ One concise sentence of context.         │
│                                           │
│ Metadata                     action  →   │
└──────────────────────────────────────────┘
```

### Rules

- 12px radius;
- 1px border;
- no decorative shadow in the normal state;
- one information group only;
- no nested cards unless the inner boundary is functionally necessary.

---

# 7. Page header pattern

```text
Knowledge
Search the company memory and inspect the original source context.

[optional primary action]     [secondary controls]
```

### Behaviour

- title is visually dominant;
- supporting description is one or two lines;
- actions align to the title block;
- mobile stacks actions under the title only when necessary.

Avoid giant hero layouts inside operational workspaces.

---

# 8. Context drawer pattern

Desktop:

```text
main workspace                 ┌─────────────────────────┐
                               │ title              close │
                               ├─────────────────────────┤
                               │ summary                 │
                               │ details                 │
                               │ provenance              │
                               │ actions                 │
                               └─────────────────────────┘
```

### Behaviour

- does not destroy the underlying workspace;
- has its own scroll container;
- can open from a row/citation/finding;
- closing restores focus;
- width 360–480px is a good starting range.

---

# 9. Mobile sheet pattern

Use when the detail panel would become too narrow.

```text
┌──────────────────────────────────────────┐
│            ─────                         │
│ Title                               ×    │
├──────────────────────────────────────────┤
│ content                                  │
│                                          │
│                                          │
└──────────────────────────────────────────┘
```

The sheet is a real surface. Avoid a fake glass object.

---

# 10. Popover pattern

Use for compact menus, filters and contextual controls.

Characteristics:

- close to trigger;
- 1px border;
- small radius;
- concise rows;
- small shadow;
- subtle material only if it improves separation.

Avoid wide animated popovers for simple selections.

---

# 11. Dialog pattern

Use only for focused confirmations or short tasks.

```text
Title

What is changing and why.

Cancel                    Confirm
```

Do not put entire workspaces inside dialogs.

Use the highest emphasis only when the action is consequential.

---

# 12. File upload pattern

```text
┌──────────────────────────────────────────┐
│ Drop document/audio here                 │
│ or                                      │
│ [Choose file]                            │
└──────────────────────────────────────────┘
```

After selection:

```text
filename.ext                       remove
Type · size                        
Processing…
```

After completion:

```text
filename.ext                       Ready
```

### Rules

- desktop may support drag/drop;
- mobile must keep a normal file picker;
- selected files should be identifiable before processing;
- errors stay local to the upload task;
- no giant futuristic upload illustration.

---

# 13. Media capture / playback pattern

TARS needs audio playback, not camera inspection, but the same interaction principles apply.

### Player

```text
[play]  01:12 ─────────────── 04:28
```

### Behaviour

- one obvious primary action;
- current timestamp is visible;
- scrubber is easy to control;
- waveform is optional and should remain quiet;
- mobile target sizes increase without increasing visual bulk.

---

# 14. Guided workflow pattern

Use for onboarding and other sequential tasks.

Desktop:

```text
✓────✓────●────○
```

Current step has strongest contrast.

Completed steps become quieter.

Pending steps remain visible but subordinate.

Mobile:

```text
Step 3 of 6
Current step title

[Expand steps]
```

Do not force a tiny horizontal stepper onto a phone.

---

# 15. Progressive disclosure pattern

Use a consistent reveal hierarchy:

```text
essential
  ↓
supporting detail
  ↓
technical evidence
  ↓
historical context
```

Every expansion should answer a user need.

Avoid accordions that hide information merely to make screenshots cleaner.

---

# 16. Status pattern

Use label + icon where useful.

Examples:

```text
✓ Completed
◷ Processing
! Needs review
× Blocked
⌁ Superseded
⌕ Restricted
```

The exact icon can follow the installed icon library.

Do not rely on coloured dots.

---

# 17. Local service status pattern

Use:

```text
Shield icon   Local
```

or:

```text
Network icon  Internet access disabled
```

only when the runtime actually knows that state.

Do not use:

```text
● LIVE
● ONLINE
● AI READY
```

as generic decoration.

---

# 18. Search pattern

```text
[search icon]  Ask about a company fact, decision or source...
```

The result surface should look like a document answer, not a chat bubble.

The response should contain:

- answer;
- citations;
- optional context;
- next useful action.

---

# 19. Citation pattern

```text
Source  ·  Client call  ·  10:32
```

Clicking opens the exact source context.

Citation styling:

- small;
- high readability;
- restrained steel accent;
- no glowing border;
- no bright green background.

---

# 20. Decision row pattern

```text
Decision title
why it was made · chosen direction
Updated 18 Sep 2026                       >
```

Lifecycle is secondary but visible where it changes interpretation.

---

# 21. Contradiction pattern

```text
Contradiction detected

Current proposal
...

Earlier decision
...

Why they conflict
...

Open decision  ·  Review
```

Use amber only for the actual contradiction state.

Never flash or pulse the row.

---

# 22. Action item pattern

```text
Implement SSO requirement
Product · due 30 Sep
Source: Client Call · 10:32          IN PROGRESS
```

The status control should be compact and text-readable.

Do not create a badge for every metadata field.

---

# 23. Architecture finding pattern

```text
INV-017  External call inside transaction

src/payments/service.py:84

Observed
await stripe.charge(...)
inside the transaction scope.

Why it matters
Keeping network I/O inside the transaction can hold resources while waiting on an external service.

Suggested refactor
Use an outbox / post-commit dispatch pattern.

ADR-012
```

The exact content comes from the backend.

---

# 24. Graph selection pattern

Default graph:

```text
neutral nodes + neutral edges
```

Selected object:

```text
steel outline / subtle accent
```

Problematic object:

```text
semantic red
```

Do not recolour the entire graph to create spectacle.

---

# 25. Loading pattern

Choose one of:

```text
skeleton      when shape is known
spinner       when task is small/indeterminate
progress bar  when measurable progress exists
```

Keep the page structure visible.

---

# 26. Error pattern

```text
Couldn’t load this decision
The local service did not return the requested record.

[Retry]
```

Avoid raw exceptions by default.

---

# 27. Empty pattern

```text
No decisions yet
Decisions recorded here become part of the shared company memory.

[Record a decision]
```

Use a small neutral icon only if it helps recognition.

---

# 28. Form pattern

Prefer:

```text
Label
[input]
helper text
```

rather than relying on placeholders as labels.

Desktop forms may use two columns only when the fields are closely related and readable.

Mobile forms become one column.

---

# 29. Table pattern

Use a real table for comparison tasks.

Headers:

- subdued;
- short;
- left aligned for text;
- right aligned for numerical data.

Rows:

- 12–16px vertical padding;
- 1px separators only where needed;
- subtle hover.

Mobile:

- transform to record rows;
- or allow controlled horizontal scrolling when comparison is fundamental.

---

# 30. Report/document pattern

Formal output should feel like a document.

```text
title
metadata
summary
sections
source/evidence
history
```

When print/export is part of the product, print mode removes application chrome and restores an uncluttered paper-like layout.

---

# 31. Persistence pattern

Useful UI state can persist:

- theme;
- current workspace;
- selected record;
- onboarding completion;
- local display preferences.

Sensitive content should not be casually stored in browser persistence.

---

# 32. Touch feedback pattern

On mobile, interaction can use subtle haptic feedback where supported.

Use only for meaningful actions:

- selected tab/workspace;
- completed important task;
- explicit warning;
- confirmation.

Never vibrate on every tap.

---

# 33. Scroll pattern

One main scroll container per workspace is preferred.

Local secondary scroll regions are acceptable for:

- transcript;
- table body;
- graph details;
- drawers.

Do not create multiple nested scroll areas without a clear reason.

Avoid unexpected auto-scroll.

---

# 34. Fixed chrome pattern

If top or bottom chrome is fixed:

```text
fixed chrome
       ↓
reserved content inset
       ↓
scrollable content
```

Nothing important may be hidden underneath it.

---

# 35. Pattern improvement rules

When reusing a pattern, improve it if:

- it is visually heavier than necessary;
- it uses a decorative effect instead of hierarchy;
- it creates a touch/accessibility problem;
- it causes layout shift;
- it forces desktop geometry onto mobile;
- it repeats information unnecessarily.

Never improve by adding visual complexity.

---

# 36. Pattern rejection test

Reject a proposed pattern if its primary explanation is:

> “It looks more AI.”

or:

> “It looks futuristic.”

or:

> “It makes the dashboard pop.”

The acceptable reasons are:

> clearer,
> faster,
> safer,
> easier to navigate,
> more legible,
> more responsive,
> more accessible,
> more understandable.
'''
