import {
  SearchResponse,
  VoiceToSpecResponse,
  DecisionItem,
  ContradictionCheckResponse,
  SimulationResponse,
  InvariantCheckResult,
  ActionItemDTO,
} from '../types/contracts';

export const MOCK_SEARCH_RESULTS: Record<string, SearchResponse> = {
  default: {
    query: "What is our policy on enterprise customisations?",
    answer: "Company policy explicitly restricts bespoke enterprise customisations prior to Q4 in order to protect core roadmap velocity and preserve cash runway. Strategic Decision #14 states that all clients must consume the standard self-serve API unless an explicit executive waiver is approved by both the CEO and Lead Architect.",
    citations: [
      {
        doc_id: "DOC-DEC-14",
        doc_title: "Decision #14: Enterprise Customisation Boundaries",
        page_number: 1,
        snippet: "To prevent fragmenting our 4-person engineering team, we adopt a strict Zero Enterprise Customisations rule before Q4 2026. All client integrations must use standard public REST/GraphQL endpoints.",
      },
      {
        doc_id: "DOC-FIN-2026",
        doc_title: "Q3 Runway & Burn Model.xlsx",
        page_number: 3,
        snippet: "Allocating more than 1 developer to bespoke client branches drops remaining runway from 11.4 months to 9.6 months due to delayed multi-tenant self-serve product launch.",
      }
    ],
    latency_ms: 142.6,
  },
  saml: {
    query: "SAML SSO requirements and client commitments",
    answer: "During the recent enterprise client discovery call (Call #ACME-2026), Acme Corp indicated that custom on-premise SAML SSO is an absolute prerequisite to close their $80,000 annual contract by May 1st. However, this directly conflicts with Decision #14.",
    citations: [
      {
        doc_id: "CALL-ACME-01",
        doc_title: "Client Call: Acme Corp Enterprise Discovery",
        page_number: 1,
        snippet: "John (VP Eng, Acme): 'We cannot clear Infosec without custom SAML 2.0 and Okta integration deployed on our private VPC by May 1st. It is a hard requirement for the $80k contract.'",
      },
      {
        doc_id: "DOC-SEC-04",
        doc_title: "Enterprise Identity & Auth Architecture ADR-009",
        page_number: 2,
        snippet: "Current auth pipeline relies on local Argon2id sessions with lightweight API key exchange. Full SAML 2.0 SP metadata parser is scheduled for v2.2.",
      }
    ],
    latency_ms: 98.4,
  }
};

