# TARS

**The Autonomous Sovereign Second Brain for Early-Stage Startups**

> A private, collaborative operating system for founders, product, sales, operations, and engineering with deterministic architectural memory.

---

### Overview

Early-stage startups operate at extreme velocity, leading to tribal knowledge decay, documentation abandonment, and customer commitment amnesia. At the same time, sensitive startup assets—unredacted runway bank balances, cap tables, investor term sheets, and client call recordings under strict NDAs—cannot safely be uploaded to public cloud AI tools.

**TARS** solves this by running centrally on a startup’s private local cloud host (`http://tars.local:7777`) or workstation with **zero cloud data egress** ($E_{\text{net}} = 0.00\text{ KB}$). Team members access it over local office Wi-Fi with zero client setup.

---

### Core Workspaces

- **Universal Knowledge Base**: Multi-department document search with line-level source citations.
- **Client Call Studio**: On-device Whisper audio transcription extracting pain points, feature requests, and verbal commitments into actionable roadmap items.
- **Fast Onboarding Hub**: Role-specific flight plans and interactive Socratic mentor sandboxes.
- **Collaborative Think Tank**: Multi-channel topic discussions and shared meeting notes with an optional visual canvas.
- **Strategic Decision Registry**: Company decision ledger with contradiction sensitivity checks and counterfactual "what-if" simulations.
- **Tech & Architecture Workspace**: Codebase sentry using Tree-sitter AST queries and an embedded graph engine to enforce architectural invariants at pre-commit.
- **Unified Action Hub**: Cross-department execution checklist directly linked to source audio timestamps and decision records.

---

### Local Setup

```bash
# Clone the repository
git clone https://github.com/Arsa-1109/TARS.git
cd TARS

# Install dependencies
pip install -r requirements.txt

# Run the local API engine
uvicorn apps.api.main:app --host 0.0.0.0 --port 7777 --reload
```
