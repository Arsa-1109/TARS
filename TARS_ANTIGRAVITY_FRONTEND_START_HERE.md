# TARS — ANTIGRAVITY FRONTEND START HERE

**Version:** 5.0
**Status:** Frontend implementation authority
**Scope:** `apps/web/`

## 0. Read order

Read these files before changing any frontend code:

1. `TARS_ANTIGRAVITY_FRONTEND_START_HERE.md` — this file.
2. `TARS_FRONTEND_MASTER_CONTEXT.md` — product/UI behaviour and non-negotiable implementation rules.
3. `TARS_FRONTEND_DESIGN_SYSTEM.md` — visual system and interaction language. This is the visual authority.
4. `TARS_FRONTEND_IMPLEMENTATION_REFERENCE.md` — reusable component and responsive behaviour patterns.
5. `TARS_SDD.md` — system architecture and the frontend/backend boundary.
6. `PRD.md` — product requirements.
7. `4-CONTRIBUTOR-SPRINT-PLAN.md` — frontend ownership, frozen contracts, sprint boundaries and demo sequence.
8. `TARS_100_Problems_Master_Report.md` — deep engineering context, primarily for Workspace 6.
9. `ASYNC26-Problem-Statement(2).pdf` — official Sovereign AI challenge context.
10. `TARS.pdf` — product narrative and intended demonstration.
11. `TARS_FRONTEND_PATTERN_CATALOG.md` — audited, reusable UI/UX interaction patterns.
12. `TARS_FRONTEND_SCREEN_BLUEPRINTS.md` — screen-by-screen composition rules and responsive transformations.
13. `TARS_FRONTEND_ACCEPTANCE_CHECKLIST.md` — release gate for visual, interaction and responsive quality.

The repository itself is authoritative for existing implementation and API reality once the frontend is connected to the live backend.

## 1. What you are building

Build the complete TARS web frontend: one coherent professional application exposing TARS's organisational memory, reasoning and action capabilities through six workspaces and the Unified Action Hub.

TARS must feel like a calm, mature, high-quality professional product. It must not visually announce itself as “AI”. Its intelligence should be evident from the quality of relationships, provenance, explanations, decisions and actions.

The frontend does not own reasoning, graph traversal, AST analysis, transcription, simulation mathematics or invariant evaluation. It renders evidence and makes those capabilities understandable and actionable.

## 2. Hard visual direction

The product must follow the **principles** of Apple's Human Interface Guidelines: purpose, agency, responsibility, familiarity, flexibility, simplicity, craft and restrained delight.

Use Apple-quality discipline; do not copy proprietary Apple screens, logos or visual assets.

### Forbidden visual language

- No purple, violet, indigo or cyan as a dominant brand palette.
- No “AI blue/purple” gradients.
- No neon colours.
- No glow, bloom, holographic effects or luminous borders.
- No sci-fi grids, HUDs, cockpit panels, spaceship/station/engine aesthetics.
- No giant floating dashboard cards.
- No card-soup: do not nest containers without information hierarchy.
- No excessive glassmorphism.
- No permanent green “LIVE”, “ONLINE” or “CONNECTED” dots.
- No generic AI sparkle, robot, brain or magic icons.
- No gradient text.
- No animated background noise.
- No decorative 3D graphics when they do not improve a task.
- No pill-shaped action buttons. `rounded-full` is not a generic control treatment.
- No giant all-caps labels scattered through the interface.
- No visual emphasis for the sake of “wow”.

### What creates luxury

Luxury must come from:

- proportion;
- typography;
- whitespace with purpose;
- alignment;
- micro-contrast;
- carefully tuned borders;
- restrained materials;
- predictable interaction;
- excellent responsive behaviour;
- precise states.

## 3. Architecture rules

Frontend is owned by `apps/web/`.

Build from reusable primitives rather than copying page-specific JSX.

Use a mock/live service boundary. Mock mode is a development aid, not a substitute for real functionality.

Do not change backend contracts to make the UI easier.

Do not fabricate backend results.

Do not invent API routes when the repository or backend OpenAPI/route definitions are available.

Do not make the frontend responsible for AI reasoning. The frontend may format or compare already-structured values, but it must not invent findings, confidence, graph relationships, simulations or decisions.

## 4. Product information architecture

The six workspaces are distinct views over one shared company memory:

1. **Knowledge** — retrieve company knowledge with provenance.
2. **Calls** — transcribe calls and turn them into structured commitments and requests.
3. **Onboarding** — guide people through company knowledge and role-specific learning.
4. **Think Tank** — discuss topics and bring historical context into team reasoning.
5. **Decisions** — maintain decisions, contradiction awareness and what-if analysis.
6. **Architecture** — inspect code relationships and enforce architectural invariants.

The **Action Hub** is cross-workspace infrastructure, not a seventh workspace. It is reachable globally.

## 5. Demo-critical flow

The frontend must make this chain feel like one product:

`Client call → commitment → action → decision → simulation → architectural invariant → blocked change → explanation → ADR`

Never reduce the demo to disconnected screens.

## 6. Desktop / laptop / mobile

- Desktop: 1280px+ — full six-item workspace navigation and multi-column layouts.
- Laptop/tablet: 768–1279px — compressed chrome, selective columns, disclosure menus where needed.
- Mobile: <768px — single-column task surfaces, bottom navigation, sheets instead of wide drawers, 44px minimum touch targets, safe-area handling.

Do not merely shrink desktop layouts. Re-compose them for touch and narrow width.

## 7. Default surface philosophy

Default to light mode unless the existing TARS repository explicitly establishes otherwise. Dark mode must be first-class but equally restrained.

Light canvas: warm-neutral Apple-like system gray.

Dark canvas: black / system-dark neutrals.

Primary action: high-contrast neutral black in light mode, white in dark mode.

Steel is the only general-purpose accent and is used sparingly for selection, links and informational emphasis. Semantic colours are reserved for semantic states.

## 8. Finished means

A screen is not finished because it looks good in a static screenshot.

It is finished only when:

- the hierarchy is immediately understandable;
- every primary action has a clear result;
- loading, empty, restricted and error states exist;
- focus and keyboard behaviour are correct;
- mobile behaviour is intentionally composed;
- no important content is hidden by fixed chrome;
- the design uses tokens, not one-off styling;
- the page has no unnecessary decoration;
- the screen still looks premium with effects removed;
- live data cannot cause layout jumps;
- visual language is shared with the other workspaces.

## 9. First implementation pass

Build in this order:

1. App shell and responsive navigation.
2. Token system and base primitives.
3. Knowledge workspace.
4. Calls workspace.
5. Decisions workspace.
6. Architecture workspace.
7. Think Tank.
8. Onboarding.
9. Action Hub.
10. Cross-workspace state, loading, error and provenance polish.
11. Mobile/composition pass.
12. Accessibility and interaction QA.

Do not spend early time on decorative hero art, 3D scenes or unnecessary visual effects.