export const MOCK_CALLS: VoiceToSpecResponse[] = [
  {
    call_id: "CALL-ACME-01",
    client_name: "Acme Corp (Enterprise Expansion)",
    sentiment: "URGENT",
    audio_duration_seconds: 248.5,
    recorded_at: "2026-09-24 16:30 IST",
    summary: "Discovery call with VP of Engineering Johnathan Vance. Acme Corp is evaluating TARS for 45 developers across their distributed infrastructure. They are prepared to sign an $80k annual agreement contingent on on-premise deployment and custom SAML SSO delivered by May 1st.",
    pain_points: [
      "Current engineering amnesia causes 12 hours/week wasted context-switching between remote teams.",
      "Strict defense contractor NDAs legally forbid sending any internal code or call recordings to cloud AI providers.",
      "Existing Confluence wiki is stale, resulting in repetitive founder interruption."
    ],
    feature_requests: [
      "Custom SAML 2.0 / Okta enterprise identity provider federation.",
      "Self-contained VPC / air-gapped deployment container.",
      "Custom export webhook triggering internal compliance logging."
    ],
    commitments: [
      "Deliver technical feasibility assessment for on-prem SAML SSO by Friday.",
      "Provide unredacted benchmark of Tree-sitter AST diff parser latency (<50ms).",
      "Draft enterprise SLA agreement with zero-cloud-egress mathematical guarantee."
    ],
    transcript: [
      {
        speaker: "Aryan (Founder, TARS)",
        timestamp: "00:15",
        seconds: 15,
        text: "Thanks for jumping on, John. We understand Acme has strict data sovereignty requirements given your defense and healthcare client portfolio."
      },
      {
        speaker: "John (VP Eng, Acme)",
        timestamp: "00:42",
        seconds: 42,
        text: "Exactly. We cannot allow a single byte of telemetry or code to leave our private VPC. If an AI tool talks to OpenAI or Anthropic, our compliance officer vetoes it instantly."
      },
      {
        speaker: "Aryan (Founder, TARS)",
        timestamp: "01:18",
        seconds: 78,
        text: "TARS runs 100% locally on your own silicon with zero egress. Even if you physically disconnect the WAN ethernet cable, all retrieval, AST verification, and Whisper transcription continue unimpeded."
      },
      {
        speaker: "John (VP Eng, Acme)",
        timestamp: "01:55",
        seconds: 115,
        text: "That is exactly what we need. But here is the hard constraint: our infosec mandate requires custom SAML 2.0 SSO connected to our self-hosted Okta instance by May 1st. If you can commit to that, we will sign the $80,000 contract."
      },
      {
        speaker: "Aryan (Founder, TARS)",
        timestamp: "02:30",
        seconds: 150,
        text: "Understood. I will run this through our strategic impact simulation to see how reallocating 2 engineers affects our delivery schedule, and get back to you by Friday."
      },
      {
        speaker: "John (VP Eng, Acme)",
        timestamp: "03:10",
        seconds: 190,
        text: "Fair enough. Also please ensure you include the AST diff benchmarks showing under 50ms pre-commit check times."
      }
    ]
  },
  {
    call_id: "CALL-NEXUS-02",
    client_name: "Nexus Labs (Seed FinTech)",
    sentiment: "POSITIVE",
    audio_duration_seconds: 182.0,
    recorded_at: "2026-09-22 11:00 IST",
    summary: "Follow-up onboarding call with Nexus Labs CTO Sarah Chen. Their 6-person engineering team integrated the TARS pre-commit hook. They reported zero accidental secret leaks and caught two transaction-wrapped Stripe calls before pushing.",
    pain_points: [
      "Junior developers frequently wrapping network I/O inside SQL transactions.",
      "Founders spending 40% of their workday answering architecture questions."
    ],
    feature_requests: [
      "Support for custom TypeScript invariant AST queries in .tars/invariants.yaml.",
      "Slack notifications for living MADRs generated on git block."
    ],
    commitments: [
      "Ship TypeScript AST query rule examples in Workspace 6 documentation.",
      "Provide sample .tars/invariants.yaml configuration for Postgres row-level locks."
    ],
    transcript: [
      {
        speaker: "Sarah (CTO, Nexus)",
        timestamp: "00:20",
        seconds: 20,
        text: "The pre-commit hook caught an INV-017 violation on Wednesday when a new contractor wrapped a Stripe webhook inside a database transaction. Prevented a massive thread pool exhaustion."
      },
      {
        speaker: "Mir (Lead, TARS)",
        timestamp: "00:55",
        seconds: 55,
        text: "That is the exact Shopify outage pattern TARS is engineered to eliminate deterministically."
      }
    ]
  }
];

