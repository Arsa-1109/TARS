# TARS — FRONTEND IMPLEMENTATION REFERENCE

**Version:** 5.0
**Purpose:** Concrete, reusable implementation patterns for the TARS frontend.

This document defines behaviour and component anatomy. It does not redefine TARS product scope.

---

# 0.1 Design implementation order

Build in this order:

```text
semantic structure
  ↓
responsive composition
  ↓
content hierarchy
  ↓
component states
  ↓
typography + spacing
  ↓
borders/material
  ↓
semantic colour
  ↓
motion
```

Do not start from decoration.

# 1. Shell pattern

Use one persistent shell around all authenticated workspaces.

```text
App
 └── AppShell
      ├── TopBar
      │    ├── Brand
      │    ├── WorkspaceNav
      │    └── GlobalActions
      ├── MainScrollContainer
      │    └── ActiveWorkspace
      └── MobileTabBar (mobile only)
```

The shell should not remount merely because the user switches workspace unless a specific animation/state reset requires it.

---

# 2. Navigation state

Persist only useful navigation context.

Recommended:

```text
currentWorkspace
selectedRecordId (when meaningful)
theme
local role/profile context if product already supports it
```

Avoid persisting stale query/filter state unless it materially helps the task.

Use session storage for temporary navigation context and local storage for user preferences.

Never persist sensitive content in browser storage unless the product explicitly requires and protects it.

---

# 3. Desktop top navigation

An effective anatomy:

```text
Brand | [Knowledge Calls Onboarding Think Tank Decisions Architecture] | Action | Profile
```

On wide screens, active item uses a neutral high-contrast inset surface.

On hover, inactive items receive only a subtle surface shift.

Do not use bright accent fills for the active workspace.

---

# 4. Mobile bottom navigation

The visual bar can use mild system material, but it is not a decorative capsule.

Implementation requirements:

- fixed bottom;
- safe-area aware;
- content reserves bottom padding;
- each item has a 44px+ target;
- selected item has clear contrast;
- labels remain legible;
- no hover-dependent behaviour;
- no pointer-drag navigation required.

A `More` item opens a sheet for secondary workspaces.

---

# 5. Page transitions

Use a small opacity/translate transition on workspace change if it improves continuity.

Reference behaviour:

```text
opacity 0 → 1
translateY(4px) → 0
```

Duration ~200–260ms.

Do not animate every child independently on page load.

---

# 6. Page header pattern

```text
PageHeader
 ├── eyebrow/context (optional, not uppercase by default)
 ├── title
 ├── one-sentence description
 └── actions
```

Rules:

- title is the strongest text on the page;
- description is optional and short;
- primary action appears only when needed;
- secondary actions stay quiet.

---

# 7. Surface pattern

A good `Surface` should be composable:

```tsx
<Surface>
  <SurfaceHeader />
  <SurfaceBody />
</Surface>
```

Surface is not mandatory for every section.

Prefer:

```text
Section → content
```

over:

```text
Card → CardHeader → Card → CardBody → Card → CardFooter
```

when there is no meaningful boundary.

---

# 8. List row pattern

Use a single reusable row anatomy for records:

```text
[icon]  Title
        secondary information
        metadata
                         action/disclosure
```

States:

```text
default
hover
selected
disabled
restricted
```

Selected row should never become a bright colour block.

---

# 9. Detail drawer pattern

```text
┌───────────────────────────┐
│ Close    Title            │
├───────────────────────────┤
│ summary                   │
│                           │
│ details                   │
│                           │
│ provenance                │
│                           │
│ actions                   │
└───────────────────────────┘
```

The underlying workspace remains visible on desktop.

The drawer must have its own vertical scroll.

Close restores focus to the trigger.

---

# 10. Mobile sheet pattern

When a drawer would become too narrow:

```text
[underlying workspace]
        ↓
near-full-height sheet
```

Use a full-width surface with rounded upper corners, not a full-screen opaque replacement unless the task needs it.

---

# 11. Modal confirmation pattern

Use for destructive or irreversible actions.

```text
Title
What will happen
Optional consequence
Cancel        Confirm
```

Do not hide critical information behind an icon-only close action.

---

# 12. Search result pattern

```text
Query
↓
Answer
↓
Evidence list
↓
Optional supporting metadata
```

A search result is not a chat bubble.

The answer should feel like a document response, not a messenger conversation.

---

# 13. Citation interaction

A citation affordance should be inline with the claim or immediately beneath it.

On click:

```text
citation → context drawer/sheet
```

The source panel should preserve the selected citation while letting the user return without losing scroll position.

