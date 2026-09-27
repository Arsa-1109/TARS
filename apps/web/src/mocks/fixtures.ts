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
    rule_name: "External HTTP calls inside database transactions",
    violating_file: "src/payments/service.py",
    line_number: 84,
    observed_code: "async with db.transaction():\n    order = await create_order(db, payload)\n    # BREACH: External HTTP call inside transaction\n    charge = await stripe_client.charges.create(amount=order.total)\n    await mark_paid(db, order.id, charge.id)",
    rationale: "Holding a database transaction open while awaiting external network I/O exhausts database connection pools during downstream latency spikes. This is the exact pattern that triggered major Shopify and GitHub outages.",
    adr_ref: "ADR-017-outbox-pattern.md",
    suggested_refactor: "Commit order in PENDING state within local transaction, then dispatch payment via background worker or post-commit Outbox event."
  },
  {
    is_breached: false,
    rule_id: "INV-021",
    rule_name: "Parameter count mismatch between schema & dispatcher",
    violating_file: "src/api/dispatcher.py",
    line_number: 42,
    observed_code: "def dispatch_event(event_type: str, payload: dict, trace_id: str) -> None:\n    handler = REGISTRY.get(event_type)\n    return handler(payload, trace_id)",
    rationale: "Prevents runtime TypeError crashes caused by schema updates adding or removing parameters without updating internal dispatch callers (CrowdStrike kernel dispatch failure pattern).",
    adr_ref: "ADR-021-strict-dispatch-validation.md",
    suggested_refactor: "All parameters match schema contract (3/3 parameters aligned)."
  },
  {
    is_breached: false,
    rule_id: "INV-014",
    rule_name: "Dead code / dormant flag resuscitation",
    violating_file: ".tars/flags.yaml",
    line_number: 16,
    observed_code: "flags:\n  enable_vector_cache: true\n  enable_local_whisper: true\n  # legacy_cloud_s3_sync: PRUNED_2026_08",
    rationale: "Blocks commits reviving unreferenced legacy flags or deprecated code paths that could trigger dormant logic in production (Knight Capital Group $440M outage pattern).",
    adr_ref: "ADR-014-flag-lifecycle-governance.md",
    suggested_refactor: "Flag registry is healthy. No dormant flags resurrected."
  },
  {
    is_breached: false,
    rule_id: "INV-008",
    rule_name: "Plaintext password, token, or secret logging",
    violating_file: "src/auth/jwt.py",
    line_number: 29,
    observed_code: "logger.info('User authenticated successfully', extra={'user_id': user.id})",
    rationale: "Scans AST Call nodes invoking logger.* and print() to ensure JWT tokens, passwords, and authorization headers are never written to disk logs (Twitter / X token logging pattern).",
    adr_ref: "ADR-008-redacted-telemetry.md",
    suggested_refactor: "Zero sensitive token references detected in logging statements."
  }
];

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
