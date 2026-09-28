import {
  SearchResponse,
  VoiceToSpecResponse,
  DecisionItem,
  ContradictionCheckResponse,
  SimulationResponse,
  InvariantCheckResult,
  ActionItemDTO,
  TopologyResponse,
  PreCommitSimulationResponse,
} from '../types/contracts';

// ============================================================================
// WORKSPACE 1: UNIVERSAL KNOWLEDGE BASE SEARCH FIXTURES
// ============================================================================

export const MOCK_SEARCH_RESULTS: Record<string, SearchResponse> = {
  default: {
    query: "What is our policy on enterprise customisations?",
    answer: "AetherFlow company policy strictly bans custom enterprise feature forks or bespoke SSO customisations prior to Q4 2026 to protect core roadmap velocity and preserve cash runway. Business Decision Record BDR-014 states that all clients must consume the standard self-serve API unless an explicit executive waiver is approved by both the CEO (Alex Vance) and CTO (Dr. Elena Rostova). With 12 FTEs and 9.0 months of runway remaining ($666,000 liquid cash at -$74,000/mo net burn), bespoke branches introduce unmaintainable code divergence.",
    citations: [
      {
        doc_id: "BDR-014",
        doc_title: "BDR-014: Zero Custom Enterprise Feature Forks or Bespoke SSO Customisations",
        page_number: 1,
        snippet: "To prevent fragmenting our 12-person engineering team, we adopt a strict Zero Enterprise Customisations rule before Q4 2026. 100% of engineering bandwidth across Liam Patel and Dr. Elena Rostova must remain dedicated to core platform stability and PRD-102 (Self-Serve Codebase Health Analytics).",
      },
      {
        doc_id: "DOC-RUNWAY-Q4",
        doc_title: "Q4 Financial Runway & Burn Model (demo_runway_q4.xlsx)",
        page_number: 1,
        snippet: "Allocating senior engineers to bespoke client branches delays the Self-Serve Analytics launch by 60 days, risking core PLG conversion while maintaining a -$74,000 monthly burn against $666,000 in treasury.",
      },
    ],
    latency_ms: 42.6,
  },
  saml: {
    query: "SAML SSO requirements and client commitments",
    answer: "During the enterprise client discovery call (Call #CALL-2026-09-22-ACME-001), Acme Corporation indicated that custom on-premise SAML 2.0 / SCIM SSO via Okta is an absolute prerequisite to close their $80,000 ARR pilot contract across 250 seats. Under Section 5.3 of the draft MSA, delivery is mandated by May 1, 2027 or Acme Corp retains 100% unilateral cancellation rights with full refund. This proposed commitment (BDR-018) directly conflicts with active policy BDR-014.",
    citations: [
      {
        doc_id: "CALL-ACME-01",
        doc_title: "Client Call: Acme Corp Enterprise Discovery (acme_nda_call_sample.vtt)",
        page_number: 1,
        snippet: "David Sterling (VP Global Tech Infra, Acme): 'We need Section 5.3 to explicitly define a hard delivery deadline of May 1st for custom SAML 2.0 and SCIM directory synchronization. If missed, Acme Corp will cancel the $80,000 ARR pilot with 100% refund.'",
      },
      {
        doc_id: "MSA-ACME-5.3",
        doc_title: "Acme Corp Master Services Agreement (MSA_Draft_AcmeCorp.docx)",
        page_number: 3,
        snippet: "Section 5.3: Mandatory on-premise SAML 2.0 / SCIM identity provisioning delivery on or before May 1, 2027. Failure to deliver triggers immediate cancellation and full refund of prepaid fees.",
      },
      {
        doc_id: "BDR-018",
        doc_title: "BDR-018: Proposed Policy Exception — Acme Corp SAML SSO",
        page_number: 1,
        snippet: "Proposal to build custom SAML SSO for Acme Corp pilot ($80,000 ARR, +$6,667 MRR), extending runway from 9.0 to 9.9 months (+28 days), conflicting directly with BDR-014.",
      },
    ],
    latency_ms: 38.4,
  },
  runway: {
    query: "What is our current cash runway and net burn?",
    answer: "As of September 1, 2026, AetherFlow holds $666,000 USD in liquid cash reserves. Contracted MRR is $82,000 USD ($984,000 ARR across 72 active customers). Gross monthly operating expenses are $156,000 USD (Payroll: $112,000/mo for 12 FTEs; Cloud/Compute: $24,000/mo; Sales/Travel: $12,000/mo; G&A: $8,000/mo), resulting in a net monthly cash burn of -$74,000 USD. Cash runway is 9.0 months, with a zero-cash date of May 28, 2027. Series A fundraising must commence in January 2027 with a 5.0 months buffer.",
    citations: [
      {
        doc_id: "FIN-SUMMARY",
        doc_title: "Q4 Financial Model: Summary_Burn Tab (demo_runway_q4.xlsx)",
        page_number: 1,
        snippet: "Liquid Cash: $666,000. Net Monthly Burn: -$74,000/month. Runway: 9.0 Months. Zero-Cash Date: May 28, 2027.",
      },
      {
        doc_id: "DECK-SEED",
        doc_title: "AetherFlow Seed Deck: Slide 8 Unit Economics (AetherFlow_Seed_Deck.pptx)",
        page_number: 8,
        snippet: "Capital Raised: $1.45M Seed led by Frontline Ventures. Target Series A Kickoff: January 2027 with 5.0 months cash reserve.",
      },
    ],
    latency_ms: 31.2,
  },
  outbox: {
    query: "Why is billing.py failing pre-commit invariant checks?",
    answer: "The Tree-sitter AST pre-commit validator intercepted a critical INV-017 breach in app/services/billing.py at line 22. An external HTTP request (requests.post) to Stripe was wrapped inside an active database transaction (with db.transaction():). Holding transaction locks during external network I/O risks SQLite connection pool exhaustion during latency spikes. The required fix is the Transactional Outbox Pattern demonstrated in billing_repaired.py.",
    citations: [
      {
        doc_id: "CODE-BILLING",
        doc_title: "app/services/billing.py (Line 22)",
        page_number: 1,
        snippet: "requests.post('https://api.stripe.com/v1/subscriptions') executed within active db.transaction() context block.",
      },
      {
        doc_id: "ADR-001",
        doc_title: "ADR-001: Local In-Process Storage Engine",
        page_number: 2,
        snippet: "Transactional Outbox Pattern mandates decoupling persistence from outbound network side-effects to preserve sub-millisecond SQLite WAL lock release.",
      },
    ],
    latency_ms: 29.5,
  },
};

// ============================================================================
// WORKSPACE 2: CLIENT CALL STUDIO FIXTURES (FASTER-WHISPER + QWEN 1.5B)
// ============================================================================

