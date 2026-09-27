# TARS — FRONTEND DESIGN SYSTEM

**Version:** 5.0
**Status:** Visual and interaction authority
**Scope:** `apps/web/`

---

# 1. North star

TARS is a premium professional software product.

The visual language is **quiet luxury**:

- monochrome foundation;
- refined neutral surfaces;
- precise typography;
- excellent spacing;
- restrained materials;
- selective semantic colour;
- subtle motion;
- high information quality;
- no visual theatre.

The product should feel closer to a beautifully considered professional macOS/iPadOS/iOS productivity application than to an AI landing page or developer cockpit.

---

# 1.1 Reference-pattern adaptation rule

The implementation patterns used by the reference product are a **behavioural source**, not a visual theme. Reuse the proven interaction mechanics and responsive composition, then render them through the TARS design language.

Preserve where applicable:
- compact persistent application chrome;
- desktop centred navigation with trailing utility actions;
- persistent mobile bottom navigation with safe-area handling;
- drawers on desktop and sheets on narrow screens;
- step-based onboarding;
- media capture/upload/playback flows;
- drag-and-drop and file-preview interactions;
- progressive disclosure for dense detail;
- print-friendly report surfaces;
- pointer/touch-safe interaction;
- restrained motion and optional haptics for meaningful actions.

Do **not** preserve glassmorphic decoration, liquid-glass visual treatment, bright status indicators, excessive rounded capsules, gradients, decorative glow or source-product-specific visual styling.

# 2. Design principles

Use the following principles as a design discipline:

## Purpose
Every control and surface must support a real task.

## Agency
The user chooses what to open, what to expand, when to move forward, and when to confirm a consequential action.

## Responsibility
Privacy, access, provenance and destructive actions must be treated seriously without alarmist visual treatment.

## Familiarity
Use familiar structures: toolbars, tabs, list rows, segmented controls, sheets, popovers, drawers, standard forms.

## Flexibility
One component can adapt its form across desktop, laptop, tablet and mobile while preserving the same semantics.

## Simplicity
Simplicity is not fewer features. It is the smallest amount of interface needed to make the task obvious.

## Craft
Alignment, spacing, focus, touch targets, loading, transitions and responsive composition matter as much as colour and typography.

## Delight
Use refinement, not spectacle, to create delight.

---

# 3. Anti-slop constitution

### Never use as dominant design language

- violet;
- purple;
- indigo;
- cyan;
- neon blue;
- cyberpunk green;
- rainbow;
- AI gradients;
- glowing edges;
- holographic materials;
- dark-space backgrounds with floating stars;
- sci-fi HUD grids;
- giant techno typography;
- terminal text used outside technical content.

### Never use as generic components

- pill-shaped primary buttons;
- pill-everything filters;
- badge collections with no hierarchy;
- “LIVE” green dots;
- “AI powered” sparkles;
- giant glass capsules;
- decorative 3D nodes;
- pulsing cards;
- excessive blur;
- animated backgrounds.

### General visual rule

**When in doubt, remove one visual layer.**

---

# 3.9 Visual budget

Every operational screen has a limited visual budget. Prefer hierarchy over decoration:

1. One primary focal area.
2. One secondary contextual area.
3. Supporting metadata stays quiet.
4. Semantic colour appears only where meaning requires it.
5. One elevated layer at a time.
6. No more than one visually expressive interaction per screen.

A screen should still look finished in a monochrome screenshot with shadows removed. If removing an effect makes the interface collapse visually, the hierarchy is too dependent on decoration.

# 4. Colour system

## 4.1 Light palette

| Token | Value | Use |
|---|---|---|
| `canvas` | `#F5F5F7` | application background |
| `surface` | `#FFFFFF` | primary content surface |
| `surface-secondary` | `#F2F2F7` | nested groups, selected low-emphasis surfaces |
| `surface-tertiary` | `#E5E5EA` | controls, subtle fills |
| `separator` | `#D1D1D6` | 1px structure |
| `border-strong` | `#B8B8BE` | stronger control boundaries |
| `text-primary` | `#1D1D1F` | primary text |
| `text-secondary` | `#6E6E73` | secondary text |
| `text-tertiary` | `#8E8E93` | metadata / placeholders |
| `accent` | `#536273` | links, selected informational emphasis |

## 4.2 Dark palette