export const MOCK_DECISIONS: DecisionItem[] = [
  {
    id: "DEC-14",
    title: "Zero Enterprise Customisations Prior to Q4",
    category: "STRATEGY",
    context: "Several mid-market leads requested bespoke API wrappers and custom tenant pipelines. With only 4 full-time developers and 11 months of runway, custom forks will create fatal maintenance overhead.",
    chosen_option: "Strict policy: No custom branches or client-specific engineering before Q4 2026. All clients must use unified core platform APIs.",
    timestamp: Date.now() - 10 * 86400000,
    clearance: "ALL_TEAM",
    lifecycle_status: "ACTIVE",
    drivers: [
      "Preserve 11+ months cash runway",
      "Avoid Bus Factor = 1 divergence across custom branches",
      "Prioritise self-serve multi-tenant reliability"
    ],
    options_considered: [
      "Option A: Hire 2 contract developers dedicated to enterprise customisations (Rejected: cash burn)",
      "Option B: Allow custom forks with 200% price premium (Rejected: distraction from core MVP)",
      "Option C: Absolute freeze on customisations until Q4 (Selected)"
    ]
  },
  {
    id: "DEC-12",
    title: "Hexagonal Ports & Adapters Architecture for Core Domain",
    category: "ENGINEERING",
    context: "Prevent tight coupling between business logic and infrastructure drivers (database ORM, Whisper models, Tree-sitter binaries).",
    chosen_option: "Domain entities in src/core/ must never import from src/adapters/ or src/infrastructure/. All outbound side-effects must be mediated by abstract ports.",
    timestamp: Date.now() - 24 * 86400000,
    clearance: "ALL_TEAM",
    lifecycle_status: "ACTIVE",
    drivers: [
      "Enable air-gapped test harnesses without live SQLite or Whisper daemons",
      "Enforce deterministic AST boundary verification in <45ms"
    ]
  },
  {
    id: "DEC-08",
    title: "100% Sovereign Local-First Privacy Model",
    category: "SECURITY",
    context: "Startups handle hyper-sensitive IP (cap tables, unredacted payroll, client NDAs, proprietary algorithms). Public cloud AI poses compliance and IP leakage hazards.",
    chosen_option: "Zero cloud GPU dependencies. All models (Qwen 8B, Whisper, BGE-small) run locally on startup host. External network calls blocked at socket level (0.00 KB egress).",
    timestamp: Date.now() - 40 * 86400000,
    clearance: "ALL_TEAM",
    lifecycle_status: "ACTIVE"
  },
  {
    id: "DEC-05",
    title: "Legacy Cloud Hybrid Sync (Superseded)",
    category: "STRATEGY",
    context: "Initial exploration considered syncing encrypted metadata to AWS S3 for cross-office backups.",
    chosen_option: "Sync encrypted SQLite snapshots to private S3 bucket once daily.",
    timestamp: Date.now() - 75 * 86400000,
    clearance: "ALL_TEAM",
    lifecycle_status: "SUPERSEDED",
    superseded_by: "DEC-08"
  }
];

export const MOCK_CONTRADICTIONS: Record<string, ContradictionCheckResponse> = {
  saml: {
    has_conflict: true,
    severity: "BALANCED",
    conflicting_decision_id: "DEC-14",
    explanation: "Proposal to build custom SAML 2.0 integration for Acme Corp directly reverses Decision #14 ('Zero Enterprise Customisations Prior to Q4') logged 10 days ago. Committing 2 engineers to this branch will delay core launch by ~3.5 weeks and reduce cash runway."
  },
  clean: {
    has_conflict: false,
    severity: "BALANCED",
    conflicting_decision_id: null,
    explanation: null
  }
};

export const MOCK_SIMULATION_RESULT: SimulationResponse = {
  runway_impact_months: -1.8,
  delivery_delay_weeks: 3.5,
  affected_client_promises: [
    "Nexus Labs: TypeScript AST Query Rule Engine (Promised Oct 15)",
    "Beta Cohort: Self-serve Knowledge Graph Ingestion (Promised Nov 1)"
  ],
  affected_code_modules: [
    "apps/api/core/gateway.py (Session & auth middleware overhaul)",
    "apps/api/cortex/invariants.py (Bypass risk for enterprise tenant checks)",
    "apps/web/src/components/layout/AppShell.tsx (SAML handshake redirect flow)"
  ],
  executive_synthesis: "Reallocating 2 of 4 developers to build custom SAML SSO for Acme Corp will secure $80k ARR (+1.2 months revenue runway), but introduces a 3.5-week net delivery delay across core multi-tenant launch milestones. Net cash runway drops from 11.4 to 9.6 months during initial engineering cycle. Recommendation: Counter-offer with standardized OIDC/OAuth2 connector or request 50% upfront payment ($40,000) to sponsor contract engineering capacity."
};