export const MOCK_CALLS: VoiceToSpecResponse[] = [
  {
    call_id: "CALL-2026-09-22-ACME-001",
    client_name: "Acme Corporation (Enterprise Expansion Pilot)",
    sentiment: "URGENT",
    audio_duration_seconds: 266.0,
    recorded_at: "2026-09-22 14:00 EDT",
    summary: "Enterprise pilot discovery call with David Sterling (VP of Global Technology Infrastructure, Acme Corp). Acme approved an $80,000 ARR pilot covering 250 engineering seats with on-premise sovereign execution. Contingent on mandatory delivery of custom SAML 2.0 / SCIM SSO by May 1, 2027 under Section 5.3 MSA, with 100% cancellation penalty if missed. Expands to 1,000 seats ($300K ARR) in Year 2.",
    pain_points: [
      "CAD blueprints and plant firmware strictly forbidden by Defense/CISO NDAs from touching public cloud LLM APIs.",
      "Corporate Security Council mandates centralized Okta SAML 2.0 / SCIM directory synchronization across 12,000 employees.",
      "Engineering context amnesia across remote sites causing 15+ hours/week wasted in repetitive architectural reviews."
    ],
    feature_requests: [
      "Custom on-premise Okta SAML 2.0 and SCIM automated role provisioning connector.",
      "Air-gapped on-premise hardware deployment package with zero outbound telemetry ($E_{net} = 0.00\\text{ KB}$).",
      "Tamper-proof compliance audit log export UI with indexed tenant and user IDs."
    ],
    commitments: [
      "Turn around executed MSA countersigned by Alex Vance with Section 5.3 May 1st SSO contingency.",
      "Dr. Elena Rostova and Liam Patel to deliver technical architecture specification for on-prem SAML gateway by Oct 5.",
      "Provide unredacted Tree-sitter AST diff benchmark report proving <50ms pre-commit check times."
    ],
    transcript: [
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead, AetherFlow)",
        timestamp: "00:01",
        seconds: 1,
        text: "Hi David, really appreciate you taking the time today. I know you've been reviewing our architecture whitepaper over the weekend."
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "00:07",
        seconds: 7,
        text: "Morning, Sarah. Yeah, our security architecture committee went through it on Friday. I have to say, the zero-egress local processing model is exactly what my CISO has been begging for."
      },
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead, AetherFlow)",
        timestamp: "00:15",
        seconds: 15,
        text: "That's fantastic to hear. Regulated manufacturing and aerospace firms simply cannot tolerate public cloud LLM data exposure."
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "00:23",
        seconds: 23,
        text: "Exactly. If our CAD blueprints or plant firmware leaked into an external model training corpus, that's an existential regulatory nightmare."
      },
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead, AetherFlow)",
        timestamp: "00:32",
        seconds: 32,
        text: "100%. Under our Sovereign Core deployment, all model weights and vector embeddings execute strictly on your on-premise hardware cluster. Not a single packet leaves the facility."
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "00:41",
        seconds: 41,
        text: "That part is approved. We're ready to sign off on the 250-seat pilot across our advanced manufacturing division, which comes out to $80,000 ARR on an annual upfront basis."
      },
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead, AetherFlow)",
        timestamp: "00:52",
        seconds: 52,
        text: "That's wonderful, David. We can provision the packages by next Tuesday. Was there anything outstanding from legal on the Master Services Agreement?"
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "01:03",
        seconds: 63,
        text: "Yes, and this is where we have to be completely transparent. There is one non-negotiable operational hurdle that our Corporate Security Council highlighted in Section 5 of the draft MSA: enterprise identity. Our corporate standard mandates Okta SAML 2.0 with SCIM automated role provisioning."
      },
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead, AetherFlow)",
        timestamp: "01:34",
        seconds: 94,
        text: "Understood. Today our sovereign engine supports local token auth and role-based access control, but our engineering team has custom SAML SSO on our technical roadmap."
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "01:46",
        seconds: 106,
        text: "Right, but for an enterprise of 12,000 people, we cannot have 250 engineers managing localized credentials. Access to proprietary institutional memory must revoke instantly through Okta."
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "02:48",
        seconds: 168,
        text: "We need Section 5.3 to explicitly define a hard delivery deadline of May 1st for custom SAML 2.0 and SCIM directory synchronization. If SAML SSO is not delivered by May 1st, Acme Corp will cancel the $80,000 ARR pilot contract."
      },
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead, AetherFlow)",
        timestamp: "03:16",
        seconds: 196,
        text: "Understood. So if we hit May 1st without production-ready SAML and SCIM, Acme Corp exercises immediate unilateral cancellation with a 100% refund of prepaid fees."
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "03:28",
        seconds: 208,
        text: "That is the exact condition. If you miss May 1st, we pull the plug. But if you hit May 1st, this expands to 1,000 seats ($300,000 ARR) in Year 2."
      },
      {
        speaker: "David Sterling (VP Global Tech Infra, Acme Corp)",
        timestamp: "04:10",
        seconds: 250,
        text: "As soon as Alex countersigns the revised Section 5.3 with the May 1st SSO milestone contingency, our finance department will wire the $80,000 upfront payment."
      }
    ]
  },
  {
    call_id: "CALL-2026-09-18-DEBRIEF-003",
    client_name: "PayVanguard Fintech (Lost Deal Debrief)",
    sentiment: "NEGATIVE",
    audio_duration_seconds: 84.0,
    recorded_at: "2026-09-18 11:00 EDT",
    summary: "Post-mortem debrief between Sarah Jenkins (Sales) and Marcus Chen (Product) on $48,000 ARR lost opportunity with PayVanguard. Lost on two items: lack of indexed foreign keys on audit_log table preventing compliance export UI, and rigid $1,499/mo tier pricing for a 14-developer team lacking token metering.",
    pain_points: [
      "SEC compliance mandates exportable, tamper-proof SOC2 audit logs with indexed tenant and user IDs.",
      "14-developer team stranded in pricing gap between $499 Starter (5 seats) and $1,499 Pro (25 seats)."
    ],
    feature_requests: [
      "B-Tree indexing on tenant_id and actor_user_id in audit_logs table (INV-014).",
      "Usage-based or hybrid seat add-on ($65/seat/month) to bridge the tier pricing cliff."
    ],
    commitments: [
      "Liam Patel to create Alembic database migration adding indices to audit_logs foreign keys (ACT-007).",
      "Marcus Chen to draft PRD for hybrid seat-tier expansion in #pricing-strategy (ACT-004)."
    ],
    transcript: [
      {
        speaker: "Marcus Chen (Head of Product)",
        timestamp: "00:01",
        seconds: 1,
        text: "Hey Sarah, thanks for hopping on. I saw the Closed-Lost update in the pipeline for PayVanguard. What happened there?"
      },
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead)",
        timestamp: "00:08",
        seconds: 8,
        text: "Hey Marcus. Yeah, it's a painful one because their engineering leads loved our Tree-sitter AST invariant engine. But we lost to a legacy cloud tool on two specific issues: SOC2 audit log table export and rigid tier pricing."
      },
      {
        speaker: "Marcus Chen (Head of Product)",
        timestamp: "00:40",
        seconds: 40,
        text: "Liam has the audit log schema built in app/models/audit_log.py, but it doesn't have an indexed foreign key yet, so we haven't exposed the compliance export UI."
      },
      {
        speaker: "Sarah Jenkins (Enterprise Sales Lead)",
        timestamp: "01:00",
        seconds: 60,
        text: "If we had a clean compliance audit export and token or hybrid seat pricing, we would have closed PayVanguard for $48,000 ARR without hesitation. Let's make sure we log this as product feedback for Q4."
      }
    ]
  },
  {
    call_id: "CALL-2026-08-28-BOARD-008",
    client_name: "Frontline Ventures (August Board Review)",
    sentiment: "NEUTRAL",
    audio_duration_seconds: 88.0,
    recorded_at: "2026-08-28 16:00 EDT",
    summary: "Monthly board check-in with Jordan Hayes (General Partner, Frontline Ventures), Alex Vance (CEO), and Dr. Elena Rostova (CTO). Cash balance at $666K with -$74K net burn and 9.0 months runway. Board issued strict guidance locking headcount against unbudgeted $14K/mo infra engineer until Acme Corp contract is signed and cash clears.",
    pain_points: [
      "9.0 months runway approaches the Seed danger zone ahead of January Series A kickoff.",
      "Heavy infrastructure strain on Liam Patel and Dr. Elena Rostova managing on-premise Docker packages."
    ],
    feature_requests: [
      "Revenue-gated hiring requisition for Senior Infrastructure Engineer ($14,000/mo).",
      "Strict burn discipline protecting 9 months of runway buffer."
    ],
    commitments: [
      "Alex Vance to lock hiring offer until Acme Corp contract is signed and cash is wired (ACT-011).",
      "Update Q4 financial model with Acme revenue sensitivity scenarios (ACT-012)."
    ],
    transcript: [
      {
        speaker: "Jordan Hayes (General Partner, Frontline Ventures)",
        timestamp: "00:01",
        seconds: 1,
        text: "Welcome everyone. Let's jump straight to the numbers. Cash balance is at $666K, burning around $74K net per month."
      },
      {
        speaker: "Alex Vance (CEO & Co-Founder)",
        timestamp: "00:13",
        seconds: 13,
        text: "Thanks Jordan. Yes, our MRR reached $82K this month, representing 14% month-over-month growth. However, our cash out date sits at late May 2027—leaving us approximately 9.0 months of runway."
      },
      {
        speaker: "Jordan Hayes (General Partner, Frontline Ventures)",
        timestamp: "00:23",
        seconds: 23,
        text: "9 months is the danger zone for a Seed-stage company. You need to start your Series A process in January when you still have 5 months of buffer. You cannot afford any uncontrolled burn expansion."
      },
      {
        speaker: "Dr. Elena Rostova (CTO & Co-Founder)",
        timestamp: "00:35",
        seconds: 35,
        text: "Liam and I are feeling heavy pressure on infrastructure. We want to open a requisition for a Senior Infrastructure Engineer at $14,000 per month ($168K annualized)."
      },
      {
        speaker: "Jordan Hayes (General Partner, Frontline Ventures)",
        timestamp: "00:50",
        seconds: 50,
        text: "Do not extend an offer to that infrastructure engineer until the Acme Corp contract is signed and cash is in the bank. Keep your fixed burn locked down."
      },
      {
        speaker: "Alex Vance (CEO & Co-Founder)",
        timestamp: "01:10",
        seconds: 70,
        text: "Understood, Jordan. We will hold the hiring requisition until Acme Corp signs the MSA. We stay disciplined, protect our 9 months of runway, and prioritize revenue-backed hiring."
      }
    ]
  },
  {
    call_id: "CALL-2026-09-22-NEXUS-02",
    client_name: "Nexus Labs (Seed FinTech Onboarding)",
    sentiment: "POSITIVE",
    audio_duration_seconds: 182.0,
    recorded_at: "2026-09-22 11:00 EDT",
    summary: "Follow-up onboarding call with Nexus Labs CTO Sarah Chen and Dr. Elena Rostova. Their 6-person engineering team integrated the TARS pre-commit hook, successfully intercepting an INV-017 transaction-wrapped Stripe call before git push.",
    pain_points: [
      "Junior engineers wrapping external network calls inside SQLite and Postgres transactions.",
      "Architecture questions interrupting senior leads repeatedly."
    ],
    feature_requests: [
      "Custom AST invariant query templates for TypeScript in .tars/invariants.yaml.",
      "Instant living MADR generation on pre-commit blocks."
    ],
    commitments: [
      "Provide sample .tars/invariants.yaml configuration for Transactional Outbox queues.",
      "Document Tree-sitter query benchmarks showing sub-40ms execution."
    ],
    transcript: [
      {
        speaker: "Sarah Chen (CTO, Nexus Labs)",
        timestamp: "00:20",
        seconds: 20,
        text: "The pre-commit hook caught an INV-017 violation on Wednesday when a new contractor wrapped a Stripe webhook inside a database transaction. Prevented a massive thread pool exhaustion."
      },
      {
        speaker: "Dr. Elena Rostova (CTO, AetherFlow)",
        timestamp: "00:55",
        seconds: 55,
        text: "That is the exact Shopify outage pattern TARS is engineered to eliminate deterministically across developer workstations."
      }
    ]
  }
];

