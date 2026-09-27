# TARS — ANTIGRAVITY FRONTEND CONTEXT MANIFEST

**Version:** 5.0
**Scope:** `apps/web/`

This is the complete frontend context pack for an AI coding agent.

---

# 1. Recommended upload set

## Frontend authority set

Upload these together:

1. `TARS_ANTIGRAVITY_FRONTEND_START_HERE.md`
2. `TARS_FRONTEND_MASTER_CONTEXT.md`
3. `TARS_FRONTEND_DESIGN_SYSTEM.md`
4. `TARS_FRONTEND_IMPLEMENTATION_REFERENCE.md`
5. `TARS_FRONTEND_PATTERN_CATALOG.md`
6. `TARS_FRONTEND_SCREEN_BLUEPRINTS.md`
7. `TARS_FRONTEND_ACCEPTANCE_CHECKLIST.md`
8. `TARS_SDD.md`

## Product/system source set

Also provide the original TARS source specifications:

9. `PRD.md`
10. `4-CONTRIBUTOR-SPRINT-PLAN.md`
11. `TARS_100_Problems_Master_Report.md`
12. `ASYNC26-Problem-Statement(2).pdf`
13. `TARS.pdf`

And provide the actual TARS repository so the agent can inspect the real implementation and backend routes.

---

# 2. Authority order

For existing code and actual API behaviour:

```text
actual repository / current backend
        ↓
frozen API contracts
        ↓
PRD.md
        ↓
TARS_FRONTEND_MASTER_CONTEXT.md
        ↓
TARS_FRONTEND_DESIGN_SYSTEM.md
        ↓
TARS_FRONTEND_SCREEN_BLUEPRINTS.md
        ↓
TARS_FRONTEND_PATTERN_CATALOG.md
        ↓
TARS_FRONTEND_IMPLEMENTATION_REFERENCE.md
        ↓
TARS_FRONTEND_ACCEPTANCE_CHECKLIST.md
        ↓
TARS_SDD.md
        ↓
sprint plan / deck / broader engineering taxonomy
```

If the repository contradicts a documentation assumption, prefer the actual repository and update the frontend implementation accordingly without changing backend contracts from the frontend.

If two documentation files disagree and the repository does not resolve the conflict, preserve the uncertainty rather than inventing a fact.

---

# 3. What the new frontend documents add

```text
MASTER CONTEXT
    product meaning + frontend contract

DESIGN SYSTEM
    visual language + design tokens + Apple-aligned principles

IMPLEMENTATION REFERENCE
    component anatomy + responsive engineering behaviour

PATTERN CATALOG
    reusable interaction patterns extracted from the audited reference implementation

SCREEN BLUEPRINTS
    concrete composition of every TARS workspace

ACCEPTANCE CHECKLIST
    self-review gate before a screen is considered complete

SDD
    system architecture and frontend/backend boundaries
```

---

# 4. Design authority

TARS must look:

**quiet, premium, mature, precise, calm, editorial, trustworthy and information-first.**

It must not look:

**neon, futuristic, holographic, cyberpunk, space-themed, dashboard-heavy, glossy, AI-sloppy or visually loud.**

The reference implementation supplies reusable interaction mechanics and responsive patterns. TARS uses those mechanics with its own neutral, restrained visual system.

---

# 5. Non-negotiable frontend outcomes

- one coherent product, not six mini-apps;
- six workspaces with distinct information architecture;
- global Action Hub;
- desktop and laptop first-class;
- mobile deliberately re-composed;
- provenance visible where evidence exists;
- no decorative AI identity;
- no generic green live/online indicators;
- no dominant purple/violet/cyan palette;
- no spaceship/control-room aesthetic;
- no invented backend data;
- no visual feature added without a product reason.
