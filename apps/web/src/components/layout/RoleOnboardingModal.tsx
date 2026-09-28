import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { UserRole } from '../../types/contracts';
import {
  Compass,
  CheckCircle2,
  Circle,
  Play,
  Pause,
  Volume2,
  FileText,
  MessageSquare,
  Sparkles,
  Send,
  X,
  Shield,
  Code2,
  Briefcase,
  Users,
  Terminal,
} from 'lucide-react';
import { Button } from '../primitives/Button';

interface RoleOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialRole?: UserRole;
  onOpenCitation?: (title: string, snippet: string) => void;
}

interface FlightPlanModule {
  day: number;
  title: string;
  status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
  description: string;
  tasks: string[];
}

interface TrackData {
  role: UserRole;
  roleTitle: string;
  badge: string;
  icon: React.ReactNode;
  audioTour: {
    title: string;
    speaker: string;
    duration: string;
    summary: string;
  };
  modules: FlightPlanModule[];
}

const ONBOARDING_TRACKS: Record<UserRole, TrackData> = {
  FOUNDER: {
    role: 'FOUNDER',
    roleTitle: 'Founder & Sovereign Admin Flight-Plan',
    badge: 'Executive Track',
    icon: <Shield className="w-4 h-4 text-amber-400" />,
    audioTour: {
      title: 'Founding Thesis: Why Startups Die of Context Decay',
      speaker: 'Aryan (Founder & CEO)',
      duration: '3m 45s',
      summary:
        'Aryan debriefs the 4 silent killers of early-stage velocity: context dispersion across Slack, unrecorded strategic trade-offs, catastrophic onboarding lag, and cloud IP leakage.',
    },
    modules: [
      {
        day: 1,
        title: 'Sovereign Node Initialization & Zero-Egress Invariant',
        status: 'COMPLETED',
        description:
          'Set up the local hardware appliance, verify zero external network egress (E_net = 0.00 KB), and establish offline cryptographic root keys.',
        tasks: [
          'Verify socket listener reports 0 external bytes sent',
          'Provision hardware enclave Ed25519 key for sovereign ledger signing',
          'Complete 15-minute Genesis Cold-Start Interview with Blooming Graph',
        ],
      },
      {
        day: 2,
        title: 'Capital Runway Guardrails & Decision #14 Governance',
        status: 'CURRENT',
        description:
          'Calibrate the Contradiction Radar sensitivity to prevent custom enterprise forks from destroying cash runway.',
        tasks: [
          'Review Decision #14: Banning bespoke customer branches before Q4',
          'Simulate Acme Corp $80k custom SAML proposal impact (-1.8 mo runway)',
          'Lock Contradiction Radar sensitivity to Strict for all customer commitments',
        ],
      },
      {
        day: 3,
        title: 'Executive Knowledge Ingestion & Company Lexicon',
        status: 'UPCOMING',
        description:
          'Seed the Document Lake with unredacted investor term sheets, cap table models, and proprietary company terminology.',
        tasks: [
          'Drop executive pitch decks into //tars.local/drop folder',
          'Define startup acronyms in the Company Vocabulary Manager',
          'Configure AI persona tone to Direct & Concise',
        ],
      },
      {
        day: 4,
        title: 'Delegation & Clearance Tier Assignment',
        status: 'UPCOMING',
        description:
          'Issue clearance tokens (Level 1, Level 2, Level 3) for upcoming engineering and product hires.',
        tasks: [
          'Assign Elena Rostova to Lead Architect (Clearance Level 2)',
          'Assign Marcus Vance to Product Lead (Clearance Level 2)',
          'Review Unified Action Hub daily standup memo export',
        ],
      },
    ],
  },
  ENGINEER: {
    role: 'ENGINEER',
    roleTitle: 'Engineering & Architecture Flight-Plan',
    badge: 'Engineering Track',
    icon: <Code2 className="w-4 h-4 text-blue-400" />,
    audioTour: {
      title: 'The 4 Killer Invariants that Protect Codebase Velocity',
      speaker: 'Aryan (Founder & CEO)',
      duration: '4m 12s',
      summary:
        'Founder Aryan explains why deterministic Tree-sitter AST queries in pre-commit hooks replace endless code-review friction and prevent catastrophic production outages.',
    },
    modules: [
      {
        day: 1,
        title: 'Air-Gap Environment & Pre-Commit AST Hook Setup',
        status: 'COMPLETED',
        description:
          'Clone the repository from the local network host and install git hooks for sub-50ms deterministic AST query inspection.',
        tasks: [
          'Clone local repository from http://tars.local:7777',
          'Install .git/hooks/pre-commit and verify Tree-sitter engine runs in <50ms',
          'Run offline airplane-mode unit suite to verify zero cloud dependencies',
        ],
      },
      {
        day: 2,
        title: 'Invariant INV-017 & Transactional Outbox Pattern',
        status: 'CURRENT',
        description:
          'Understand why HTTP/gRPC calls inside database transactions are banned and how the Outbox pattern eliminates split-brain errors.',
        tasks: [
          'Inspect line 84 in src/payments/service.py violating INV-017',
          'Test automated Outbox pattern refactor in the Git Pre-Commit Tester',
          'Verify living MADR ADR-017 generation in docs/adr/',
        ],
      },
      {
        day: 3,
        title: 'Kùzu Embedded Graph & Cypher Query Exploration',
        status: 'UPCOMING',
        description:
          'Query the embedded Cypher graph model connecting code entities, architectural ADRs, and customer commitments.',
        tasks: [
          'Query Kùzu for all service nodes with active [:CALLS_RPC] relationships',
          'Inspect provenance drawer for line-level AST diff references',
          'Validate Hexagonal architecture boundary compliance on mock PR',
        ],
      },
      {
        day: 4,
        title: 'Authoring Compliant Invariants & First PR',
        status: 'UPCOMING',
        description:
          'Author and commit a new feature with zero invariant breaches and sub-50ms pre-commit check.',
        tasks: [
          'Author new endpoint adhering to database transaction boundaries',
          'Trigger pre-commit terminal check and verify green checkmark',
          'Submit clean Git commit to local main trunk',
        ],
      },
    ],
  },
  PRODUCT: {
    role: 'PRODUCT',
    roleTitle: 'Product & Customer Intelligence Flight-Plan',
    badge: 'Product Track',
    icon: <Briefcase className="w-4 h-4 text-purple-400" />,
    audioTour: {
      title: 'Compiling Customer Words into Hard Specifications',
      speaker: 'Aryan (Founder & CEO)',
      duration: '3m 20s',
      summary:
        'Learn how TARS transcribes customer calls locally via Whisper, diarizes speakers, and extracts structured specs and commitments directly into the Unified Action Hub.',
    },
    modules: [
      {
        day: 1,
        title: 'Client Call Studio & Diarization Overview',
        status: 'COMPLETED',
        description:
          'Learn how audio recordings are parsed locally with zero egress and converted into time-indexed transcripts.',
        tasks: [
          'Listen to Call #ACME-01 with interactive waveform scrubber',
          'Filter transcript by speaker (John vs. Aryan)',
          'Inspect 4-tier Voice-to-Spec extraction (Summary, Pains, Features, Commitments)',
        ],
      },
      {
        day: 2,
        title: 'Promoting Commitments to the Unified Action Hub',
        status: 'CURRENT',
        description:
          'Transform unverified customer commitments into trackable engineering and GTM action items with 1-click provenance.',
        tasks: [
          'Promote Call #ACME-01 SAML SSO commitment into the Action Hub',
          'Switch Action Hub between List View and 3-Column Kanban Board',
          'Generate 1-click daily standup clipboard memo',
        ],
      },
      {
        day: 3,
        title: 'Decision Registry Traceability & Feature PRDs',
        status: 'UPCOMING',
        description:
          'Check feature requests against historical ADRs and Decision #14 to ensure roadmap alignment.',
        tasks: [
          'Review Contradiction Radar warning on Acme custom SSO request',
          'Link customer feature request to Document Lake PRD-2026-03',
          'Tag client commitments with provenance timestamps',
        ],
      },
      {
        day: 4,
        title: 'Mobile Voice Debrief (/memo) Capture',
        status: 'UPCOMING',
        description:
          'Use the 1-tap mobile PWA interface to record quick post-meeting voice debriefs.',
        tasks: [
          'Record 15-second voice debrief using the mobile /memo simulator',
          'Verify automatic Whisper transcription and action item routing',
          'Publish meeting summary to #pricing-strategy Think Tank channel',
        ],
      },
    ],
  },
  NEW_HIRE: {
    role: 'NEW_HIRE',
    roleTitle: 'New Hire Sovereign Flight-Plan',
    badge: 'Talent & Culture Track',
    icon: <Users className="w-4 h-4 text-emerald-400" />,
    audioTour: {
      title: 'Operating with Uncompromising Intellectual Honesty',
      speaker: 'Aryan (Founder & CEO)',
      duration: '3m 50s',
      summary:
        'Aryan introduces company operating principles, the sovereign air-gap pledge, and how to use the Socratic Mentor to ramp up in 14 days without interrupting senior developers.',
    },
    modules: [
      {
        day: 1,
        title: 'Company Culture & The Sovereign Thesis',
        status: 'COMPLETED',
        description:
          'Understand our mission to eliminate startup context decay and why privacy and intellectual honesty guide every decision.',
        tasks: [
          'Listen to Founder Aryan founding thesis audio tour',
          'Review the 14-day flight-plan checklist overview',
          'Sign the Local Sovereign Air-Gap Operating Pledge',
        ],
      },
      {
        day: 2,
        title: 'Knowledge Lake Search & Line-Level Citations',
        status: 'CURRENT',
        description:
          'Master hybrid vector+lexical retrieval to find any past design doc, customer interview, or decision in <150ms.',
        tasks: [
          'Search the Document Lake for "SAML SSO" and verify sub-150ms latency',
          'Inspect unredacted source citations in the Citation Drawer',
          'Export a verified citation bundle for documentation review',
        ],
      },
      {
        day: 3,
        title: 'Think Tank Synthesis & @TARS Invocations',
        status: 'UPCOMING',
        description:
          'Participate in company discussions and observe how TARS automatically injects relevant context to prevent redundant debates.',
        tasks: [
          'Read the #pricing-strategy thread discussing Acme Corp trade-offs',
          'Inspect the 2D SVG topology graph showing claims and constraints',
          'Ask the Socratic Mentor about why Decision #14 was ratified',
        ],
      },
      {
        day: 4,
        title: 'Independence & First Action Hub Contribution',
        status: 'UPCOMING',
        description:
          'Claim an action item from the Unified Action Hub and complete your first sprint milestone.',
        tasks: [
          'Claim Day 1-3 flight-plan onboarding task in the Kanban board',
          'Move task status to Done and verify provenance trail',
          'Schedule 15-minute sync with your role mentor',
        ],
      },
    ],
  },
  SALES: {
    role: 'SALES',
    roleTitle: 'Sales & GTM Flight-Plan',
    badge: 'GTM Track',
    icon: <Briefcase className="w-4 h-4 text-amber-400" />,
    audioTour: {
      title: 'Selling Data Sovereignty to Enterprise Buyers',
      speaker: 'Aryan (Founder & CEO)',
      duration: '3m 15s',
      summary:
        'How to pitch the zero-cloud-egress hardware appliance to enterprise infosec officers who reject SaaS AI tools.',
    },
    modules: [
      {
        day: 1,
        title: 'Enterprise Air-Gap Value Proposition',
        status: 'COMPLETED',
        description:
          'Learn why Fortune 500 infosec officers veto cloud LLMs and how TARS wins contracts by guaranteeing on-prem execution.',
        tasks: [
          'Review Acme Corp call transcript and infosec veto reasons',
          'Verify socket monitor telemetry showing 0.00 KB egress',
          'Memorize the 3-point sovereign hardware appliance pitch',
        ],
      },
      {
        day: 2,
        title: 'Customer Call Studio & Promise Verification',
        status: 'CURRENT',
        description:
          'Ensure sales commitments match engineering realities by cross-referencing Decision #14.',
        tasks: [
          'Review Call #ACME-01 audio recording and extracted commitments',
          'Verify Contradiction Radar prevents unauthorized custom feature promises',
          'Draft standard enterprise SLA with air-gap guarantee',
        ],
      },
    ],
  },
};