| Token | Value | Use |
|---|---|---|
| `canvas` | `#000000` | application background |
| `surface` | `#1C1C1E` | primary content surface |
| `surface-secondary` | `#2C2C2E` | nested groups |
| `surface-tertiary` | `#3A3A3C` | controls |
| `separator` | `#38383A` | structural boundaries |
| `border-strong` | `#4A4A4F` | stronger control boundaries |
| `text-primary` | `#F5F5F7` | primary text |
| `text-secondary` | `#AEAEB2` | secondary text |
| `text-tertiary` | `#8E8E93` | metadata |
| `accent` | `#A6B3C0` | links, selected informational emphasis |

## 4.3 Semantic palette

Semantic colour is not brand colour.

| State | Light text | Light surface | Dark text | Use |
|---|---|---|---|---|
| Success | `#2F6F4E` | `#EAF4EE` | `#8FC5A5` | completed / healthy / confirmed |
| Warning | `#8A6418` | `#F7F1E1` | `#D9B866` | attention / contradiction / pending |
| Critical | `#9C3F3F` | `#F8ECEC` | `#E29B9B` | blocked / failed / destructive |
| Info | `#536273` | `#EEF1F4` | `#A6B3C0` | informational / provenance |
| Neutral | `#5F6368` | `#F2F2F7` | `#AEAEB2` | inactive / superseded / muted |

### Critical rule

Never use green to mean merely:

- online;
- local;
- connected;
- available;
- “AI is ready”.

Connectivity can be communicated with a neutral icon + wording such as `Local`.

---

# 5. Surface hierarchy

Use three core surface levels only:

```text
Canvas
  ↓
Surface
  ↓
Surface-secondary / tertiary
```

A fourth elevated layer is allowed only for overlays.

Do not make every section a card.

A section can be distinguished purely by spacing and typography.

---

# 6. Borders and separators

Default structure is a crisp 1px line.

Light:

```text
#D1D1D6
```

Dark:

```text
#38383A
```

Use stronger borders only for:

- active controls;
- input focus;
- selected surfaces;
- important separators.

No thick decorative outlines.

---

# 7. Shadows

Most content surfaces should have no visible shadow.

Use:

```css
--shadow-subtle: 0 1px 2px rgba(0,0,0,.04);
--shadow-popover: 0 8px 24px rgba(0,0,0,.10);
--shadow-modal: 0 20px 40px rgba(0,0,0,.14);
```

Dark mode may increase opacity slightly, but no giant black halos.

---

# 8. Radius system

Use a restrained scale:

```text
radius-control = 8px
radius-card = 12px
radius-large = 16px
radius-sheet = 16–20px
```

`rounded-full` is reserved for:

- avatars;
- truly circular controls;
- progress tracks where geometry requires it.

It is not used for ordinary buttons, navigation controls, search fields or cards.

---

# 9. Typography

## 9.1 Font family

Use the platform system stack:

```css
font-family:
  -apple-system,
  BlinkMacSystemFont,
  "SF Pro Text",
  "SF Pro Display",
  "Segoe UI",
  Roboto,
  sans-serif;
```

Do not bundle proprietary system fonts.

If the runtime does not expose an Apple system font, the fallback must remain visually coherent.

## 9.2 Technical type

Use:

```css
font-family:
  ui-monospace,
  SFMono-Regular,
  Menlo,
  Monaco,
  Consolas,
  monospace;
font-variant-numeric: tabular-nums;
```

Use for:

- commit hashes;
- file paths;
- line numbers;
- timestamps;
- latency values;
- model/runtime values;
- technical IDs;
- structured numbers.

Do not use monospace for ordinary prose.

## 9.3 Scale

| Role | Size | Weight | Line height |
|---|---:|---:|---:|
| Display | 36–48px | 500–600 | 1.08–1.12 |
| Page title | 28–32px | 600 | 1.15 |
| Section title | 20–22px | 600 | 1.25 |
| Subsection | 16–18px | 600 | 1.3 |
| Body | 15–16px | 400 | 1.45–1.55 |
| Small | 13–14px | 400–500 | 1.35–1.45 |
| Metadata | 12px | 400–500 | 1.3 |
| Technical micro | 11px | 500 | 1.2 |

Prefer sentence case.

Use uppercase only for rare technical labels or document metadata.

Do not scatter `text-[9px] uppercase tracking-widest` labels across the product.

---

# 10. Spacing rhythm

Base grid: 4px.