export const MOCK_INVARIANTS: InvariantCheckResult[] = [
  {
    is_breached: true,
    rule_id: "INV-017",
    rule_name: "HTTP Call Inside Database Transaction Block",
    violating_file: "src/payments/service.py",
    line_number: 84,
    observed_code: "async with db.transaction():\n    order = await create_order(db, payload)\n    # BREACH: External HTTP call inside transaction\n    charge = await stripe_client.charges.create(amount=order.total)\n    await mark_paid(db, order.id, charge.id)",
    refactored_code: "# REFACTORED: Outbox pattern applied\nasync with db.transaction():\n    order = await create_order(db, payload)\n    await outbox.publish('order.created', order.id)\n# Stripe dispatch executed asynchronously post-commit",
    rationale: "Holding a database transaction open while awaiting external network I/O exhausts database connection pools during downstream latency spikes. This is the exact pattern that triggered major Shopify and GitHub outages.",
    adr_ref: "docs/adr/ADR-017-outbox-pattern.md",
    suggested_refactor: "Use the Transactional Outbox Pattern: persist the outbound event to an outbox table within the transaction, and dispatch the external HTTP call in a background worker.",
    category: "database/concurrency",
    severity: "CRITICAL",
    target_files: ["**/*.py", "**/*.ts", "**/*.js"]
  },
  {
    is_breached: false,
    rule_id: "INV-021",
    rule_name: "Parameter Count Mismatch in Dynamic Dispatch / Interpreter",
    violating_file: "apps/api/core/dispatcher.py",
    line_number: 42,
    observed_code: "def dispatch_event(event_type: str, payload: dict, trace_id: str) -> None:\n    handler = REGISTRY.get(event_type)\n    # Call signature matches declared schema (3 parameters)\n    return handler(event_type, payload, trace_id)",
    refactored_code: "def dispatch_event(event_type: str, payload: dict, trace_id: str) -> None:\n    handler = REGISTRY.get(event_type)\n    # REFACTORED: Exact schema signature match (3/3 parameters)\n    return handler(event_type, payload, trace_id)",
    rationale: "Dynamic dispatch or rule evaluation where callers supply fewer or more arguments than declared in the schema triggers out-of-bounds evaluation or unhandled TypeError crashes in production interpreters (CrowdStrike channel 291 outage pattern).",
    adr_ref: "docs/adr/ADR-021-schema-dispatch-validation.md",
    suggested_refactor: "Assert exact parameter matching between schema definitions and interpreter dispatch call signatures via static type models.",
    category: "concurrency/reliability",
    severity: "CRITICAL",
    target_files: ["**/*.py", "**/*.ts", "**/*.js"]
  },
  {
    is_breached: false,
    rule_id: "INV-014",
    rule_name: "Dormant / Pruned Feature Flag Resuscitation",
    violating_file: ".tars/flags.yaml",
    line_number: 16,
    observed_code: "flags:\n  enable_vector_cache: true\n  enable_local_whisper: true\n  # legacy_cloud_s3_sync: PRUNED_2026_08",
    refactored_code: "flags:\n  enable_vector_cache: true\n  enable_local_whisper: true\n  # REFACTORED: Deprecated flag pruned from active lifecycle",
    rationale: "Re-activating or referencing deprecated/pruned feature flags executes dormant legacy paths with obsolete business logic, causing state corruption (Knight Capital $440M outage pattern).",
    adr_ref: "docs/adr/ADR-014-feature-flag-lifecycle.md",
    suggested_refactor: "Remove references to pruned flags. Verify all active flags against .tars/flags.yaml.",
    category: "architecture/reliability",
    severity: "CRITICAL",
    target_files: ["**/*.py", "**/*.ts", "**/*.js"]
  },
  {
    is_breached: false,
    rule_id: "INV-008",
    rule_name: "Plaintext Sensitive Entity / Token Logging",
    violating_file: "apps/api/core/session.py",
    line_number: 29,
    observed_code: "def log_auth_success(user, auth_token):\n    # Redacted sanitized telemetry\n    logger.info('User authenticated successfully', extra={'user_id': user.id})",
    refactored_code: "def log_auth_success(user, auth_token):\n    # REFACTORED: Token redacted and masked\n    logger.info('User auth success', extra={'user_id': user.id, 'token_hash': hash_token(auth_token)})",
    rationale: "Passing sensitive identifiers (password, secret, token, api_key, ssn, pan, card) directly into loggers exposes credentials in plain-text logs and audit trails (Twitter / X token logging pattern).",
    adr_ref: "docs/adr/ADR-008-pii-masking-policy.md",
    suggested_refactor: "Mask sensitive fields or log only sanitized, redacted Value Objects: logger.info('auth_event', user_id=user.id, token_hash=hash(token)).",
    category: "security/compliance",
    severity: "CRITICAL",
    target_files: ["**/*.py", "**/*.ts", "**/*.js"]
  },
  {
    is_breached: false,
    rule_id: "INV-001",
    rule_name: "Presentation-to-Database Direct Coupling",
    violating_file: "apps/web/src/components/workspaces/ArchitectureWorkspace.tsx",
    line_number: 8,
    observed_code: "// Presentation boundary decoupled\nimport { api } from '../../services/client';\nconst invariants = await api.getInvariants();",
    refactored_code: "// REFACTORED: Clean API service port abstraction\nimport { api } from '../../services/client';",
    rationale: "UI presentation components or frontend routes must never directly import database clients or execute raw SQL/ORM mutations.",
    adr_ref: "docs/adr/ADR-001-hexagonal-layering.md",
    suggested_refactor: "Route requests through application service interfaces or API client adapters.",
    category: "architecture/hexagonal",
    severity: "HIGH",
    target_files: ["apps/web/**", "src/ui/**", "src/views/**"]
  },
  {
    is_breached: false,
    rule_id: "INV-004",
    rule_name: "Auth Token Storage Invariant",
    violating_file: "apps/web/src/services/auth.ts",
    line_number: 14,
    observed_code: "// Session cookies managed via HttpOnly\ndocument.cookie = `session_token=${token}; Secure; HttpOnly; SameSite=Strict`;",
    refactored_code: "// REFACTORED: HttpOnly SameSite cookie session active",
    rationale: "Tokens must remain in HttpOnly SameSite cookies to prevent XSS leakage and race conditions.",
    adr_ref: "docs/adr/ADR-004-auth-cookies.md",
    suggested_refactor: "Use setSecureCookie(res, token) or HttpOnly cookie sessions instead of window.localStorage.",
    category: "security/auth",
    severity: "HIGH",
    target_files: ["**/*.ts", "**/*.js", "**/*.tsx"]
  },
  {
    is_breached: false,
    rule_id: "INV-API01",
    rule_name: "Zero Egress Rule",
    violating_file: "apps/api/core/gateway.py",
    line_number: 55,
    observed_code: "# Sovereign local socket binding\nserver = socket.create_server(('127.0.0.1', 8000))\n# Outbound WAN egress: 0.00 KB",
    refactored_code: "# REFACTORED: Air-gapped socket verification confirmed",
    rationale: "All outbound socket connections must terminate locally to preserve sovereign air-gap isolation and prevent corporate intelligence leakage.",
    adr_ref: "docs/adr/ADR-002-zero-egress-architecture.md",
    suggested_refactor: "Block external network sockets at socket level (0.00 KB egress) and route calls exclusively to local embedded models.",
    category: "security/sovereignty",
    severity: "CRITICAL",
    target_files: ["apps/api/core/gateway.py", "**/*.py"]
  }
];