// ============================================================================
// WORKSPACE 5: STRATEGIC DECISION REGISTRY & CONTRADICTION ENGINE FIXTURES
// ============================================================================

export const MOCK_DECISIONS: DecisionItem[] = [
  {
    id: "BDR-014",
    title: "BDR-014: Zero Custom Enterprise Feature Forks or Bespoke SSO Customisations",
    category: "STRATEGY",
    context: "Several mid-market leads requested bespoke API wrappers and custom tenant pipelines. With only 12 full-time employees and 9.0 months of runway remaining ($666,000 cash, -$74,000/mo net burn), custom forks will create fatal maintenance overhead and derail PRD-102 (Self-Serve Analytics).",
    chosen_option: "Strict policy: No custom branches, proprietary protocol adaptations, or client-specific SSO engineering before Q4 2026. All clients must consume standard APIs.",
    timestamp: Date.now() - 16 * 86400000, // 2026-09-12
    clearance: "ALL_TEAM",
    lifecycle_status: "ACTIVE",
    drivers: [
      "Preserve 9.0 months cash runway ($666K liquid treasury)",
      "Avoid Bus Factor = 1 divergence across custom enterprise branches",
      "Prioritise self-serve multi-tenant reliability and PRD-102 PLG launch"
    ],
    options_considered: [
      "Option A: Hire 2 contract developers dedicated to enterprise customisations (Rejected: cash burn)",
      "Option B: Allow custom forks with 200% price premium (Rejected: distraction from core MVP)",
      "Option C: Absolute freeze on customisations until Q4 (Selected)"
    ]
  },
  {
    id: "BDR-018",
    title: "BDR-018: Proposed Policy Exception — Build Custom SAML/SCIM SSO for Acme Corp Pilot",
    category: "STRATEGY",
    context: "Acme Corp offered an $80,000 ARR upfront pilot across 250 engineering seats (+$6,667 MRR), but Section 5.3 of draft MSA mandates on-premise Okta SAML 2.0 / SCIM SSO by May 1, 2027 under 100% refund penalty. This directly conflicts with BDR-014.",
    chosen_option: "Pending Causal Decision Simulation: Evaluate trading 7 engineering weeks (60-day delay to PRD-102) for $80K ARR (+28 days runway) and using cash wire to unlock Senior Infrastructure Engineer hire ($14K/mo).",
    timestamp: Date.now() - 4 * 86400000, // 2026-09-24
    clearance: "EXECUTIVE_ONLY",
    lifecycle_status: "ACTIVE",
    drivers: [
      "Capture flagship Fortune 500 manufacturing reference customer",
      "Inject $80,000 ARR (+$6,667 MRR) extending runway from 9.0 to 9.9 months",
      "Unlock $300,000 ARR Year 2 enterprise expansion"
    ],
    options_considered: [
      "Option 1: Reject Acme Corp exception; uphold BDR-014 and protect PRD-102 PLG timeline",
      "Option 2: Approve exception and use $80K upfront cash to fund Senior Infrastructure Engineer ($14K/mo)"
    ]
  },
  {
    id: "ADR-001",
    title: "ADR-001: Local In-Process Storage Engine — SQLite WAL & Embedded Kùzu Graph",
    category: "ENGINEERING",
    context: "AetherFlow must run sovereign and air-gapped on developer laptops and private clusters with zero cloud GPU dependencies and zero background RAM bloat.",
    chosen_option: "Dual in-process persistence: SQLite 3 with Write-Ahead Logging (WAL) for relational transactions/outbox queues, and Kùzu Embedded Property Graph for analytical Cypher relationship traversals (<15ms).",
    timestamp: Date.now() - 250 * 86400000, // 2025-01-15
    clearance: "ALL_TEAM",
    lifecycle_status: "ACTIVE",
    drivers: [
      "Enable air-gapped execution with zero outbound network egress (0.00 KB)",
      "Eliminate JVM memory overhead (<150 MB RAM vs 1.5 GB Neo4j)",
      "Guarantee sub-millisecond in-process query latency"
    ]
  },
  {
    id: "POL-PRICING-2026",
    title: "AetherFlow Standard Commercial & Packaging Policy 2026 (v2.0)",
    category: "PRICING",
    context: "Updated commercial packaging policy establishing active tier boundaries and seat thresholds.",
    chosen_option: "Starter: $499/mo (up to 5 seats); Growth Pro: $1,499/mo (up to 25 seats); Enterprise Core: custom air-gapped deployment.",
    timestamp: Date.now() - 270 * 86400000, // 2026-01-01
    clearance: "ALL_TEAM",
    lifecycle_status: "ACTIVE",
    drivers: [
      "Predictable SaaS contracted revenue for Seed runway stability",
      "Clear seat limits driving enterprise upgrade triggers"
    ]
  },
  {
    id: "POL-PRICING-2025",
    title: "Legacy Flat SaaS Pricing 2025 (v1.0 - Superseded)",
    category: "PRICING",
    context: "Initial flat packaging model with unlimited seats and manual invoicing.",
    chosen_option: "Flat $350/mo per organization with unmetered users.",
    timestamp: Date.now() - 600 * 86400000,
    clearance: "ALL_TEAM",
    lifecycle_status: "SUPERSEDED",
    superseded_by: "POL-PRICING-2026"
  }
];