Use primarily:

```text
4  8  12  16  20  24  32  40  48  64
```

Guidance:

- 4–8: icon/text relationships;
- 12: compact controls;
- 16: normal control/card interiors;
- 20–24: section separation;
- 32–40: major content separation;
- 48–64: page-level breathing room.

Whitespace is part of the hierarchy, not wasted space.

---

# 11. Layout grid

Wide analytical screens:

```text
12-column grid
24px gutters
32–40px outer margins
```

Medium screens:

```text
8-column flexible grid
20px gutters
24px outer margins
```

Mobile:

```text
4-column conceptual grid
16px outer padding
12–16px internal gaps
```

Do not force columns when content is too narrow to read.

---

# 12. Toolbar

Desktop default height: 48–52px.

Use:

```text
leading identity / navigation
center workspace context
trailing global actions
```

Keep the number of controls deliberate.

Toolbar actions must be grouped by function.

Do not put every conceivable action into the top bar.

---

# 13. Mobile tab bar

The mobile tab bar is application chrome.

Visual treatment:

- restrained translucent/solid system material if useful;
- 1px top separator;
- small shadow only if content boundary needs help;
- no oversized capsule;
- no huge blur radius;
- no floating “island” unless content geometry genuinely requires it.

Five visible items maximum is preferred here because `More` preserves access without overcrowding.

Minimum touch target: 44px.

---

# 14. Buttons

## Primary

Light:

```text
background #1D1D1F
foreground #FFFFFF
```

Dark:

```text
background #F5F5F7
foreground #1D1D1F
```

Use 8px radius.

## Secondary

Transparent or surface background + 1px separator border.

## Tertiary

Borderless text/icon action.

## Destructive

Prefer text or restrained outline. Use a filled destructive action only when the action is clearly consequential and the context demands strong confirmation.

Never use red as generic attention decoration.

---

# 15. Iconography

Use a single coherent icon library/style.

Prefer simple geometric glyphs.

Suggested sizes:

```text
14px = metadata / compact controls
16px = normal control
18px = navigation
20px = primary mobile navigation
24px = feature-level action
```

Stroke weight should remain visually consistent.

Do not use emoji as structural UI.

Icons support labels; they do not replace important labels.

---

# 16. List rows

Lists are a major TARS pattern.

Standard row:

```text
leading icon / state
primary title
secondary context
optional metadata
trailing action / disclosure
```

Use 12–16px vertical padding depending on density.

Hover can use a very light surface shift.

Selection should be stronger than hover but not loud.

Do not turn every list row into a mini-card.

---

# 17. Cards and surfaces

Use cards only when a boundary helps scanning or action.

Correct:

```text
[ Decision ]
Title
Context
Choice
Updated timestamp
```

Incorrect:

```text
[ card [ card [ badge [ icon ] ] ] ]
```

The more information can be grouped with spacing alone, the better.

---

# 18. Search fields

Height:

- 36–40px desktop;
- 44px mobile.

Use subtle background or white surface.

Focus:

- 1px accent border;
- optional very soft focus ring;
- no neon halo.

Search results should preserve query context.

---

# 19. Segmented controls

Use segmented controls for small mutually exclusive view choices.

Structure:

```text
outer surface
  ├── inactive
  ├── active
  └── inactive
```

Active state:

- high contrast neutral surface;
- slightly stronger shadow only when needed;
- clear selected semantics.

Avoid giant rounded capsules.

---

# 20. Status labels

A status label is a compact semantic statement, not decoration.

Structure:

```text
icon  label
```

Example states:

```text
Completed
Processing
Needs review
Blocked
Superseded
Restricted
```

The label must carry meaning even without colour.

Avoid dots when an icon or text is more informative.

---

# 21. Connectivity / locality status

Never show a green dot with `LIVE` or `ONLINE` by default.

Use a quiet text status such as:

```text
Local
Local only
Internet access disabled
Waiting for local service
```

Optionally pair with:

- shield icon;
- network icon;
- lock icon.

Connectivity is a system fact, not a marketing badge.

---

# 22. Provenance / citation component

A citation should be visually subordinate to the answer but easy to activate.

Suggested appearance:

```text
Source  ·  Decision #14  ·  14 Sep 2026
```

Use steel accent for the link text only.

Opening reveals:

- original source title;
- page/line/timestamp/commit;
- source snippet;
- lifecycle state if relevant.