export const MOCK_PRECOMMIT_SIMULATIONS: Record<string, import('../types/contracts').PreCommitSimulationResponse> = {
  "INV-017": {
    rule_id: "INV-017",
    git_command: 'git commit -m "feat(payments): execute stripe charge"',
    execution_time_ms: 38.4,
    target_file: "src/payments/service.py:84",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking 4 staged files (285 additions, 42 deletions)...",
      "[tars-hook] BREACH DETECTED: INV-017 (HTTP Call Inside Database Transaction Block)",
      "[tars-hook] Violating AST node: CallExpression 'stripe_client.charges.create' at src/payments/service.py:84",
      "[tars-hook] Architectural Rationale: External HTTP calls inside DB transactions hold connection pool locks open.",
      "[tars-hook] ERROR: Commit blocked in 38.4ms. Transactional Outbox pattern required."
    ]
  },
  "INV-021": {
    rule_id: "INV-021",
    git_command: 'git commit -m "feat(dispatcher): update telemetry event dispatch schema"',
    execution_time_ms: 21.6,
    target_file: "apps/api/core/dispatcher.py:42",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking staged file: apps/api/core/dispatcher.py (42 additions, 8 deletions)...",
      "[tars-hook] BREACH DETECTED: INV-021 (Parameter Count Mismatch in Dynamic Dispatch / Interpreter)",
      "[tars-hook] Violating AST node: CallExpression 'handler(payload)' expects 3 parameters, caller supplied 1 at line 42",
      "[tars-hook] Architectural Rationale: Dynamic dispatch argument divergence causes production TypeError crashes.",
      "[tars-hook] ERROR: Commit blocked in 21.6ms. Assert exact parameter matching with schema contract."
    ]
  },
  "INV-014": {
    rule_id: "INV-014",
    git_command: 'git commit -m "fix(flags): re-enable legacy cloud sync feature flag"',
    execution_time_ms: 18.2,
    target_file: ".tars/flags.yaml:16",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking staged file: .tars/flags.yaml (14 additions, 2 deletions)...",
      "[tars-hook] BREACH DETECTED: INV-014 (Dormant / Pruned Feature Flag Resuscitation)",
      "[tars-hook] Violating AST node: Flag 'legacy_cloud_s3_sync' matches pruned registry at line 16",
      "[tars-hook] Architectural Rationale: Resurrecting deprecated flags executes dormant unmaintained logic.",
      "[tars-hook] ERROR: Commit blocked in 18.2ms. Pruned feature flags must remain deleted."
    ]
  },
  "INV-008": {
    rule_id: "INV-008",
    git_command: 'git commit -m "chore(auth): add debug logging to jwt verification"',
    execution_time_ms: 15.8,
    target_file: "apps/api/core/session.py:29",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking staged file: apps/api/core/session.py (18 additions, 3 deletions)...",
      "[tars-hook] BREACH DETECTED: INV-008 (Plaintext Sensitive Entity / Token Logging)",
      "[tars-hook] Violating AST node: CallExpression 'logger.info' referencing raw credential at line 29",
      "[tars-hook] Architectural Rationale: Logging authentication tokens leaks credentials into disk audit logs.",
      "[tars-hook] ERROR: Commit blocked in 15.8ms. Sensitive credentials must be masked or hashed."
    ]
  },
  "CLEAN": {
    rule_id: "CLEAN",
    git_command: 'git commit -m "refactor(architecture): enforce hexagonal invariants"',
    execution_time_ms: 24.1,
    target_file: "all staged files",
    is_breached: false,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking 6 staged files (142 additions, 89 deletions)...",
      "[tars-hook] PASS: All 7 architectural invariants satisfied.",
      "[tars-hook] Zero syntax invariant violations detected.",
      "[tars-hook] Pre-commit hook passed in 24.1ms. Clean commit allowed."
    ]
  }
};