export const MOCK_CONTRADICTIONS: Record<string, ContradictionCheckResponse> = {
  saml: {
    has_conflict: true,
    severity: "BALANCED",
    conflicting_decision_id: "BDR-014",
    explanation: "Proposal to build custom SAML 2.0 / SCIM SSO for Acme Corp (BDR-018) directly violates active policy BDR-014 ('Zero Custom Enterprise Feature Forks or Bespoke SSO Customisations') ratified on 2026-09-12. Committing Liam Patel and Dr. Elena Rostova (7.0 engineering weeks) incurs a 60-day delay to PRD-102 (Self-Serve Codebase Health Analytics Dashboard) and risks multi-tenant PLG roadmap velocity."
  },
  bdr018: {
    has_conflict: true,
    severity: "BALANCED",
    conflicting_decision_id: "BDR-014",
    explanation: "Proposal to build custom SAML 2.0 / SCIM SSO for Acme Corp (BDR-018) directly violates active policy BDR-014 ('Zero Custom Enterprise Feature Forks or Bespoke SSO Customisations') ratified on 2026-09-12. Committing Liam Patel and Dr. Elena Rostova (7.0 engineering weeks) incurs a 60-day delay to PRD-102 (Self-Serve Codebase Health Analytics Dashboard) and risks multi-tenant PLG roadmap velocity."
  },
  clean: {
    has_conflict: false,
    severity: "BALANCED",
    conflicting_decision_id: null,
    explanation: null
  }
};

export const MOCK_SIMULATION_RESULT: SimulationResponse = {
  runway_impact_months: 0.9,
  delivery_delay_weeks: 8.5,
  affected_client_promises: [
    "Acme Corp: Custom on-premise SAML 2.0 & SCIM directory sync (May 1, 2027 delivery gate under Section 5.3 MSA)",
    "Starter & Pro PLG Cohort: PRD-102 Self-Serve Codebase Health Analytics Dashboard (Delayed 60 days to Q1 2027)",
    "PayVanguard Follow-up: Hybrid Seat-Tier expansion ($65/seat/month add-on)"
  ],
  affected_code_modules: [
    "app/services/billing.py (INV-017 Transactional Outbox pattern refactor)",
    "app/core/security.py (Okta & Microsoft Entra SAML 2.0 assertion parser)",
    "apps/api/core/routes.py (Multi-tenant directory provisioning endpoints)"
  ],
  executive_synthesis: "Approving BDR-018 secures $80,000 upfront ARR (+$6,667 MRR), extending cash runway from 9.0 to 9.9 months (+28 days) and unlocking a $300,000 Year 2 enterprise expansion. However, committing 7 weeks of senior backend effort delays PRD-102 by 60 days. Recommendation: Approve BDR-018 conditioned on immediately using Acme Corp's upfront $80,000 cash wire to unlock the Senior Infrastructure Engineer hire ($14,000/mo), backfilling platform engineering capacity without increasing baseline burn."
};

// ============================================================================
// WORKSPACE 6: TECH & ARCHITECTURE INVARIANTS FIXTURES
// ============================================================================

export const MOCK_INVARIANTS: InvariantCheckResult[] = [
  {
    is_breached: true,
    rule_id: "INV-017",
    rule_name: "HTTP Call Inside Database Transaction Block",
    violating_file: "app/services/billing.py",
    line_number: 22,
    observed_code: "with db.transaction():\n    cursor = db.get_connection().cursor()\n    cursor.execute('UPDATE accounts SET tier = ? WHERE id = ?', (tier, account_id))\n    # CRITICAL BREACH: Network call inside transaction holds row locks\n    response = requests.post('https://api.stripe.com/v1/subscriptions', json={'tier': tier})\n    db.commit()",
    refactored_code: "# REFACTORED: Transactional Outbox Pattern applied\nwith db.transaction():\n    cursor = db.get_connection().cursor()\n    cursor.execute('UPDATE accounts SET tier = ? WHERE id = ?', (tier, account_id))\n    cursor.execute('INSERT INTO outbox_events (type, payload) VALUES (?, ?)', ('TIER_UPGRADED', json.dumps({'tier': tier})))\n    db.commit()\n# External Stripe dispatch processed asynchronously by background worker post-commit",
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
    rule_name: "Missing Multi-Tenant Isolation Filter",
    violating_file: "app/db/repositories/users.py",
    line_number: 18,
    observed_code: "def get_user_by_email(email: str, tenant_id: str) -> Optional[UserRecord]:\n    # Compliant: WHERE tenant_id filter strictly enforced\n    cursor.execute('SELECT * FROM users WHERE email = ? AND tenant_id = ?', (email, tenant_id))\n    return cursor.fetchone()",
    refactored_code: "# REFACTORED: Multi-tenant filter strictly applied",
    rationale: "Omitting the tenant_id filter in repository queries risks cross-tenant data leakage in multi-tenant environments.",
    adr_ref: "docs/adr/ADR-021-multi-tenant-isolation.md",
    suggested_refactor: "Ensure all repository SELECT and UPDATE queries include WHERE tenant_id = :tenant_id.",
    category: "security/isolation",
    severity: "CRITICAL",
    target_files: ["**/*.py"]
  },
  {
    is_breached: false,
    rule_id: "INV-014",
    rule_name: "Unindexed Foreign Key on High-Write Table",
    violating_file: "app/models/audit_log.py",
    line_number: 14,
    observed_code: "CREATE TABLE IF NOT EXISTS audit_logs (\n    id TEXT PRIMARY KEY,\n    tenant_id TEXT NOT NULL,\n    actor_user_id TEXT NOT NULL\n);\nCREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);\nCREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_user_id);",
    refactored_code: "# REFACTORED: B-Tree indices present on all foreign keys",
    rationale: "Unindexed foreign keys on high-volume tables cause full-table table scans during joins and cascade deletes, spiking database CPU to 100%.",
    adr_ref: "docs/adr/ADR-014-index-hygiene.md",
    suggested_refactor: "Add B-Tree indices to tenant_id and actor_user_id columns on audit_logs.",
    category: "database/performance",
    severity: "MEDIUM",
    target_files: ["**/*.py", "**/*.sql"]
  },
  {
    is_breached: false,
    rule_id: "INV-008",
    rule_name: "Hardcoded Fallback Secret in os.getenv()",
    violating_file: "app/core/security.py",
    line_number: 16,
    observed_code: "def get_jwt_secret() -> str:\n    secret = os.environ.get('JWT_SECRET')\n    if not secret:\n        raise RuntimeError('JWT_SECRET environment variable is required and must not be empty')\n    return secret",
    refactored_code: "# REFACTORED: Zero fallback strings; fatal exception on missing secret",
    rationale: "Providing default fallback strings for secrets (e.g. 'dev-secret-unsafe') leads to trivial token forgery in staging or misconfigured production instances.",
    adr_ref: "docs/adr/ADR-008-secret-sanitization.md",
    suggested_refactor: "Raise a fatal runtime error if secrets are missing from the environment rather than using default strings.",
    category: "security/credentials",
    severity: "CRITICAL",
    target_files: ["**/*.py", "**/*.ts"]
  },
  {
    is_breached: false,
    rule_id: "INV-001",
    rule_name: "Presentation-to-Database Direct Coupling",
    violating_file: "apps/web/src/components/workspaces/ArchitectureWorkspace.tsx",
    line_number: 8,
    observed_code: "// Presentation boundary decoupled\nimport { api } from '../../services/client';\nconst invariants = await api.getInvariants();",
    refactored_code: "// REFACTORED: Clean API service port abstraction",
    rationale: "UI presentation components must never directly import database clients or execute raw SQL queries.",
    adr_ref: "docs/adr/ADR-001-hexagonal-layering.md",
    suggested_refactor: "Route requests through application service interfaces or API client adapters.",
    category: "architecture/hexagonal",
    severity: "HIGH",
    target_files: ["apps/web/**", "src/ui/**"]
  },
  {
    is_breached: false,
    rule_id: "INV-API01",
    rule_name: "Zero Egress Sovereign Air-Gap Rule",
    violating_file: "apps/api/core/gateway.py",
    line_number: 55,
    observed_code: "# Sovereign local socket binding\nserver = socket.create_server(('127.0.0.1', 7777))\n# Outbound WAN egress: 0.00 KB",
    refactored_code: "# REFACTORED: Air-gapped socket verification confirmed",
    rationale: "All outbound socket connections must terminate locally to preserve sovereign air-gap isolation and prevent corporate intelligence leakage.",
    adr_ref: "docs/adr/ADR-002-zero-egress-architecture.md",
    suggested_refactor: "Block external network sockets at socket level (0.00 KB egress) and route calls exclusively to local embedded models.",
    category: "security/sovereignty",
    severity: "CRITICAL",
    target_files: ["apps/api/core/gateway.py", "**/*.py"]
  }
];