Do not make citations bright green or bright blue callouts.

---

# 23. Drawers

Desktop drawer width:

```text
360–480px
```

Use when detail belongs to the current task.

The drawer surface should be opaque or only subtly translucent.

No giant blur.

Mobile drawers become sheets with near-full-screen height.

---

# 24. Sheets

Use for:

- mobile filters;
- mobile workspace selection;
- context detail;
- secondary actions.

Sheet anatomy:

```text
handle (optional)
title
content
primary action if required
```

Sheet background should be a real surface, not an exaggerated glass object.

---

# 25. Dialogs

Use dialogs only for focused decisions.

Width:

```text
360–520px
```

Backdrop:

```text
rgba(0,0,0,.35–.5)
```

Use slight blur only when it helps separation.

Never put an entire workspace inside a modal.

---

# 26. Loading system

## Skeleton

Use neutral blocks approximating final geometry.

No rainbow shimmer.

A very subtle neutral shimmer is acceptable only if it improves perceived continuity.

## Spinner

Use small system-like stroke spinner.

## Progress

Use when progress is measurable.

Never show a progress percentage if the backend cannot actually measure it.

---

# 27. Error system

Use semantic red only for actual error/critical state.

Structure:

```text
icon + concise title
short explanation
recovery action
```

Do not make the entire page red.

---

# 28. Empty system

Empty states use:

```text
small icon
short heading
plain-language explanation
single next action
```

No giant illustrations.

---

# 29. Workflow system

Use a step indicator for linear onboarding/setup processes.

States:

```text
completed
current
upcoming
blocked
```

Visual priority:

```text
current > completed > upcoming
```

Completed history becomes quieter once the user advances.

### Desktop
Horizontal stepper is preferred.

### Mobile
Use a compact current-step indicator + expandable list when the full stepper becomes too wide.

---

# 30. Timeline system

Used for:

- call timestamps;
- decision history;
- ADR chronology;
- action history.

Rules:

- current event is strongest;
- history is quieter;
- timestamps use technical/tabular type;
- connectors are 1px and neutral;
- semantic colours only when state carries meaning.

---

# 31. Graph system

Architecture graphs must read like technical diagrams, not sci-fi.

Nodes:

- neutral surface;
- 1px border;
- restrained radius;
- concise label;
- optional metadata.

Edges:

- thin neutral line;
- arrows only where direction matters.

Selection:

- steel accent.

Critical violation:

- semantic red used on the specific node/edge/relationship.

No:

- glowing edges;
- particles;
- gradients;
- neon node colours;
- 3D effects.

---

# 32. Code/diff system

Use a readable editor-like surface, not a terminal.

- line numbers muted;
- code body high-contrast;
- changed lines lightly tinted;
- critical finding highlighted in semantic red;
- selected line can use steel accent.

Keep code font monospace and tabular where appropriate.

---

# 33. Transcript system

Transcript is a reading experience.

Each speaker segment can contain:

```text
speaker
start timestamp
text
```

Timestamps are tappable to seek audio when the backend/player supports it.

Do not render each sentence as a separate card.

Use whitespace and a subtle divider between major speaker groups.

---

# 34. Simulation system

Inputs should feel like controls for a real model, not a game.

Use:

- labelled numeric fields;
- segmented scenarios where appropriate;
- compact sliders only where continuous values are meaningful;
- helper text.

Results should be grouped in a readable report-like surface.

Do not use radial gauges unless they answer a real comparative question.

---

# 35. Motion system

Timing:

```text
micro: 120–160ms
small: 160–200ms
content: 180–220ms
drawer/sheet: 220–280ms
```

Easing:

```css
cubic-bezier(0.22, 1, 0.36, 1)
```

or a similarly restrained ease-out.

Motion types:

- opacity;
- small translate;
- small scale change;
- progress fill;
- disclosure height.

Avoid large transforms.

---

# 36. Hover, active and focus

Hover:

- subtle surface shift;
- optional border strengthening.

Active:

- immediate feedback;
- no exaggerated shrink.

Focus:

- visible keyboard ring;
- 2px outer ring acceptable;
- neutral or steel focus colour.

Disabled:

- reduced contrast;
- preserve readable structure;
- do not rely only on opacity if contrast becomes too low.

---

# 37. Touch interaction

For mobile:

- target >=44px;
- no hover-only interaction;
- drag only where the drag itself is the task;
- avoid horizontal gesture conflicts with page scrolling.