export const MOCK_TOPOLOGY: import('../types/contracts').TopologyResponse = {
  active_rule_id: "INV-017",
  refactored: false,
  nodes: [
    { id: 'gateway', name: 'FastAPI Gateway', layer: 'Entry', x: 40, y: 70, file_path: 'apps/api/core/gateway.py', isBreached: false },
    { id: 'auth', name: 'Auth Session', layer: 'Core', x: 200, y: 30, file_path: 'apps/api/core/session.py', isBreached: false },
    { id: 'payments', name: 'Payments Service', layer: 'Core', x: 200, y: 130, file_path: 'src/payments/service.py', isBreached: true },
    { id: 'db', name: 'SQLite Connection Pool', layer: 'Data', x: 380, y: 70, file_path: 'apps/api/core/db.py', isBreached: false },
    { id: 'webhook', name: 'Outbox Dispatcher', layer: 'Event', x: 380, y: 150, file_path: 'apps/api/core/events/outbox.py', isBreached: false }
  ],
  edges: [
    { source: 'gateway', target: 'auth', x1: 140, y1: 100, x2: 200, y2: 60, isBreached: false },
    { source: 'gateway', target: 'payments', x1: 140, y1: 100, x2: 200, y2: 160, isBreached: true },
    { source: 'auth', target: 'db', x1: 300, y1: 60, x2: 380, y2: 100, isBreached: false },
    { source: 'payments', target: 'db', x1: 300, y1: 160, x2: 380, y2: 100, isBreached: true },
    { source: 'payments', target: 'webhook', x1: 300, y1: 160, x2: 380, y2: 180, isBreached: false }
  ],
  descriptions: {
    gateway: "Entrypoint routing all incoming client requests through middleware ports.",
    auth: "Centralized session and clearance verification provider.",
    payments: "Direct call to external Stripe API inside transaction boundary violates INV-017.",
    db: "SQLite connection pool locks guarded by Tree-sitter transaction AST parser.",
    webhook: "Transactional Outbox dispatcher processes outbound events asynchronously post-commit."
  }
};