export const MOCK_PRECOMMIT_SIMULATIONS: Record<string, PreCommitSimulationResponse> = {
  "INV-017": {
    rule_id: "INV-017",
    git_command: 'git commit -m "feat(billing): process stripe subscription upgrade"',
    execution_time_ms: 38.4,
    target_file: "app/services/billing.py:22",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking 1 staged file: app/services/billing.py (34 additions, 12 deletions)...",
      "[tars-hook] BREACH DETECTED: INV-017 (HTTP Call Inside Database Transaction Block)",
      "[tars-hook] Violating AST node: CallExpression 'requests.post' inside with_statement 'db.transaction()' at line 22",
      "[tars-hook] Architectural Rationale: External HTTP calls inside DB transactions hold connection pool locks open.",
      "[tars-hook] ERROR: Commit blocked in 38.4ms. Transactional Outbox pattern required."
    ]
  },
  "INV-021": {
    rule_id: "INV-021",
    git_command: 'git commit -m "feat(users): add member lookup query"',
    execution_time_ms: 21.6,
    target_file: "app/db/repositories/users.py:18",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking staged file: app/db/repositories/users.py...",
      "[tars-hook] BREACH DETECTED: INV-021 (Missing Multi-Tenant Isolation Filter)",
      "[tars-hook] Violating AST node: SQL string missing 'WHERE tenant_id = :tenant_id' at line 18",
      "[tars-hook] ERROR: Commit blocked in 21.6ms. Assert exact tenant isolation."
    ]
  },
  "INV-014": {
    rule_id: "INV-014",
    git_command: 'git commit -m "feat(audit): create audit_logs table"',
    execution_time_ms: 18.2,
    target_file: "app/models/audit_log.py:14",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking staged file: app/models/audit_log.py...",
      "[tars-hook] BREACH DETECTED: INV-014 (Unindexed Foreign Key on High-Write Table)",
      "[tars-hook] Violating AST node: Table 'audit_logs' foreign keys tenant_id, actor_user_id lack indices at line 14",
      "[tars-hook] ERROR: Commit blocked in 18.2ms. B-Tree indices required."
    ]
  },
  "INV-008": {
    rule_id: "INV-008",
    git_command: 'git commit -m "chore(auth): set default jwt secret string"',
    execution_time_ms: 15.8,
    target_file: "app/core/security.py:16",
    is_breached: true,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking staged file: app/core/security.py...",
      "[tars-hook] BREACH DETECTED: INV-008 (Hardcoded Fallback Secret in os.getenv())",
      "[tars-hook] Violating AST node: Fallback string 'aetherflow-dev-secret-unsafe' at line 16",
      "[tars-hook] ERROR: Commit blocked in 15.8ms. Secrets must raise fatal startup error if unset."
    ]
  },
  "CLEAN": {
    rule_id: "CLEAN",
    git_command: 'git commit -m "refactor(billing): apply transactional outbox pattern to billing service"',
    execution_time_ms: 24.1,
    target_file: "all staged files",
    is_breached: false,
    terminal_logs: [
      "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
      "[tars-hook] Checking 4 staged files (68 additions, 42 deletions)...",
      "[tars-hook] PASS: All 24 architectural invariants satisfied.",
      "[tars-hook] Zero syntax invariant violations detected.",
      "[tars-hook] Pre-commit hook passed in 24.1ms. Clean commit allowed."
    ]
  }
};

export const MOCK_TOPOLOGY: TopologyResponse = {
  active_rule_id: "INV-017",
  refactored: false,
  nodes: [
    { id: 'gateway', name: 'FastAPI Gateway', layer: 'Entry', x: 40, y: 70, file_path: 'apps/api/core/gateway.py', isBreached: false },
    { id: 'auth', name: 'Auth & Session Guard', layer: 'Core', x: 200, y: 30, file_path: 'apps/api/core/session.py', isBreached: false },
    { id: 'billing', name: 'Billing Service', layer: 'Core', x: 200, y: 130, file_path: 'app/services/billing.py', isBreached: true },
    { id: 'db', name: 'SQLite Connection Pool', layer: 'Data', x: 380, y: 70, file_path: 'apps/api/core/db.py', isBreached: false },
    { id: 'outbox', name: 'Outbox Event Dispatcher', layer: 'Event', x: 380, y: 150, file_path: 'app/services/billing_repaired.py', isBreached: false }
  ],
  edges: [
    { source: 'gateway', target: 'auth', x1: 140, y1: 100, x2: 200, y2: 60, isBreached: false },
    { source: 'gateway', target: 'billing', x1: 140, y1: 100, x2: 200, y2: 160, isBreached: true },
    { source: 'auth', target: 'db', x1: 300, y1: 60, x2: 380, y2: 100, isBreached: false },
    { source: 'billing', target: 'db', x1: 300, y1: 160, x2: 380, y2: 100, isBreached: true },
    { source: 'billing', target: 'outbox', x1: 300, y1: 160, x2: 380, y2: 180, isBreached: false }
  ],
  descriptions: {
    gateway: "Entrypoint routing all incoming requests through local loopback ports.",
    auth: "Verifies session and clearance without leaking telemetry ($E_{net} = 0.00 KB).",
    billing: "Direct external Stripe API call inside transaction block breaches INV-017.",
    db: "SQLite WAL connection pool locks guarded by Tree-sitter AST parser.",
    outbox: "Transactional Outbox dispatcher processes outbound events asynchronously post-commit."
  }
};