---

# 14. Audio/call player pattern

Reuse one compact player component across Calls and any other audio-backed source.

Anatomy:

```text
play
elapsed ───────── duration
scrubber
```

Optional:

- speed control;
- transcript-follow mode;
- volume.

Do not overbuild controls that the product does not use.

---

# 15. Transcript pattern

Speaker grouping:

```text
Speaker
10:32
Text text text...
```

Use a subtle speaker distinction.

Avoid coloured speaker cards.

If speaker identity is unknown, use a neutral label supplied by the backend.

Clicking timestamp may seek audio.

---

# 16. Structured extraction pattern

Do not render the four Call Studio outputs as four giant dashboard tiles.

Prefer:

```text
Summary
────────────────────────
text

Pain points
────────────────────────
• item
• item

Feature requests
────────────────────────
• item
• item

Commitments
────────────────────────
• item      [Add to Action Hub]
```

This is calmer and easier to scan.

---

# 17. Onboarding stepper pattern

Use explicit step state.

```text
✓────✓────●────○
```

Desktop: horizontal.

Mobile: compact current step + expandable step list.

When the user selects a prior step, show that step without losing the ability to continue.

Manual navigation always overrides any automatic progression.

---

# 18. Think Tank layout pattern

Desktop:

```text
channels | discussion | context
```

The context area is optional.

On small widths:

```text
channel sheet → discussion → context sheet
```

Do not keep three narrow columns on a phone.

---

# 19. Decision ledger pattern

Use a list or table with strong scanability:

```text
Title
Context
Chosen option
Updated
Lifecycle
```

Selecting a decision opens its detail in the main pane or drawer.

The ledger should not become a grid of cards.

---

# 20. Contradiction pattern

When a contradiction exists:

```text
[small semantic indicator] Contradiction detected

Current statement
...

Earlier decision
...

Why they conflict
...

[Open earlier decision] [Review]
```

Use amber sparingly.

No flashing/pulsing alert treatment.

If the old decision has been intentionally superseded, show that lifecycle state instead of continuing to present it as a contradiction.

---

# 21. Sensitivity control

Use a segmented control:

```text
Strict | Balanced | Relaxed
```

Do not use a thick glass slider.

Selection should be visually clear through contrast and a subtle inset surface.

---

# 22. What-if simulation pattern

Desktop:

```text
Inputs left / top
Results below
Affected promises/modules expandable
Executive synthesis at end
```

Mobile:

```text
inputs
↓
run simulation
↓
results
↓
expand details
```

Do not show unexplained “AI score” gauges.

---

# 23. Architecture workspace pattern

Use three conceptual layers:

```text
findings
   ↓
evidence
   ↓
structure / graph
```

The graph is an analytical aid, not the primary information source when a finding is selected.

The selected finding should explain:

- rule ID/name;
- file;
- line;
- evidence;
- rationale;
- suggested refactor;
- ADR reference.

---

# 24. Graph viewport behaviour

Must support:

- pan;
- zoom;
- node selection;
- focused relationship view;
- fit-to-view;
- readable labels.

Avoid auto-rearranging the graph while the user is reading details.

When a finding selects a node/path, emphasise only the relevant path.

Do not animate traversal paths.

---

# 25. Code evidence pattern

A finding detail can show:

```text
File path
line number
code excerpt
────────────────────
explanation
────────────────────
suggested refactor
ADR
```

Use a restrained code surface.

No terminal chrome unless the user is explicitly in a terminal-like technical view.

---

# 26. Action Hub pattern

Use one shared `ActionItem` component wherever tasks appear.

```text
description
owner · deadline
source
status control
```

The source relation should be directly reachable.

Avoid a separate badge for every attribute.

---

# 27. Upload/drop pattern

For documents/audio:

```text
Drop zone
  ↓
selected file
  ↓
processing
  ↓
ready/result
```

The drop zone must not look like a huge futuristic upload portal.

On mobile, a full-width upload control is often preferable to a desktop drag area.

Always keep a conventional file-picker action available.

---

# 28. Processing pattern

Never replace the entire page with:

```text
[ spinner ]
AI is thinking...
```

Instead:

- preserve page header;
- preserve surrounding context;
- show inline processing at the operation site;
- show progress if measurable;
- allow safe navigation where product behaviour permits.

---

# 29. Error recovery pattern

Local error:

```text
inline notice
[Retry]
```

Workspace error:

```text
workspace empty state
[Retry]
```

Unexpected fatal error:

```text
focused error surface
technical reference if helpful
```

Never expose raw stack traces by default.

---

