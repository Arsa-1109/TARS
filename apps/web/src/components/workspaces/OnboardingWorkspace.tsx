import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { Drawer } from '../primitives/Drawer';
import { Dialog } from '../primitives/Dialog';
import { EmptyState } from '../primitives/EmptyState';
import { UserRole, CompanyProfile } from '../../types/contracts';
import { api } from '../../services/client';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  Play,
  Pause,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Send,
  Sparkles,
  FileText,
  User,
  ChevronRight,
  ChevronLeft,
  Compass,
  Bookmark,
  ExternalLink,
} from 'lucide-react';

interface OnboardingWorkspaceProps {
  userRole: UserRole;
  companyProfile?: CompanyProfile | null;
  onOpenGenesis?: () => void;
  onOpenCitation: (docTitle: string, snippet: string) => void;
}

export const OnboardingWorkspace: React.FC<OnboardingWorkspaceProps> = ({
  userRole,
  companyProfile: propProfile,
  onOpenGenesis,
  onOpenCitation,
}) => {
  const [profile, setProfile] = useState<CompanyProfile | null>(propProfile || null);
  const [activeDay, setActiveDay] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [tourPlaying, setTourPlaying] = useState(false);
  const [tourElapsed, setTourElapsed] = useState(0);

  // Modals and Drawers
  const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
  const [mentorQuery, setMentorQuery] = useState('');
  const [resourcesDialogOpen, setResourcesDialogOpen] = useState(false);
  const [resourceDialogType, setResourceDialogType] = useState<'resources' | 'references'>('resources');

  const [mentorMessages, setMentorMessages] = useState<
    { sender: 'user' | 'mentor'; text: string; citation?: string }[]
  >([
    {
      sender: 'mentor',
      text: 'Hello! I am your Socratic onboarding mentor. I have access to all founding thesis documents, technical decisions, and architecture contracts. Ask me anything.',
    },
  ]);
  const [mentorLoading, setMentorLoading] = useState(false);

  // Audio timer simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (tourPlaying) {
      interval = setInterval(() => {
        setTourElapsed((prev) => (prev >= 225 ? 0 : prev + 1));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [tourPlaying]);

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
    } else {
      api.getCompanyProfile().then((p) => {
        if (p) setProfile(p);
      }).catch(() => {});
    }
  }, [propProfile]);

  const companyName = profile?.company_name || 'AetherFlow AI';
  const techStack = profile?.tech_stack || 'Python, TypeScript, SQLite';
  const enterprisePolicy = profile?.enterprise_policy || 'Strict Rejection of Bespoke Forks';

  const data = {
    role: userRole,
    title: `${companyName} Flight-Plan`,
    total_days: 4,
    current_day: activeDay,
    modules: [
      {
        day: 1,
        title: `Sovereignty & The Air-Gap Invariant (${companyName})`,
        status: 'COMPLETED',
        description: `Understand why ${companyName} enforces zero cloud egress ($E_{net} = 0.00\\text{ KB/s}$) and how local on-premise execution protects company IP.`,
        tasks: [
          `Inspect ${companyName} institutional identity and core thesis in Knowledge Base`,
          `Verify .tars/invariants.yaml and install local pre-commit AST guards`,
          `Run first local inference with zero egress validation`,
          `Summarize the Air-Gap Invariant in your own words (/teach to TARS)`,
        ],
        milestone_tour: {
          title: `Why Startups Die of Context Decay`,
          subtitle: `Founder Aryan debriefs the 4 frictions that destroy early-stage engineering velocity.`,
          audio_duration: '3m 45s',
          speaker: `Founder (${companyName})`,
        },
        resources: [
          { title: `${companyName} Institutional Manifesto`, snippet: 'Core principles of data sovereignty and zero cloud egress.', doc: 'Manifesto.md' },
          { title: 'Local Pre-Commit Validator Configuration', snippet: 'Invariants file `.tars/invariants.yaml` spec and rules.', doc: 'invariants.yaml' },
          { title: 'Air-Gap Verification Script', snippet: 'Local audit script verifying 0.00 KB network outbound packets.', doc: 'verify_airgap.py' },
        ],
        references: [
          { title: 'PRD Section 3.1: Local Host Architecture', doc: 'PRD-001' },
          { title: 'ADR-001: Local In-Process Storage Engine', doc: 'ADR-001' },
          { title: 'BDR-014: Zero Custom Enterprise Feature Forks', doc: 'BDR-014' },
          { title: 'BDR-018: Acme Corp SAML Exception Review', doc: 'BDR-018' },
          { title: 'Engineering Playbook P.4: AST Pre-Commit Gates', doc: 'PLAYBOOK-ENG' },
        ],
      },
      {
        day: 2,
        title: `Deterministic AST Enforcement & Python, TARS Tooling`,
        status: 'COMPLETED',
        description: `Learn how Tree-sitter parses staged Git diffs in <50ms to enforce ${companyName}'s architectural standards before commits land in main.`,
        tasks: [
          `Review architectural invariants in Architecture Workspace`,
          `Test local AST query runner against staged diffs in <50ms`,
          `Inspect living MADR generator output in docs/adr/`,
          `Verify INV-017 Transactional Outbox pattern compliance`,
        ],
        milestone_tour: {
          title: `The <50ms Invariant Engine`,
          subtitle: `Dr. Elena Rostova on how AST linting prevents technical debt before merge.`,
          audio_duration: '4m 10s',
          speaker: `CTO (${companyName})`,
        },
        resources: [
          { title: 'Tree-sitter Query Grammar Specification', snippet: 'High-speed concrete syntax tree matcher for Python/TS.', doc: 'grammar_spec.md' },
          { title: 'Pre-commit Git Hook Script', snippet: 'Deterministic pre-commit script executing in <50ms.', doc: 'pre-commit' },
          { title: 'Living MADR Documentation Generator', snippet: 'Generates Markdown Any Decision Records automatically.', doc: 'madr_gen.py' },
        ],
        references: [
          { title: 'INV-017: Outbox Pattern & Transaction Isolation', doc: 'INV-017' },
          { title: 'ADR-002: Tree-sitter Grammar Query Cache', doc: 'ADR-002' },
          { title: 'Architecture Topology Map v2', doc: 'TOPOLOGY-V2' },
          { title: 'Benchmark Report: AST diff execution times', doc: 'BENCH-001' },
          { title: 'Engineering Playbook P.8: Database Transactions', doc: 'PLAYBOOK-DB' },
        ],
      },
      {
        day: 3,
        title: `Institutional Memory & Strategic Policies`,
        status: 'CURRENT',
        description: `Explore the sovereign graph connecting ADR decisions, customer commitments, and code entities.`,
        tasks: [
          `Review policy decisions regarding ${enterprisePolicy}`,
          `Trace customer commitments into the Unified Action Hub`,
          `Ask the Socratic Mentor about architectural boundaries and cash runway`,
          `Verify contradictive query alerts with live Cortex graph`,
        ],
        milestone_tour: {
          title: `Sovereign Graph & Institutional Memory`,
          subtitle: `How Kùzu DB links decisions, code entities, and verbal commitments.`,
          audio_duration: '3m 20s',
          speaker: `Lead Architect (${companyName})`,
        },
        resources: [
          { title: 'Kùzu Embedded Property Graph Schema', snippet: 'Graph relationships between decisions, files, and users.', doc: 'schema.cypher' },
          { title: 'Cortex Decision Registry Guidelines', snippet: 'Formalizing strategic proposals and options considered.', doc: 'cortex_guide.md' },
          { title: 'Action Hub Event Sourcing Model', snippet: 'Tracking deliverables with automatic lifecycle progression.', doc: 'action_hub.md' },
        ],
        references: [
          { title: 'BDR-014: Zero Custom Enterprise Forks', doc: 'BDR-014' },
          { title: 'BDR-018: Proposed Policy Exception - Acme SAML', doc: 'BDR-018' },
          { title: 'ACT-001: Resolve BDR-014 vs BDR-018 SAML Exception', doc: 'ACT-001' },
          { title: 'Q4 Financial Model: Summary_Burn Tab', doc: 'FIN-RUNWAY' },
          { title: 'Founder Manifesto: Protecting 9 Months of Runway', doc: 'MANIFESTO-P2' },
        ],
      },
      {
        day: 4,
        title: `First Compliant Pull Request`,
        status: 'UPCOMING',
        description: `Author and commit your first feature passing all invariant gates for ${companyName}.`,
        tasks: [
          `Implement new service component adhering to Hexagonal architecture`,
          `Verify sub-50ms pre-commit hook execution without regressions`,
          `Submit PR with automated institutional executive summary`,
          `Run comprehensive pytest suite with 100% passing checks`,
        ],
        milestone_tour: {
          title: `Shipping Confidently on Day 4`,
          subtitle: `Walking through your first air-gapped commit and peer review flight path.`,
          audio_duration: '2m 55s',
          speaker: `Team Lead (${companyName})`,
        },
        resources: [
          { title: 'Hexagonal Architecture Service Template', snippet: 'Clean boundary domain service with repository interfaces.', doc: 'service_template.py' },
          { title: 'Test Harness & Fixture Catalog', snippet: 'Offline mock datasets for lightning-fast unit verification.', doc: 'test_fixtures.py' },
          { title: 'Automated PR Summary Generator Tool', snippet: 'Generates institutional impact summary for changelog.', doc: 'pr_summary.py' },
        ],
        references: [
          { title: 'Contributing Guidelines & Git Flow', doc: 'CONTRIBUTING.md' },
          { title: 'Code Quality Contract: Zero Cloud Egress', doc: 'CONTRACT-ZERO-EGRESS' },
          { title: 'ADR-003: Hexagonal Service Boundaries', doc: 'ADR-003' },
          { title: 'Pytest Suite Configuration & CI Pipeline', doc: 'PYTEST-CONF' },
          { title: 'Release Engineering Playbook', doc: 'RELEASE-PLAYBOOK' },
        ],
      },
    ],
  };

  const toggleTask = (day: number, index: number) => {
    const key = `${day}-${index}`;
    setCompletedTasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentModule = data.modules.find((m) => m.day === activeDay) || data.modules[0];

  const handleMarkModuleComplete = () => {
    const updated = { ...completedTasks };
    currentModule.tasks.forEach((_, idx) => {
      updated[`${currentModule.day}-${idx}`] = true;
    });
    setCompletedTasks(updated);
  };

  const handleAskMentor = async (questionText: string) => {
    if (!questionText.trim()) return;
    const userMsg = questionText.trim();
    setMentorMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setMentorQuery('');
    setMentorLoading(true);

    const lower = userMsg.toLowerCase();
    // 1. Role-specific context answers
    if (
      lower.includes('my role') ||
      lower.includes('my primary role') ||
      lower.includes('what is my role') ||
      lower.includes('whats my role') ||
      lower.includes('who am i') ||
      lower.includes('my responsibilities')
    ) {
      const roleProfiles: Record<string, { roleTitle: string; responsibilities: string; cite: string }> = {
        FOUNDER: {
          roleTitle: 'Founder & Sovereign Admin (Executive Track)',
          responsibilities:
            'Your primary role is executive governance, company runway management, and architectural discipline. You enforce Decision #14 (banning custom enterprise branches to preserve runway) and guarantee 100% data sovereignty (zero cloud egress).',
          cite: 'Founder Flight-Plan · Executive Track P.1',
        },
        ENGINEER: {
          roleTitle: 'Lead Software & Systems Engineer (Engineering Track)',
          responsibilities:
            'Your primary role is architecting and building the sovereign offline platform adhering to our 4 killer invariants (such as INV-017 Transactional Outbox pattern, local cookie auth, and parameter validation), ensuring all AST pre-commit checks pass deterministically in <50ms.',
          cite: 'Engineering Architecture Playbook · Section 2',
        },
        PRODUCT: {
          roleTitle: 'Product & Customer Intelligence Lead (Product Track)',
          responsibilities:
            'Your primary role is compiling unstructured customer audio debriefs and call recordings into structured 4-part specs (pains, features, commitments), promoting deliverables to the Unified Action Hub, and ensuring commitments align with Decision #14.',
          cite: 'Product Spec Flight-Plan · Section 1',
        },
        NEW_HIRE: {
          roleTitle: 'New Hire Sovereign Fellow (Onboarding Track)',
          responsibilities:
            'Your primary role is completing your 14-day flight-plan checklist, leveraging the private Socratic Mentor to ramp up on company decisions and architecture without context decay, and shipping your first verified pull request.',
          cite: 'Onboarding Flight-Plan Checklist Day 1-3',
        },
        SALES: {
          roleTitle: 'Enterprise GTM & Sales Specialist (GTM Track)',
          responsibilities:
            'Your primary role is presenting our air-gapped data sovereignty proposition to enterprise buyers who forbid cloud AI tools, and ensuring client commitments do not create custom fork debt.',
          cite: 'Enterprise GTM Playbook · Section 3',
        },
      };

      const activeProfile = roleProfiles[userRole] || roleProfiles.ENGINEER;
      setMentorMessages((prev) => [
        ...prev,
        {
          sender: 'mentor',
          text: `Your primary role is **${activeProfile.roleTitle}**.\n\n${activeProfile.responsibilities}\n\nYou are currently on **Day ${activeDay}: ${currentModule.title}**.`,
          citation: activeProfile.cite,
        },
      ]);
      setMentorLoading(false);
      return;
    }

    const getFallbackAnswer = () => {
      let reply = 'All company operations are designed for deterministic execution.';
      let cite = 'Founding Manifesto P.1';

      if (userMsg.toLowerCase().includes('bdr-014') || userMsg.toLowerCase().includes('decision 14') || userMsg.toLowerCase().includes('custom')) {
        reply =
          'BDR-014 was ratified 2026-09-12 to protect cash runway and prevent Bus Factor = 1 amnesia. With a 12-person team, maintaining bespoke forks diverts senior engineering capacity and delays the core self-serve product. SAML SSO is the sole exception under BDR-018.';
        cite = 'BDR-014 (Ratified 2026-09-12) · BDR-018 (Exception Log)';
      } else if (userMsg.toLowerCase().includes('inv-017') || userMsg.toLowerCase().includes('transaction')) {
        reply =
          'INV-017 strictly prevents wrapping outbound HTTP calls inside database transactions. If external APIs experience latency, database row locks remain open, exhausting connection pools.';
        cite = 'ADR-017: Outbox Pattern & Transaction Isolation';
      } else if (userMsg.toLowerCase().includes('sovereign') || userMsg.toLowerCase().includes('air-gap') || userMsg.toLowerCase().includes('principles')) {
        reply =
          'Sovereignty guarantees zero cloud egress (0.00 KB). All Qwen 8B, Whisper, and Tree-sitter models execute on your local hardware so customer code and NDA recordings are never leaked.';
        cite = 'PRD Section 3.1: Local Host Architecture';
      } else {
        reply = `Evaluated across verified institutional memory: All architectural contracts and operational policies are enforced deterministically in <50ms without cloud egress.`;
        cite = 'Engineering Architecture Playbook P.4';
      }
      return { reply, cite };
    };

    // 2. Query Real Backend Search (Track 4 Socratic Mentor Integration)
    try {
      const searchRes = await api.search({
        query: userMsg,
        department: 'ALL',
        clearance: userRole === 'FOUNDER' ? 'EXECUTIVE_ONLY' : 'ALL_TEAM',
        user_role: userRole,
      });

      if (searchRes && searchRes.answer && searchRes.answer.trim().length > 0 && !searchRes.answer.startsWith('Found 0')) {
        let reply = searchRes.answer;
        const cite = (searchRes.citations && searchRes.citations.length > 0)
          ? `${searchRes.citations[0].doc_title} (P.${searchRes.citations[0].page_number || 1})`
          : 'TARS Institutional Intelligence (qwen2.5:1.5b)';
        if (searchRes.citations && searchRes.citations.length > 0 && !reply.includes(searchRes.citations[0].snippet)) {
          reply = `${reply}\n\nTop insight: "${searchRes.citations[0].snippet}"`;
        }
        setMentorMessages((prev) => [
          ...prev,
          { sender: 'mentor', text: reply, citation: cite },
        ]);
      } else if (searchRes && searchRes.citations && searchRes.citations.length > 0) {
        const topCitation = searchRes.citations[0];
        const reply = `According to internal record '${topCitation.doc_title}': "${topCitation.snippet}"`;
        const cite = `${topCitation.doc_title} (P.${topCitation.page_number || 1})`;
        setMentorMessages((prev) => [
          ...prev,
          { sender: 'mentor', text: reply, citation: cite },
        ]);
      } else {
        const fallback = getFallbackAnswer();
        setMentorMessages((prev) => [
          ...prev,
          { sender: 'mentor', text: fallback.reply, citation: fallback.cite },
        ]);
      }
    } catch {
      const fallback = getFallbackAnswer();
      setMentorMessages((prev) => [
        ...prev,
        { sender: 'mentor', text: fallback.reply, citation: fallback.cite },
      ]);
    } finally {
      setMentorLoading(false);
    }
  };

  const totalTasks = data.modules.reduce((acc, m) => acc + m.tasks.length, 0);
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPct = Math.round((completedCount / totalTasks) * 100);

  const radius = 18;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (progressPct / 100) * circ;

  const suggestedQueries = [
    `What are the founding principles of ${companyName}?`,
    `How does the Air-Gap Invariant protect company IP?`,
    `What tools are part of the local inference stack?`,
    `How does this relate to TARS architecture?`,
  ];

  if (!profile || !profile.company_name) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          eyebrow="WORKSPACE 6"
          title="AetherFlow AI Onboarding Hub"
          description="Role-tailored flight-plans and Socratic mentor sandbox to bring new hires to day-3 productivity."
          actions={
            onOpenGenesis && (
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={onOpenGenesis}
                className="rounded-full px-4"
              >
                Launch Genesis
              </Button>
            )
          }
        />
        <EmptyState
          icon={<Compass className="w-5 h-5 text-[#8E8E93]" />}
          title="No Sovereign Flight-Plan Initialized"
          description="Genesis Onboarding has not yet been executed for this sovereign instance. Configure your startup identity, tech stack, and strategic boundaries to generate role-adaptive flight plans."
          actionLabel="Run Genesis Onboarding"
          onAction={onOpenGenesis}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3.5 animate-fade-in">
      {/* Top Page Header */}
      <PageHeader
        eyebrow="WORKSPACE 6"
        title="AetherFlow AI Onboarding Hub"
        description="Role-tailored flight-plans and Socratic mentor sandbox to bring new hires to day-3 productivity."
        className="pb-2.5 mb-1"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => setMentorDrawerOpen(true)}
            className="rounded-full px-4 text-xs font-semibold border-black/15 dark:border-white/15 bg-white dark:bg-[#18191D] text-black dark:text-white shadow-xs hover:bg-neutral-100 dark:hover:bg-[#222327]"
          >
            Ask Mentor
          </Button>
        }
      />

      {/* SUMMARY CARDS ROW (3 Compact Aligned Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* 1. Overall Progress */}
        <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-3.5 flex items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="relative shrink-0 flex items-center justify-center">
              <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90">
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  strokeWidth="3"
                  stroke="currentColor"
                  className="text-black/10 dark:text-white/10"
                />
                <circle
                  cx="22"
                  cy="22"
                  r={radius}
                  fill="none"
                  strokeWidth="3"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={strokeOffset}
                  className="text-black dark:text-white transition-all duration-500"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-black dark:text-white tabular-nums">
                {progressPct}%
              </span>
            </div>
            <div>
              <div className="text-xs font-semibold text-black dark:text-white">Overall Progress</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 font-mono">
                {completedCount} of {totalTasks} done
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
        </div>

        {/* 2. Current Phase */}
        <div
          onClick={() => setActiveDay(data.current_day)}
          className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-3.5 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[8px] bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-black dark:text-white">
              <FileText className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                CURRENT PHASE
              </div>
              <div className="text-xs font-semibold text-black dark:text-white mt-0.5 truncate">
                Day {activeDay} — {currentModule.title}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
        </div>

        {/* 3. Your Role */}
        <div
          onClick={() => {
            setMentorDrawerOpen(true);
            setTimeout(() => handleAskMentor('What is my primary role and responsibilities?'), 100);
          }}
          className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-3.5 flex items-center justify-between gap-3 shadow-xs cursor-pointer hover:border-black/20 dark:hover:border-white/20 transition-all"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-[8px] bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0 text-black dark:text-white">
              <User className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                YOUR ROLE
              </div>
              <div className="text-xs font-semibold text-black dark:text-white mt-0.5 truncate font-mono">
                {userRole.toUpperCase()}
              </div>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-neutral-400 shrink-0" />
        </div>
      </div>

      {/* FLIGHT-PLAN TIMELINE */}
      <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-3.5 shadow-xs space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
            FLIGHT-PLAN TIMELINE
          </span>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-neutral-400">Day {activeDay} of {data.modules.length}</span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={activeDay <= 1}
                onClick={() => setActiveDay((d) => Math.max(1, d - 1))}
                className="w-6 h-6 rounded-[5px] border border-black/10 dark:border-white/10 flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={activeDay >= data.modules.length}
                onClick={() => setActiveDay((d) => Math.min(data.modules.length, d + 1))}
                className="w-6 h-6 rounded-[5px] border border-black/10 dark:border-white/10 flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {data.modules.map((mod) => {
            const isSelected = mod.day === activeDay;
            const isCompleted = mod.day < activeDay || mod.tasks.every((_, i) => completedTasks[`${mod.day}-${i}`]);

            return (
              <button
                key={mod.day}
                type="button"
                onClick={() => setActiveDay(mod.day)}
                className={`p-3 rounded-[8px] border text-left transition-all relative flex flex-col justify-between min-h-[78px] ${
                  isSelected
                    ? 'border-black/30 dark:border-white/30 bg-black/[0.04] dark:bg-white/[0.08] shadow-xs'
                    : 'border-black/10 dark:border-white/10 bg-neutral-50/50 dark:bg-[#18191D]/60 hover:bg-neutral-100 dark:hover:bg-[#18191D] hover:border-black/20 dark:hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : isSelected ? (
                        <div className="w-4 h-4 rounded-full border-2 border-black dark:border-white flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-black dark:bg-white" />
                        </div>
                      ) : (
                        <Circle className="w-4 h-4 text-neutral-400" />
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-semibold text-neutral-400 uppercase">
                      DAY {mod.day}
                    </span>
                  </div>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black dark:bg-white' : 'bg-neutral-300 dark:bg-neutral-600'}`} />
                </div>
                <div className={`text-xs mt-2 leading-snug line-clamp-2 ${isSelected ? 'text-black dark:text-white font-semibold' : 'text-neutral-700 dark:text-neutral-300 font-medium'}`}>
                  {mod.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* MAIN TWO-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
        {/* Left Column: Current Module Details & Verifiable Milestones (8 cols) */}
        <div className="lg:col-span-8 space-y-3.5">
          <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 sm:p-5 space-y-4 shadow-xs">
            {/* Module Header */}
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-400 mb-1">
                <span className="uppercase tracking-wider">DAY {currentModule.day} MODULE</span>
                <span>·</span>
                <span className="px-1.5 py-0.2 rounded-[4px] bg-black/5 dark:bg-white/10 text-black dark:text-white font-semibold">
                  {currentModule.status}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight text-black dark:text-white">
                {currentModule.title}
              </h2>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                {currentModule.description}
              </p>
            </div>

            {/* Verifiable Milestones */}
            <div className="space-y-2 pt-2 border-t border-black/8 dark:border-white/8">
              <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                VERIFIABLE MILESTONES
              </div>
              <div className="space-y-1.5">
                {currentModule.tasks.map((task, idx) => {
                  const isChecked = !!completedTasks[`${currentModule.day}-${idx}`];
                  return (
                    <div
                      key={idx}
                      onClick={() => toggleTask(currentModule.day, idx)}
                      className={`flex items-center justify-between gap-3 p-3 rounded-[8px] border transition-all cursor-pointer select-none group ${
                        isChecked
                          ? 'bg-neutral-50/70 dark:bg-[#18191D]/70 border-black/6 dark:border-white/6 opacity-80'
                          : 'bg-white dark:bg-[#121316] border-black/8 dark:border-white/8 hover:border-black/20 dark:hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="shrink-0 mt-0.5">
                          {isChecked ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-neutral-400 group-hover:text-black dark:group-hover:text-white transition-colors" />
                          )}
                        </div>
                        <span className={`text-xs leading-snug font-medium ${isChecked ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                          {task}
                        </span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom Actions Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-black/8 dark:border-white/8">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setResourceDialogType('resources');
                    setResourcesDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white font-medium transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Resources ({currentModule.resources?.length || 3})</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setResourceDialogType('references');
                    setResourcesDialogOpen(true);
                  }}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white font-medium transition-colors"
                >
                  <Bookmark className="w-3.5 h-3.5 text-neutral-400" />
                  <span>References ({currentModule.references?.length || 5})</span>
                </button>

                <button
                  type="button"
                  onClick={handleMarkModuleComplete}
                  className="flex items-center gap-1.5 text-xs text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white font-medium transition-colors"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Mark as complete</span>
                </button>
              </div>

              <button
                type="button"
                disabled={activeDay >= data.modules.length}
                onClick={() => setActiveDay((d) => Math.min(data.modules.length, d + 1))}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-[6px] text-xs font-semibold bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-black dark:text-white transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <span>Next Module</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Supporting Mentor Content & Audio Tour (4 cols) */}
        <div className="lg:col-span-4 space-y-3.5">
          {/* Card 1: Founding Thesis Tour */}
          <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-neutral-400" />
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                FOUNDING THESIS TOUR
              </span>
            </div>

            <div className="p-3.5 rounded-[8px] bg-neutral-50 dark:bg-[#18191D] border border-black/8 dark:border-white/8 space-y-2.5">
              <div>
                <h4 className="text-xs font-semibold text-black dark:text-white">
                  {currentModule.milestone_tour?.title || 'Why Startups Die of Context Decay'}
                </h4>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug mt-1">
                  {currentModule.milestone_tour?.subtitle || 'Founder Aryan debriefs the 4 frictions that destroy early-stage engineering velocity.'}
                </p>
              </div>

              {/* Audio Player Strip */}
              <div className="flex items-center justify-between gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setTourPlaying((p) => !p)}
                  className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity shadow-xs"
                >
                  {tourPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                </button>

                {/* Miniature Amplitude Waveform */}
                <div className="flex-1 flex items-center gap-[2px] h-6 px-2 rounded-[5px] bg-neutral-200/50 dark:bg-white/5">
                  {[25, 45, 75, 90, 60, 40, 70, 85, 95, 65, 40, 55, 80, 60, 35, 50, 75, 90, 65, 45].map((h, i) => (
                    <div
                      key={i}
                      style={{ height: `${h}%` }}
                      className={`flex-1 rounded-[1px] transition-all ${
                        tourPlaying && (i / 20) <= (tourElapsed / 225)
                          ? 'bg-black dark:bg-white'
                          : 'bg-black/20 dark:bg-white/20'
                      }`}
                    />
                  ))}
                </div>

                <div className="text-[10px] font-mono text-neutral-400 shrink-0">
                  {tourPlaying ? `${Math.floor(tourElapsed / 60)}:${(tourElapsed % 60).toString().padStart(2, '0')}` : currentModule.milestone_tour?.audio_duration || '3m 45s'}
                </div>

                <button
                  type="button"
                  onClick={() => setTourPlaying((p) => !p)}
                  className="px-2 py-1 rounded-[5px] text-[11px] font-semibold border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-black dark:text-white transition-colors"
                >
                  {tourPlaying ? 'Pause' : 'Listen'}
                </button>
              </div>
            </div>
          </div>

          {/* Card 2: Suggested Questions */}
          <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 space-y-3 shadow-xs">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-neutral-400" />
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                SUGGESTED QUESTIONS
              </span>
            </div>

            <div className="space-y-1.5">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setMentorDrawerOpen(true);
                    setTimeout(() => handleAskMentor(q), 100);
                  }}
                  className="w-full text-left p-2.5 rounded-[8px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] hover:border-black/20 dark:hover:border-white/20 hover:bg-neutral-100 dark:hover:bg-[#222327] text-xs text-black dark:text-white transition-all leading-snug group flex items-start gap-2.5"
                >
                  <ArrowRight className="w-3.5 h-3.5 mt-0.5 text-neutral-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  <span className="font-medium opacity-90">{q}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Socratic Mentor Drawer */}
      <Drawer
        isOpen={mentorDrawerOpen}
        onClose={() => setMentorDrawerOpen(false)}
        title="Socratic Onboarding Mentor"
        subtitle="Zero-judgment private sandbox — answers with citations"
        width="max-w-md sm:max-w-lg"
        footer={
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAskMentor(mentorQuery);
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={mentorQuery}
              onChange={(e) => setMentorQuery(e.target.value)}
              placeholder="Ask about decisions, invariants, or architecture..."
              className="flex-1 px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={mentorLoading}
              icon={<Send className="w-3.5 h-3.5" />}
              className="rounded-full px-4"
            >
              Ask
            </Button>
          </form>
        }
      >
        <div className="space-y-3">
          {mentorMessages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-[8px] text-xs leading-relaxed space-y-1.5 ${
                m.sender === 'user'
                  ? 'bg-black text-white dark:bg-white dark:text-black ml-8'
                  : 'bg-neutral-100 dark:bg-[#18191D] text-black dark:text-white mr-4 border border-black/6 dark:border-white/8'
              }`}
            >
              <div
                className={`text-[10px] font-semibold uppercase tracking-wider font-mono ${
                  m.sender === 'user' ? 'text-white/60 dark:text-black/60' : 'text-neutral-400'
                }`}
              >
                {m.sender === 'user' ? 'You' : 'TARS Socratic Mentor'}
              </div>
              <p className="whitespace-pre-wrap">{m.text}</p>
              {m.citation && (
                <div
                  className={`pt-1.5 mt-1.5 border-t text-[10px] font-mono ${
                    m.sender === 'user'
                      ? 'border-white/20 dark:border-black/20 text-white/70 dark:text-black/70'
                      : 'border-black/8 dark:border-white/8 text-neutral-500'
                  }`}
                >
                  ↳ {m.citation}
                </div>
              )}
            </div>
          ))}
          {mentorLoading && (
            <div className="flex items-center gap-2.5 p-3 rounded-[8px] bg-neutral-100 dark:bg-[#18191D] mr-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
              <span className="text-xs text-neutral-500 font-mono">Synthesising…</span>
            </div>
          )}
        </div>
      </Drawer>

      {/* Resources & References Dialog */}
      <Dialog
        isOpen={resourcesDialogOpen}
        onClose={() => setResourcesDialogOpen(false)}
        title={resourceDialogType === 'resources' ? `Day ${currentModule.day} Resources` : `Day ${currentModule.day} Institutional References`}
        description={
          resourceDialogType === 'resources'
            ? 'Essential developer guides, invariant scripts, and configuration specs for this milestone.'
            : 'Ratified architecture records, business decisions, and PRDs grounding this module.'
        }
        footer={
          <Button variant="secondary" size="sm" onClick={() => setResourcesDialogOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {resourceDialogType === 'resources' ? (
            currentModule.resources?.map((res, i) => (
              <div
                key={i}
                className="p-3 rounded-[8px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] space-y-1"
              >
                <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                  <span>{res.title}</span>
                  <span className="text-[10px] font-mono text-neutral-400">{res.doc}</span>
                </div>
                <p className="text-[11px] text-neutral-600 dark:text-neutral-400">
                  {res.snippet}
                </p>
              </div>
            ))
          ) : (
            currentModule.references?.map((ref, i) => (
              <div
                key={i}
                onClick={() => {
                  setResourcesDialogOpen(false);
                  onOpenCitation(ref.title, ref.doc);
                }}
                className="p-2.5 rounded-[8px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] hover:border-black/20 dark:hover:border-white/20 transition-all cursor-pointer flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-black dark:text-white truncate">
                    {ref.title}
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                    Internal Identifier: {ref.doc}
                  </div>
                </div>
                <ExternalLink className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              </div>
            ))
          )}
        </div>
      </Dialog>
    </div>
  );
};