// ============================================================================
// CENTRAL FEATURE: UNIFIED ACTION HUB FIXTURES (ACT-001 THROUGH ACT-015)
// ============================================================================

export const MOCK_ACTION_ITEMS: ActionItemDTO[] = [
  {
    id: "ACT-001",
    title: "Resolve BDR-014 vs BDR-018 SAML SSO Exception for Acme Corp",
    description: "Executive review required to decide whether to formally approve an exception to BDR-014 (no custom enterprise features) in order to secure the $80,000 ARR Acme Corp pilot contract.",
    owner: "Alex Vance",
    department: "Executive",
    priority: "HIGH",
    status: "OPEN",
    deadline: new Date("2026-09-28").getTime(),
    source_type: "DECISION",
    source_id: "BDR-018",
    source_offset: "Line 25"
  },
  {
    id: "ACT-002",
    title: "Schedule SAML 2.0 / SCIM Architecture Specification Session",
    description: "Dr. Elena Rostova and Liam Patel to draft technical design contract for Okta and Microsoft Entra ID on-premise directory synchronization to meet May 1st delivery milestone.",
    owner: "Dr. Elena Rostova",
    department: "Engineering",
    priority: "HIGH",
    status: "OPEN",
    deadline: new Date("2026-10-05").getTime(),
    source_type: "CALL",
    source_id: "CALL-2026-09-22-ACME-001",
    source_offset: "03:16"
  },
  {
    id: "ACT-003",
    title: "Turn Around Countersigned Acme Corp MSA with Section 5.3 Contingency",
    description: "Deliver final executed copy of Master Services Agreement (AF-ACM-2026-09-ENT-004) containing the May 1st SSO milestone contingency clause to David Sterling.",
    owner: "Sarah Jenkins",
    department: "Sales",
    priority: "HIGH",
    status: "IN_PROGRESS",
    deadline: new Date("2026-09-29").getTime(),
    source_type: "CALL",
    source_id: "CALL-2026-09-22-ACME-001",
    source_offset: "04:18"
  },
  {
    id: "ACT-004",
    title: "Draft PRD for Hybrid Seat-Tier Expansion ($65/seat/month)",
    description: "Formalize the middle-tier commercial model agreed in #pricing-strategy to prevent SMB customer churn (e.g. PayVanguard fintech lost deal).",
    owner: "Marcus Chen",
    department: "Product",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    deadline: new Date("2026-10-02").getTime(),
    source_type: "CHAT",
    source_id: "#pricing-strategy",
    source_offset: "Message #42"
  },
  {
    id: "ACT-005",
    title: "Remediate INV-017 Transaction Network Leak in billing.py",
    description: "Refactor BillingService.process_subscription_upgrade() to use the Transactional Outbox Pattern, removing requests.post() from within db.transaction().",
    owner: "Liam Patel",
    department: "Engineering",
    priority: "HIGH",
    status: "OPEN",
    deadline: new Date("2026-09-30").getTime(),
    source_type: "ARCHITECTURE",
    source_id: "INV-017",
    source_offset: "Line 22"
  },
  {
    id: "ACT-006",
    title: "Fix Missing tenant_id Filter in UserRepository (INV-021)",
    description: "Add mandatory tenant_id parameter and WHERE clause to get_user_by_email() and list_all_active_members() to guarantee multi-tenant data isolation.",
    owner: "Liam Patel",
    department: "Engineering",
    priority: "HIGH",
    status: "OPEN",
    deadline: new Date("2026-09-30").getTime(),
    source_type: "ARCHITECTURE",
    source_id: "INV-021",
    source_offset: "Line 18"
  },
  {
    id: "ACT-007",
    title: "Add B-Tree Index to audit_logs Foreign Keys (INV-014)",
    description: "Create Alembic database migration adding indices to tenant_id and actor_user_id columns on audit_logs table to resolve compliance export CPU spikes.",
    owner: "Liam Patel",
    department: "Engineering",
    priority: "MEDIUM",
    status: "OPEN",
    deadline: new Date("2026-10-06").getTime(),
    source_type: "CALL",
    source_id: "CALL-2026-09-18-DEBRIEF-003",
    source_offset: "00:38"
  },
  {
    id: "ACT-008",
    title: "Purge Hardcoded Fallback JWT Secret in security.py (INV-008)",
    description: "Ensure os.environ['JWT_SECRET'] raises a fatal startup error if unset, rather than falling back to the hardcoded development string.",
    owner: "Dr. Elena Rostova",
    department: "Engineering",
    priority: "HIGH",
    status: "OPEN",
    deadline: new Date("2026-09-29").getTime(),
    source_type: "ARCHITECTURE",
    source_id: "INV-008",
    source_offset: "Line 16"
  },
  {
    id: "ACT-009",
    title: "Build Frontend Violation Timeline Component (PRD-102)",
    description: "Implement interactive Lucide timeline widget in React for Self-Serve Codebase Health Analytics dashboard.",
    owner: "Chloe Dubois",
    department: "Engineering",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    deadline: new Date("2026-10-10").getTime(),
    source_type: "CHAT",
    source_id: "#q3-roadmap",
    source_offset: "Message #18"
  },
  {
    id: "ACT-010",
    title: "Complete 14-Day Engineering Onboarding Milestones",
    description: "Chloe Dubois to complete Day 7 PR merge and schedule Day 14 on-call shadowing rotation with Liam Patel.",
    owner: "Chloe Dubois",
    department: "Engineering",
    priority: "LOW",
    status: "IN_PROGRESS",
    deadline: new Date("2026-10-14").getTime(),
    source_type: "DECISION",
    source_id: "onboarding_flightplan_engineering",
    source_offset: "Day 7"
  },
  {
    id: "ACT-011",
    title: "Begin Sourcing Candidates for Senior Infrastructure Engineer",
    description: "Publish job posting and conduct initial screen calls for $14,000/mo infrastructure engineer, with final offer gated on Acme Corp payment confirmation.",
    owner: "Dr. Elena Rostova",
    department: "Engineering",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    deadline: new Date("2026-10-15").getTime(),
    source_type: "CHAT",
    source_id: "#hiring-plan",
    source_offset: "Message #42"
  },
  {
    id: "ACT-012",
    title: "Update Q4 Financial Model with Acme Corp $80K Contract Variables",
    description: "Incorporate +$6,667 MRR into ARR_Waterfall tab and refresh Scenario B runway sensitivity metrics in demo_runway_q4.xlsx.",
    owner: "Alex Vance",
    department: "Executive",
    priority: "HIGH",
    status: "DONE",
    deadline: new Date("2026-09-26").getTime(),
    source_type: "DECISION",
    source_id: "demo_runway_q4.xlsx",
    source_offset: "Summary_Burn"
  },
  {
    id: "ACT-013",
    title: "Conduct Weekly Pre-Flight Sandbox Quota Stress Test",
    description: "Verify OS Job Object terminates child processes attempting to allocate >512 MB RAM under 15-second wall clock ceilings.",
    owner: "Liam Patel",
    department: "Engineering",
    priority: "MEDIUM",
    status: "DONE",
    deadline: new Date("2026-09-26").getTime(),
    source_type: "ARCHITECTURE",
    source_id: "memory_exhaustion_test.py",
    source_offset: "Line 1"
  },
  {
    id: "ACT-014",
    title: "Build Target 50-Account Enterprise Outbound List",
    description: "Source high-compliance manufacturing and defense contractors requiring air-gapped on-premise AI deployments.",
    owner: "Sarah Jenkins",
    department: "Sales",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    deadline: new Date("2026-10-08").getTime(),
    source_type: "DECISION",
    source_id: "onboarding_flightplan_sales",
    source_offset: "Section 3"
  },
  {
    id: "ACT-015",
    title: "Prepare Series A Pitch Deck Financial Slides for January Kickoff",
    description: "Refine 18-month hiring milestones, TAM calculation, and net burn trajectory in AetherFlow_Seed_Deck.pptx ahead of partner meetings.",
    owner: "Alex Vance",
    department: "Executive",
    priority: "LOW",
    status: "OPEN",
    deadline: new Date("2026-11-15").getTime(),
    source_type: "CALL",
    source_id: "CALL-2026-08-28-BOARD-008",
    source_offset: "00:25"
  }
];