export const MOCK_ACTION_ITEMS: ActionItemDTO[] = [
  {
    id: "ACT-101",
    description: "Deliver technical feasibility assessment for Acme Corp on-prem SAML SSO",
    owner: "Aryan (Founder)",
    deadline: Date.now() + 3 * 86400000,
    status: "IN_PROGRESS",
    source_type: "CALL",
    source_id: "CALL-ACME-01",
    source_offset: "01:55"
  },
  {
    id: "ACT-102",
    description: "Review Decision #14 conflict regarding Acme enterprise customization request",
    owner: "Mir Farzin (Lead)",
    deadline: Date.now() + 1 * 86400000,
    status: "OPEN",
    source_type: "DECISION",
    source_id: "DEC-14",
    source_offset: "Paragraph 2"
  },
  {
    id: "ACT-103",
    description: "Refactor INV-017 breach in src/payments/service.py using Outbox pattern",
    owner: "Engineering",
    deadline: Date.now() + 2 * 86400000,
    status: "OPEN",
    source_type: "ARCHITECTURE",
    source_id: "INV-017",
    source_offset: "line 84"
  },
  {
    id: "ACT-104",
    description: "Provide unredacted benchmark of Tree-sitter AST diff parser (<50ms)",
    owner: "Contributor 2",
    deadline: Date.now() + 4 * 86400000,
    status: "DONE",
    source_type: "CALL",
    source_id: "CALL-ACME-01",
    source_offset: "03:10"
  },
  {
    id: "ACT-105",
    description: "Finalize Day 1-3 Onboarding Flight-Plan tour for junior developers",
    owner: "Product Lead",
    deadline: Date.now() + 5 * 86400000,
    status: "OPEN",
    source_type: "CHAT",
    source_id: "#hiring-plan",
    source_offset: "Message #42"
  }
];