# 30. Permission/restriction pattern

Use a neutral lock/protection treatment.

```text
Restricted
This information is available only to authorised roles.
```

Do not use a red alert banner unless there is an actual security incident/error.

---

# 31. Lifecycle pattern

Current:

```text
ACTIVE
```

Historical:

```text
SUPERSEDED
```

Retired:

```text
DEPRECATED
```

Experimental:

```text
EXPERIMENTAL
```

Lifecycle labels remain visible where they affect interpretation.

---

# 32. Responsive composition reference

## Wide desktop

```text
Top bar
12-column content
2–3 meaningful columns max
```

## Laptop

```text
Top bar
reduced navigation density
1 primary column + contextual panel/drawer
```

## Mobile

```text
Top bar / title
main content
bottom navigation
sheets for secondary context
```

---

# 33. Content width reference

Suggested starting points:

```text
reading content:      720–820px
standard workspace:   1040–1200px
wide analytical:      1200–1360px
full graph surface:   available width
```

These are starting points, not rigid rules.

Use the width that best serves the information.

---

# 34. Fixed chrome rules

Whenever the application uses fixed/sticky chrome:

- reserve content space;
- account for mobile safe areas;
- keep the last actionable content reachable;
- do not hide scrollbars;
- do not use fixed elements that cover dialogs or sheets.

---

# 35. Interaction feedback

Every user-triggered state-changing action should produce one or more of:

- immediate visual state;
- content change;
- progress;
- success confirmation;
- actionable error;
- status update.

The feedback must be proportional.

No confetti.

No excessive toast spam.

---

# 36. Focus and keyboard

Interactive controls must support:

- Tab / Shift+Tab;
- Enter / Space activation where appropriate;
- Escape to close overlays;
- arrow navigation for segmented controls/menu lists where appropriate.

Focus should be restored to the triggering control after a drawer/dialog closes.

---

# 37. Reduced motion

Implement:

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

Do not make reduced motion remove essential state feedback; it should remove animation, not information.

---

# 38. Local haptics

Haptics are optional.

When available, keep them subtle:

- selection change: short tick;
- completion: light confirmation;
- warning: distinct but restrained pulse.

Never make the desktop experience depend on haptics.

Never vibrate on routine navigation.

---

# 39. Print/document behaviour

Where TARS presents generated ADRs or other formal documents, keep a print-friendly representation available only when that product surface requires it.

Print styles should:

- remove navigation;
- remove decorative shadows;
- use white page background;
- preserve text contrast;
- avoid clipping content;
- maintain document hierarchy.

---

# 40. Reuse strategy

Create one component before duplicating a pattern three times.

Examples:

```text
StatusLabel
ProvenanceLink
DetailDrawer
ActionItem
DecisionRow
```

should each have a single implementation.

Workspace-specific composition can differ; primitive behaviour should not.

---

# 41. Dependency discipline

Use the existing project stack first.

Do not add a heavy component library simply to obtain a button, dialog or card.

The product benefits from a small, purposeful internal design system.

---

# 42. No visual dependency on proprietary assets

Do not require proprietary system fonts, icons or Apple-only images to make the web UI coherent.

Use platform stacks and the existing icon package.

If an Apple platform resource is not available in the browser, approximate its interaction pattern with standard web primitives, not an imitation of a copyrighted asset.

---

# 43. Component review checklist

For every new component ask:

1. Is this genuinely reusable?
2. Does it work without colour?
3. Does it have loading/error/disabled behaviour if needed?
4. Does it work at 320–390px?
5. Does it work at 1280px+?
6. Does it have keyboard focus?
7. Does it preserve state across re-renders?
8. Does it use design tokens?
9. Does it create visual clutter?
10. Would the screen be clearer without it?

---

# 44. Reference implementation quality rules

The frontend reference patterns are based on a disciplined existing React implementation style with:

- persistent application shell;
- responsive top navigation;
- a mobile bottom navigation pattern;
- safe-area support;
- compact segmented navigation;
- role/profile popovers;
- guided onboarding stepper;
- file picker + upload processing states;
- camera/media preview patterns where the product requires them;
- context drawers;
- focused dialogs;
- report/document surfaces;
- subtle page transitions;
- optional haptic feedback;
- local persistence for navigation/preferences.

TARS should preserve the good interaction ideas while deliberately rejecting excessive glass, gradients, oversized pills and visual gimmicks.

---

# 45. Final implementation principle

Build the interface so that a person can explain every visible element in one sentence:

> “That is there because it helps me understand, decide, navigate, verify or act.”

Anything else is a candidate for removal.