export const RoleOnboardingModal: React.FC<RoleOnboardingModalProps> = ({
  isOpen,
  onClose,
  initialRole = 'FOUNDER',
  onOpenCitation,
}) => {
  const [selectedRole, setSelectedRole] = useState<UserRole>(initialRole);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [socraticInput, setSocraticInput] = useState('');
  const [socraticMessages, setSocraticMessages] = useState<
    { role: 'user' | 'tars'; text: string; citation?: string }[]
  >([
    {
      role: 'tars',
      text: "Welcome to your onboarding flight-plan. I am your Socratic Mentor. Ask me any question about our founding thesis, Decision #14, our 4 killer invariants, or customer promises, and I will answer with line-level citations from the Lake.",
      citation: 'DOC-FOUNDING · Founding Thesis P.1',
    },
  ]);

  if (!isOpen) return null;

  const currentTrack = ONBOARDING_TRACKS[selectedRole] || ONBOARDING_TRACKS.FOUNDER;

  const handleSocraticSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!socraticInput.trim()) return;

    const userText = socraticInput.trim();
    setSocraticInput('');
    setSocraticMessages((prev) => [...prev, { role: 'user', text: userText }]);

    setTimeout(() => {
      let reply = "Based on our architecture and decisions, this is governed by our founding principles.";
      let cite = 'DOC-FOUNDING · Section 2';

      if (userText.toLowerCase().includes('decision 14') || userText.toLowerCase().includes('bespoke')) {
        reply = "Decision #14 (ratified Sept 14) established that we strictly build single-tenant-deployable unified software rather than custom branches for early enterprise prospects. This prevents Bus Factor = 1 and maintains our sub-50ms pre-commit invariant checks.";
        cite = 'DEC-14 · ADR-014-no-custom-branches.md';
      } else if (userText.toLowerCase().includes('inv-017') || userText.toLowerCase().includes('outbox')) {
        reply = "INV-017 enforces that no external HTTP or gRPC calls are permitted within database transactions. This prevents split-brain anomalies and connection pool starvation. We require the Transactional Outbox pattern documented in ADR-017.";
        cite = 'INV-017 · ADR-017-outbox-pattern.md';
      } else if (userText.toLowerCase().includes('air-gap') || userText.toLowerCase().includes('sovereign')) {
        reply = "Our core hardware invariant requires zero network egress (E_net = 0.00 KB). All vector retrieval, Whisper transcription, and AST parsing execute locally on Apple Silicon or on-premise NVMe hardware.";
        cite = 'DOC-SOVEREIGN-01 · Section 1.3';
      }

      setSocraticMessages((prev) => [...prev, { role: 'tars', text: reply, citation: cite }]);
    }, 600);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/65 dark:bg-black/85 backdrop-blur-[24px] animate-fade-in select-none">
      <div
        className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-3xl border border-black/[0.08] dark:border-white/[0.12] bg-white/95 dark:bg-zinc-950/95 text-zinc-900 dark:text-zinc-100 shadow-2xl apple-glass relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Apple Specular Top Highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/25 to-transparent" />

        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 flex items-center justify-center text-zinc-900 dark:text-white shadow-inner">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900 dark:text-white">
                  Role-Adaptive Onboarding Flight Plans
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/10">
                  {currentTrack.badge}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Structured 14-day flight plans tailored specifically to each startup role.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Role Selector Tabs (Apple Segmented Control style) */}
        <div className="px-5 pt-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 overflow-x-auto shrink-0 pb-3">
          {(['FOUNDER', 'ENGINEER', 'PRODUCT', 'NEW_HIRE'] as UserRole[]).map((r) => {
            const track = ONBOARDING_TRACKS[r];
            const isSelected = selectedRole === r;
            return (
              <button
                key={r}
                onClick={() => setSelectedRole(r)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  isSelected
                    ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-sm'
                    : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-transparent'
                }`}
              >
                {track.icon}
                <span>{track.roleTitle.split(' ')[0]} Flight Plan</span>
              </button>
            );
          })}
        </div>

        {/* Main Content Body: 2 Columns */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Modules & Audio Tour (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Audio Tour Player Card */}
            <div className="p-4 sm:p-5 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60 apple-glass">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-white">
                  <Volume2 className="w-4 h-4 text-zinc-500 dark:text-zinc-300" />
                  <span>Role Audio Tour</span>
                </div>
                <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400">
                  {currentTrack.audioTour.duration}
                </span>
              </div>

              <div className="text-sm font-semibold text-zinc-900 dark:text-white mb-1">
                {currentTrack.audioTour.title}
              </div>
              <div className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-2 font-mono">
                Narrated by: {currentTrack.audioTour.speaker}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed mb-4">
                {currentTrack.audioTour.summary}
              </p>

              <div className="flex items-center gap-3 pt-2 border-t border-black/5 dark:border-white/5">
                <button
                  onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                  className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black text-xs font-semibold dark:hover:bg-zinc-200 transition-colors shadow-sm"
                >
                  {isPlayingAudio ? (
                    <>
                      <Pause className="w-3.5 h-3.5" />
                      <span>Pause Tour</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" />
                      <span>Play Founder Tour</span>
                    </>
                  )}
                </button>
                {isPlayingAudio && (
                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Playing local lossless audio (100% offline)...</span>
                  </div>
                )}
              </div>
            </div>

            {/* 14-Day Flight Plan Modules */}
            <div>
              <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider font-mono mb-3">
                Curated 14-Day Flight Plan Checklist
              </div>
              <div className="space-y-3">
                {currentTrack.modules.map((mod) => {
                  const isDone = mod.status === 'COMPLETED';
                  const isCurrent = mod.status === 'CURRENT';

                  return (
                    <div
                      key={mod.day}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCurrent
                          ? 'border-black/20 bg-white shadow-md dark:border-white/20 dark:bg-zinc-900/80'
                          : isDone
                          ? 'border-black/5 bg-zinc-50/60 dark:border-white/5 dark:bg-zinc-900/30'
                          : 'border-black/5 bg-zinc-50/30 opacity-70 dark:border-white/5 dark:bg-zinc-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                              isDone
                                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30'
                                : isCurrent
                                ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}
                          >
                            DAY {mod.day}
                          </span>
                          <span className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {mod.title}
                          </span>
                        </div>
                        {isDone ? (
                          <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Passed</span>
                          </span>
                        ) : isCurrent ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-blue-500/20 text-blue-600 dark:text-blue-300 border border-blue-500/30 font-semibold">
                            In Progress
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">Upcoming</span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-600 dark:text-zinc-400 mb-3">{mod.description}</p>

                      <div className="space-y-1.5 pl-1">
                        {mod.tasks.map((task, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-xs text-zinc-700 dark:text-zinc-300">
                            {isDone ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <Circle className="w-3.5 h-3.5 text-zinc-400 dark:text-zinc-500 shrink-0 mt-0.5" />
                            )}
                            <span className={isDone ? 'line-through text-zinc-400 dark:text-zinc-500' : ''}>
                              {task}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Socratic Mentor Sandbox (5 cols) */}
          <div className="lg:col-span-5 flex flex-col rounded-2xl border border-black/[0.06] dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/60 apple-glass p-4 sm:p-5 h-[580px]">
            <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span className="text-xs font-semibold text-zinc-900 dark:text-white">Socratic Knowledge Mentor</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                Grounded in Lake
              </span>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 text-xs">
              {socraticMessages.map((msg, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${
                    msg.role === 'user'
                      ? 'bg-black/5 dark:bg-white/10 border-black/10 dark:border-white/10 text-zinc-900 dark:text-white ml-6'
                      : 'bg-white dark:bg-zinc-900/80 border-black/5 dark:border-white/5 text-zinc-800 dark:text-zinc-300 shadow-sm mr-2'
                  }`}
                >
                  <div className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 mb-1">
                    {msg.role === 'user' ? 'You' : 'TARS Socratic Mentor'}
                  </div>
                  <p className="leading-relaxed">{msg.text}</p>
                  {msg.citation && (
                    <button
                      onClick={() => onOpenCitation?.('Socratic Citation', msg.citation || '')}
                      className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white border border-black/5 dark:border-white/5 transition-colors"
                    >
                      <FileText className="w-3 h-3 text-amber-500" />
                      <span>{msg.citation}</span>
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Suggested Starter Prompts */}
            <div className="py-2 flex flex-wrap gap-1.5 border-t border-black/5 dark:border-white/5 mt-2">
              <button
                onClick={() =>
                  setSocraticInput('Why did Decision #14 ban bespoke customer branches?')
                }
                className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 transition-colors shadow-xs"
              >
                Why Decision #14?
              </button>
              <button
                onClick={() =>
                  setSocraticInput('How does INV-017 enforce the Transactional Outbox pattern?')
                }
                className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 transition-colors shadow-xs"
              >
                INV-017 Outbox rule?
              </button>
              <button
                onClick={() =>
                  setSocraticInput('Explain our zero network egress air-gap invariant.')
                }
                className="text-[10px] px-2 py-1 rounded-lg bg-white dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/5 transition-colors shadow-xs"
              >
                Zero-egress proof?
              </button>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSocraticSubmit} className="pt-2 flex gap-2">
              <input
                type="text"
                value={socraticInput}
                onChange={(e) => setSocraticInput(e.target.value)}
                placeholder="Ask the Socratic Mentor anything..."
                className="flex-1 px-3 py-2 text-xs rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white focus:outline-none focus:border-zinc-500 dark:focus:border-white/30"
              />
              <button
                type="submit"
                className="p-2 rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 transition-colors shadow-sm"
                aria-label="Send query"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-zinc-50/60 dark:bg-zinc-950/60 text-xs">
          <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 font-mono text-[11px]">
            <span>Founder Aryan Guarantee: Zero Context Loss</span>
          </div>
          <Button
            variant="primary"
            className="h-9 px-4 text-xs font-semibold rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
            onClick={onClose}
          >
            Continue in Workspace
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