export const MOCK_ONBOARDING_DATA = {
  role: "ENGINEER",
  title: "Engineering Sovereign Flight-Plan",
  total_days: 14,
  current_day: 3,
  modules: [
    {
      day: 1,
      title: "Sovereignty & The Air-Gap Invariant",
      status: "COMPLETED",
      description: "Understand why TARS enforces zero cloud egress ($E_{net} = 0.00\\text{ KB}$) and how on-premise execution protects startup IP.",
      tasks: [
        "Clone local repo from office host (http://tars.local:7777)",
        "Inspect .tars/invariants.yaml and install .git/hooks/pre-commit",
        "Run airplane-mode verification script in local terminal"
      ],
      milestone_tour: {
        title: "Founding Thesis: Why Startups Die of Context Decay",
        audio_duration: "3m 45s",
        speaker: "Aryan (Founder)"
      }
    },
    {
      day: 2,
      title: "Deterministic AST Enforcement vs. Linters",
      status: "COMPLETED",
      description: "Learn how Tree-sitter parses staged Git diffs in <50ms to intercept banned patterns before commits land in main.",
      tasks: [
        "Review INV-017 (HTTP inside DB transactions) and the Outbox pattern",
        "Test local AST query runner against sample violating diffs",
        "Inspect living MADR generator output in docs/adr/"
      ]
    },
    {
      day: 3,
      title: "Kùzu Graph Reasoning & Company Memory",
      status: "CURRENT",
      description: "Explore the embedded Cypher graph model connecting decisions, customer promises, and code entities.",
      tasks: [
        "Query Kùzu for all decisions with active [:SUPERSEDES] edges",
        "Trace Call #ACME-01 commitments into the Unified Action Hub",
        "Ask the Socratic Mentor about why Decision #14 restricts enterprise customisations"
      ]
    },
    {
      day: 4,
      title: "First Compliant Pull Request",
      status: "UPCOMING",
      description: "Author and commit your first feature passing all 4 killer invariant gates.",
      tasks: [
        "Implement new API endpoint adhering to Hexagonal architecture",
        "Verify sub-50ms pre-commit hook execution",
        "Submit PR with automated executive summary"
      ]
    }
  ]
};

export const MOCK_THINKTANK_CHANNELS = [
  { id: "pricing-strategy", name: "#pricing-strategy", topic: "Evaluating Enterprise Tier Pricing & Customisation Waivers" },
  { id: "q3-roadmap", name: "#q3-roadmap", topic: "Balancing Multi-Tenant Self-Serve vs. Enterprise Requests" },
  { id: "hiring-plan", name: "#hiring-plan", topic: "Contractor vs. Full-Time Engineer allocation for Q4" }
];

export const MOCK_THINKTANK_MESSAGES: Record<string, { id: string; sender: string; time: string; text: string; isAi?: boolean; provenance?: string }[]> = {
  "pricing-strategy": [
    {
      id: "m1",
      sender: "Aryan (Founder)",
      time: "10:14",
      text: "Acme Corp offered $80,000 ARR if we deliver custom SAML SSO by May 1st. But that means pulling 2 devs off the self-serve product."
    },
    {
      id: "m2",
      sender: "Mir Farzin (Lead)",
      time: "10:18",
      text: "Decision #14 explicitly banned bespoke branches before Q4. If we fork the auth code for Acme, who maintains it when we upgrade the core token engine?"
    },
    {
      id: "m3",
      sender: "TARS (@TARS)",
      time: "10:19",
      isAi: true,
      text: "Historical Context Synthesis: Decision #14 was ratified on Sept 14 (10 days ago) specifically to prevent Bus Factor = 1 fragmentation. A what-if simulation on this proposal forecasts a 3.5-week delay to the self-serve release and a net drop in cash runway from 11.4 to 9.6 months before Acme revenue recognition.",
      provenance: "Decision #14 · Q3 Financial Model P.3 · Call #ACME-01 (01:55)"
    },
    {
      id: "m4",
      sender: "Aryan (Founder)",
      time: "10:22",
      text: "Good catch. What if we propose standard OIDC instead of custom SAML, or require a $40k non-refundable upfront milestone payment?"
    }
  ]
};