Optional haptic feedback may be used sparingly for:

- primary selection changes;
- meaningful completion;
- consequential warnings;

but only when supported by the platform and never as a substitute for visual feedback.

---

# 38. Responsive rules

## >=1280

Full toolbar + six workspace navigation items.

Multi-column layouts allowed.

## 1024–1279

Reduce control density.

Use selective disclosure for secondary navigation.

## 768–1023

Prefer single main column with contextual split panels where space permits.

## <768

Bottom navigation + sheets.

Single column.

Full-width controls.

No forced desktop tables.

---

# 39. Safe-area rules

Any fixed bottom UI must include:

```css
padding-bottom: env(safe-area-inset-bottom, 0px);
```

Scrollable content must reserve sufficient bottom space so fixed navigation never obscures the final action or last list item.

---

# 40. Dark mode

Dark mode is not a colour inversion exercise.

Use:

```text
#000000 canvas
#1C1C1E surface
#2C2C2E nested surface
#38383A separator
```

Do not use saturated dark colours as section backgrounds.

Do not put bright white cards everywhere.

Primary text is soft white, not pure white everywhere.

---

# 41. Content rules

Copy should be:

- short;
- direct;
- natural;
- specific;
- free of redundant AI jargon.

Prefer:

`Transcribing call`

over:

`AI-powered autonomous intelligence processing`.

Prefer:

`Source: Client call, 10:32`

over:

`AI citation evidence node`.

---

# 42. Density

TARS is information-dense.

Do not solve density by shrinking everything.

Instead:

- group related data;
- remove redundant labels;
- use strong alignment;
- keep metadata compact;
- use progressive disclosure.

---

# 43. Tables

Use tables only when row/column comparison is the task.

Headers are subtle.

Rows have adequate vertical rhythm.

Numeric cells use tabular numerals.

On mobile, convert to:

```text
record title
key value
secondary metadata
```

or permit controlled horizontal scrolling only when comparison remains essential.

---

# 44. Forms

Use explicit labels above fields.

Inputs should have:

- clear label;
- optional helper text;
- focus state;
- error state;
- disabled state.

Do not hide labels inside placeholders when the field remains on screen after data entry.

Use sensible defaults only when supplied by the product/backend.

---

# 45. Menus and popovers

Popover:

- close to trigger;
- 1px border;
- subtle shadow;
- no giant blur;
- clear selection state.

Menu rows should have at least 36px visual height desktop and 44px mobile when directly tappable.

---

# 46. Z-index

Use a predictable scale:

```text
base       0
sticky     20
topbar     30
popover    40
drawer     50
dialog     60
critical   70+
```

---

# 47. Accessibility

Minimum requirements:

- keyboard navigation;
- semantic elements;
- visible focus;
- labels for controls;
- status announced appropriately;
- colour not sole state signal;
- reduced motion;
- readable text size;
- no pointer-only gestures for critical actions.

---

# 48. Design tokens

Expose through CSS variables / Tailwind semantic tokens:

```text
color.canvas
color.surface
color.surface-secondary
color.surface-tertiary
color.separator
color.border-strong
color.text-primary
color.text-secondary
color.text-tertiary
color.accent
color.success.*
color.warning.*
color.critical.*
color.info.*
spacing.*
radius.*
shadow.*
motion.*
z.*
```

Never scatter arbitrary hex values through JSX.

---

# 49. CSS policy

Avoid large page-specific style blocks.

Prefer:

- semantic token utilities;
- shared primitives;
- Tailwind classes when already used by the project;
- small, named reusable CSS classes for genuinely repeated behaviour.

Avoid using inline styles for one-off visual experimentation.

---

# 50. Anti-pattern QA

Reject a screen if it contains any of these without a documented functional reason:

- dominant purple/violet/indigo/cyan;
- gradient background;
- gradient text;
- glowing border;
- backdrop blur on major content surfaces;
- pill-shaped primary button;
- generic green online dot;
- decorative 3D graphic;
- sci-fi graph effect;
- excessive badges;
- three or more nested cards for one information group;
- giant heading with little useful content;
- full-page spinner replacing structure;
- automatic scrolling that steals reading position.

---

# 51. Acceptance standard

A design is approved when it is:

**clear → familiar → restrained → responsive → accessible → precise → quiet → polished.**

It is not approved merely because it is “beautiful”.