// ============================================================================
// WORKSPACE 3: FAST ONBOARDING HUB FIXTURES
// ============================================================================

export const MOCK_ONBOARDING_DATA = {
  role: "ENGINEER",
  title: "AetherFlow Sovereign Engineering Flight-Plan",
  total_days: 14,
  current_day: 3,
  modules: [
    {
      day: 1,
      title: "Sovereignty & The Air-Gap Invariant",
      status: "COMPLETED",
      description: "Understand why AetherFlow enforces zero cloud egress ($E_{net} = 0.00\\text{ KB}$) and how local on-premise execution protects startup IP.",
      tasks: [
        "Clone local repo from office host (http://127.0.0.1:7777)",
        "Inspect .tars/invariants.yaml and install local pre-commit AST guards",
        "Run airplane-mode verification script in local terminal with 0.00 KB egress"
      ],
      milestone_tour: {
        title: "Founding Thesis: Why Startups Die of Context Decay",
        audio_duration: "3m 45s",
        speaker: "Alex Vance (CEO & Co-Founder)"
      }
    },
    {
      day: 2,
      title: "Deterministic AST Enforcement vs. Linters",
      status: "COMPLETED",
      description: "Learn how Tree-sitter parses staged Git diffs in <50ms to intercept banned patterns before commits land in main.",
      tasks: [
        "Review INV-017 (HTTP inside DB transactions) and the Outbox pattern in app/services/billing.py",
        "Test local AST query runner against sample violating diffs (<38ms)",
        "Inspect living MADR generator output in docs/adr/"
      ]
    },
    {
      day: 3,
      title: "Kùzu Graph Reasoning & Company Memory",
      status: "CURRENT",
      description: "Explore the embedded Cypher graph model connecting decisions, customer promises, and code entities.",
      tasks: [
        "Query Kùzu for all decisions with active [:SUPERSEDES] edges (e.g. POL-PRICING-2026)",
        "Trace Call #CALL-2026-09-22-ACME-001 commitments into the Unified Action Hub",
        "Ask the Socratic Mentor about why BDR-014 restricts enterprise customisations"
      ]
    },
    {
      day: 4,
      title: "First Compliant Pull Request",
      status: "UPCOMING",
      description: "Author and commit your first feature passing all 24 killer invariant gates.",
      tasks: [
        "Implement Action Hub pagination controls adhering to Hexagonal architecture",
        "Verify sub-50ms pre-commit hook execution without regressions",
        "Submit PR with automated executive summary"
      ]
    },
    {
      day: 7,
      title: "Multi-Modal Ingestion Pipeline Walkthrough",
      status: "UPCOMING",
      description: "Inspect local Faster-Whisper audio transcription and Markitdown document parser.",
      tasks: [
        "Pair with Liam Patel to inspect Faster-Whisper on CPU (0.00 MB GPU VRAM)",
        "Parse sample demo_runway_q4.xlsx and MSA_Draft_AcmeCorp.docx via local Markitdown",
        "Verify structured markdown table extraction"
      ]
    },
    {
      day: 10,
      title: "Strategic Decision Registry & Contradiction Simulation",
      status: "UPCOMING",
      description: "Master the 5-step cognitive trace simulation comparing candidate decisions against active invariants.",
      tasks: [
        "Review BDR-014 vs BDR-018 semantic contradiction logic",
        "Run counterfactual simulation on Acme Corp SAML SSO exception",
        "Inspect runway sensitivity delta (+28 days vs 60-day PRD-102 delay)"
      ]
    },
    {
      day: 14,
      title: "On-Call Shadowing & Graduation",
      status: "UPCOMING",
      description: "Shadow Liam Patel during weekly production rotation and graduate flightplan.",
      tasks: [
        "Review PagerDuty alert thresholds and SQLite WAL checkpoint telemetry",
        "Verify memory headroom and OS Job Object quota ceilings",
        "Present your first feature during Friday team demos! 🎉"
      ]
    }
  ]
};

// ============================================================================
// WORKSPACE 4: COLLABORATIVE THINK TANK CHANNELS & CANVAS FIXTURES
// ============================================================================

export const MOCK_THINKTANK_CHANNELS = [
  { id: "pricing-strategy", name: "#pricing-strategy", topic: "Evaluating Enterprise Tier Pricing & Token Usage vs Fixed Tiers" },
  { id: "q3-roadmap", name: "#q3-roadmap", topic: "Q3 Priority Tension: Self-Serve Analytics (PRD-102) vs Acme Corp Custom SAML SSO" },
  { id: "hiring-plan", name: "#hiring-plan", topic: "Headcount Plan: Infrastructure Engineer Requisition vs Runway Conservation" }
];

export const MOCK_THINKTANK_MESSAGES: Record<string, Array<{ id: string; sender: string; time: string; text: string; isAi?: boolean; provenance?: string }>> = {
  "pricing-strategy": [
    {
      id: "ps-1",
      sender: "Sarah Jenkins",
      time: "10:14",
      text: "Hey team, we need to talk about our pricing tiers. We just lost the PayVanguard deal ($48,000 ARR opportunity). Their compliance team loved our air-gapped architecture, but their engineering team only has 14 developers. They felt our Growth Pro plan at $1,499/month was too steep for 14 devs, but Starter ($499/month) capped them at 5 seats. They wanted a usage-based token metering model."
    },
    {
      id: "ps-2",
      sender: "Marcus Chen",
      time: "10:28",
      text: "I've been looking at the conversion funnel for the last 60 days. We have a massive drop-off between the $499 Starter and $1,499 Pro tier. SMB teams of 8–15 devs feel stranded in no-man's land. If we introduce a seat add-on or usage metering, we capture that middle tier without friction."
    },
    {
      id: "ps-3",
      sender: "Liam Patel",
      time: "10:45",
      text: "Hold on. Metering tokens on an air-gapped sovereign system is fundamentally tricky. Remember our core value proposition: Zero Outbound Telemetry ($E_{net} = 0.00\\text{ KB}$). If customers are running behind their own firewall on their own hardware, how do we verify token consumption without phoning home to a billing server?"
    },
    {
      id: "ps-4",
      sender: "Dr. Elena Rostova",
      time: "11:02",
      text: "Liam is right. We cannot introduce a cloud billing heartbeat. That would violate our sovereign air-gap pledge to defense and enterprise clients. If we do usage metering, it has to be verified via a local cryptographically signed audit ledger."
    },
    {
      id: "ps-5",
      sender: "Alex Vance",
      time: "11:20",
      text: "Also, from an investor perspective, predictable contracted ARR is valued at a much higher multiple than volatile usage-based revenue. Frontline backed us on our SaaS subscription model ($82K MRR growing 14% MoM). If we swing entirely to usage-based metering, our revenue fluctuates month to month."
    },
    {
      id: "ps-6",
      sender: "TARS (@TARS)",
      time: "11:43",
      isAi: true,
      text: "🤖 Historical Context Synthesis: Decision BDR-014 was ratified on Sept 12 to preserve cash runway. Pure token metering compromises the air-gapped sovereign boundary ($E_{net} = 0.00\\text{ KB}$). Recommended Compromise: Keep Starter at $499/mo (up to 5 seats), introduce an incremental seat add-on ($65/seat/month for seats 6–20), and keep Enterprise Core custom. This solves the 14-seat gap: 14 seats = $499 + (9 × $65) = $1,084/mo ($13,008 ARR), capturing lost fintech leads like PayVanguard without breaking air-gap compliance.",
      provenance: "BDR-014 · Q4 Runway Model P.1 · Call #CALL-2026-09-18-DEBRIEF-003"
    }
  ],
  "q3-roadmap": [
    {
      id: "qr-1",
      sender: "Marcus Chen",
      time: "09:30",
      text: "Morning team. As we finalize the sprint backlog for Q4, our top PLG roadmap item is Self-Serve Codebase Health Analytics (PRD-102). Our starter tier users want an interactive dashboard visualizing AST invariant violations over time, contributor violation rates, and technical debt trends. Chloe has already drafted beautiful wireframes."
    },
    {
      id: "qr-2",
      sender: "Chloe Dubois",
      time: "09:45",
      text: "Hey everyone! Yeah, the mockups are ready in Figma. I built a reusable React component for the violation timeline using Tailwind and Lucide icons. It'll give developers instant visual feedback on INV-017 and INV-021 regressions. We estimate about 3 weeks of frontend effort."
    },
    {
      id: "qr-3",
      sender: "Sarah Jenkins",
      time: "10:15",
      text: "Wait, guys, stop. We have a major conflict here. I just finished our discovery call with Acme Corp yesterday (Call #CALL-2026-09-22-ACME-001). Acme is ready to sign an $80,000 ARR pilot across 250 engineering seats, but David Sterling (their VP of Tech) made it 100% contingent on custom SAML 2.0 / SCIM SSO integration delivered by May 1st!"
    },
    {
      id: "qr-4",
      sender: "Liam Patel",
      time: "10:32",
      text: "Building on-premise SAML 2.0 and SCIM directory sync is a beast. We're talking XML signatures, certificate rotation, SAML assertion encryption, Okta and Entra ID testing fixtures. That is at least 6 to 8 weeks of full-time backend engineering."
    },
    {
      id: "qr-5",
      sender: "Dr. Elena Rostova",
      time: "10:48",
      text: "Liam is right. If Liam and I pivot to building custom enterprise SAML SSO for Acme Corp, we will have to freeze all core roadmap initiatives—including Self-Serve Analytics. Furthermore, Alex, didn't you log BDR-014 just 10 days ago stating explicitly: 'No custom enterprise feature forks or bespoke SSO customizations before Q4 to preserve velocity'?"
    },
    {
      id: "qr-6",
      sender: "Alex Vance",
      time: "11:10",
      text: "Yes, I did log BDR-014. The rationale was that we cannot become an agency building custom enterprise one-offs for every prospect. But $80,000 ARR is nearly 10% of our entire annual revenue, and it gives us an on-premise reference customer with 12,000 employees. Let's draft BDR-018 and run TARS's Causal Decision Simulator."
    }
  ],
  "hiring-plan": [
    {
      id: "hp-1",
      sender: "Dr. Elena Rostova",
      time: "14:15",
      text: "Alex, following up on our board catchup yesterday with Jordan. Liam is currently shouldering both core backend feature development and our on-premise Docker deployment packaging. As we onboard larger enterprise pilots, we desperately need a dedicated Senior Infrastructure Engineer at $14,000/month base ($168,000 annualized)."
    },
    {
      id: "hp-2",
      sender: "Alex Vance",
      time: "14:40",
      text: "Elena, I want to support you, but let's review the financial runway model in demo_runway_q4.xlsx. Current Net Burn is -$74,000/month with 9.0 months runway to May 28, 2027. Adding $14K/mo pushes burn to -$88,000/mo, shrinking runway to 7.5 months. Jordan was unequivocal: we cannot expand fixed burn without locked revenue."
    },
    {
      id: "hp-3",
      sender: "Marcus Chen",
      time: "15:10",
      text: "What if we make the infrastructure engineer offer letter contingent on closing the Acme Corp contract? If Acme pays $80,000 upfront ($6,667 MRR), that cash inflow cushions treasury. Net burn becomes -$81,333/mo, and total runway actually expands from 9.0 to 9.1 months!"
    },
    {
      id: "hp-4",
      sender: "Alex Vance",
      time: "15:50",
      text: "Agreed. Requisition approved with Revenue-Gated Contingency. Elena, post the role description on our internal board."
    }
  ]
};

export const MOCK_THINKTANK_CANVAS = {
  viewport: { x: 120, y: 80, zoom: 0.85 },
  nodes: [
    {
      id: "node-1",
      title: "AetherFlow Q3/Q4 Strategic Roadmap",
      subtitle: "Executive Whiteboard: PLG vs Enterprise Pilot Tension",
      status: "IN_PROGRESS",
      owner: "Marcus Chen & Dr. Elena Rostova",
      x: 350,
      y: 40
    },
    {
      id: "node-2",
      title: "PLG Self-Serve Track (PRD-102)",
      subtitle: "Codebase Health Analytics Dashboard (3 weeks)",
      targetAudience: "Starter ($499) & Pro ($1,499)",
      effortWeeks: 3,
      assignedTo: "Chloe Dubois & Marcus Chen",
      x: 80,
      y: 180
    },
    {
      id: "node-3",
      title: "Enterprise Pilot Track (Acme Corp)",
      subtitle: "$80,000 ARR Contract (250 Seats, May 1st SAML)",
      contingency: "Mandatory SAML 2.0/SCIM SSO by May 1st",
      effortWeeks: 7,
      assignedTo: "Sarah Jenkins & Liam Patel",
      x: 620,
      y: 180
    },
    {
      id: "node-4",
      title: "CONTRADICTION DETECTED by TARS",
      subtitle: "BDR-014 (No Forks) vs BDR-018 (Acme SAML SSO)",
      severity: "CRITICAL",
      impact: "60-Day Delay to Self-Serve Analytics vs $80,000 Revenue Injection",
      x: 350,
      y: 340
    },
    {
      id: "node-5",
      title: "Treasury & Runway Impact",
      subtitle: "$666,000 Liquid Cash • -$74,000/mo Net Burn • 9.0 mo Runway",
      withAcmeRevenue: "9.9 Months (+$6,667 MRR, +28 days)",
      zeroCashDate: "May 28, 2027",
      x: 620,
      y: 480
    },
    {
      id: "node-6",
      title: "Senior Infra Engineer Requisition",
      subtitle: "$14,000 / mo ($168K Base) • Revenue-Gated on Acme Wire",
      status: "PIPELINE_ACTIVE",
      x: 80,
      y: 480
    }
  ],
  edges: [
    { id: "e1-2", source: "node-1", target: "node-2", label: "Track A: PLG Core" },
    { id: "e1-3", source: "node-1", target: "node-3", label: "Track B: High ACV" },
    { id: "e2-4", source: "node-2", target: "node-4", label: "Resource Contention" },
    { id: "e3-4", source: "node-3", target: "node-4", label: "Violates BDR-014" },
    { id: "e3-5", source: "node-3", target: "node-5", label: "+$80K Cash Inflow" },
    { id: "e5-6", source: "node-5", target: "node-6", label: "Unlocks Hiring Budget" }
  ]
};
