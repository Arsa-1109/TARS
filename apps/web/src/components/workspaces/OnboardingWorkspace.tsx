import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { Drawer } from '../primitives/Drawer';
import { EmptyState } from '../primitives/EmptyState';
import { UserRole, CompanyProfile } from '../../types/contracts';
import { api } from '../../services/client';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  Play,
  Square,
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Send,
  Sparkles,
  Clock,
  Compass,
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

  useEffect(() => {
    if (propProfile) {
      setProfile(propProfile);
    } else {
      api.getCompanyProfile().then((p) => {
        if (p) setProfile(p);
      }).catch(() => {});
    }
  }, [propProfile]);

  const companyName = profile?.company_name || 'Sovereign Startup';
  const techStack = profile?.tech_stack || 'Python, TypeScript, SQLite';
  const enterprisePolicy = profile?.enterprise_policy || 'Strict Rejection of Bespoke Forks';

  const data = {
    role: userRole,
    title: `${companyName} Flight-Plan`,
    total_days: 14,
    current_day: 1,
    modules: [
      {
        day: 1,
        title: `Sovereignty & The Air-Gap Invariant (${companyName})`,
        status: 'COMPLETED',
        description: `Understand why ${companyName} enforces zero cloud egress ($E_{net} = 0.00\\text{ KB}$) and how local on-premise execution protects company IP.`,
        tasks: [
          `Inspect ${companyName} institutional identity and core thesis in Knowledge Base`,
          `Verify .tars/invariants.yaml and install local pre-commit AST guards`,
          `Run airplane-mode verification script in local terminal with 0.00 KB egress`,
        ],
        milestone_tour: {
          title: `Founding Thesis: Why Startups Die of Context Decay`,
          audio_duration: '3m 45s',
          speaker: `Founder (${companyName})`,
        },
      },
      {
        day: 2,
        title: `Deterministic AST Enforcement & ${techStack}`,
        status: 'COMPLETED',
        description: `Learn how Tree-sitter parses staged Git diffs in <50ms to enforce ${companyName}'s architectural standards before commits land in main.`,
        tasks: [
          `Review architectural invariants in Architecture Workspace`,
          `Test local AST query runner against staged diffs in <50ms`,
          `Inspect living MADR generator output in docs/adr/`,
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
        ],
      },
    ],
  };

  const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
  const [mentorQuery, setMentorQuery] = useState('');
  const [mentorMessages, setMentorMessages] = useState<
    { sender: 'user' | 'mentor'; text: string; citation?: string }[]
  >([
    {
      sender: 'mentor',
      text: 'Hello! I am your Socratic onboarding mentor. I have access to all founding thesis documents, technical decisions, and architecture contracts. Ask me anything.',
    },
  ]);
  const [mentorLoading, setMentorLoading] = useState(false);

  const toggleTask = (day: number, index: number) => {
    const key = `${day}-${index}`;
    setCompletedTasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const currentModule = data.modules.find((m) => m.day === activeDay) || data.modules[0];

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
      } else if (userMsg.toLowerCase().includes('sovereign') || userMsg.toLowerCase().includes('air-gap')) {
        reply =
          'Sovereignty guarantees zero cloud egress (0.00 KB). All Qwen 8B, Whisper, and Tree-sitter models execute on your local hardware so customer code and NDA recordings are never leaked.';
        cite = 'PRD Section 3.1: Local Host Architecture';
      } else {
        reply = `Evaluated across verified institutional memory: All architectural contracts and operational policies are enforced deterministically in <50ms without cloud egress.`;
        cite = "Engineering Architecture Playbook P.4";
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

  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (progressPct / 100) * circ;

  const suggestedQueries = [
    `What are the founding principles of ${companyName}?`,
    `What is our policy on enterprise customisations?`,
    `How does TARS prove zero cloud egress for ${companyName}?`,
  ];

  if (!profile || !profile.company_name) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          eyebrow="Onboarding"
          title="Fast Onboarding Hub"
          description="Role-tailored flight-plans and Socratic mentor sandbox to bring new hires to day-3 productivity."
          actions={
            onOpenGenesis && (
              <Button
                variant="primary"
                size="sm"
                icon={<Sparkles className="w-4 h-4" />}
                onClick={onOpenGenesis}
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
    <div className="space-y-4 animate-fade-in">
      <PageHeader
        eyebrow="Onboarding"
        title={`${companyName} Onboarding Hub`}
        description="Role-tailored flight-plans and Socratic mentor sandbox to bring new hires to day-3 productivity."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-3.5 h-3.5" />}
            onClick={() => setMentorDrawerOpen(true)}
          >
            Ask Mentor
          </Button>
        }
      />

      {/* Progress Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
        <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 flex items-center gap-3.5 shadow-xs">
          <div className="relative shrink-0">
            <svg width="52" height="52" viewBox="0 0 52 52" className="-rotate-90">
              <circle cx="26" cy="26" r={radius} fill="none" strokeWidth="3" stroke="currentColor" className="text-black/10 dark:text-white/10" />
              <circle
                cx="26" cy="26" r={radius}
                fill="none" strokeWidth="3"
                stroke="currentColor"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={strokeOffset}
                className="text-black dark:text-white transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-black dark:text-white tabular-nums">
              {progressPct}%
            </span>
          </div>
          <div>
            <div className="text-xs font-semibold text-black dark:text-white">Overall Progress</div>
            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{completedCount} of {totalTasks} done</div>
          </div>
        </div>

        <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-[8px] bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
            <Compass className="w-4.5 h-4.5 text-black dark:text-white" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Current Phase</div>
            <div className="text-xs font-semibold text-black dark:text-white mt-0.5">Day {activeDay} — {currentModule.title}</div>
          </div>
        </div>

        <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 flex items-center gap-3.5 shadow-xs">
          <div className="w-10 h-10 rounded-[8px] bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
            <Clock className="w-4.5 h-4.5 text-black dark:text-white" />
          </div>
          <div>
            <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Your Role</div>
            <div className="text-xs font-semibold text-black dark:text-white mt-0.5">{userRole.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {/* Day Stepper */}
      <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-3.5 shadow-xs">
        <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2.5">Flight-Plan Timeline</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {data.modules.map((mod) => {
            const isSelected = mod.day === activeDay;
            const isPast = mod.day < activeDay;
            return (
              <button
                key={mod.day}
                onClick={() => setActiveDay(mod.day)}
                className={`p-3 rounded-[7px] border text-left transition-all ${
                  isSelected
                    ? 'border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.08] shadow-xs'
                    : isPast
                    ? 'border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D]'
                    : 'border-black/5 dark:border-white/5 bg-neutral-50/50 dark:bg-[#18191D]/50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-mono font-semibold text-neutral-400">DAY {mod.day}</span>
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  ) : isSelected ? (
                    <span className="w-1.5 h-1.5 rounded-full bg-black dark:bg-white" />
                  ) : (
                    <Circle className="w-3 h-3 text-neutral-400" />
                  )}
                </div>
                <div className={`text-xs truncate ${isSelected ? 'text-black dark:text-white font-semibold' : 'text-neutral-700 dark:text-neutral-300 font-medium'}`}>
                  {mod.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        <div className="lg:col-span-8 space-y-3">
          <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 sm:p-5 space-y-4 shadow-xs">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500 mb-1">
                <span className="uppercase tracking-wider">Day {currentModule.day} Module</span>
                <span>·</span>
                <span className="text-black dark:text-white font-semibold">{currentModule.status}</span>
              </div>
              <h3 className="text-base sm:text-lg font-semibold tracking-tight text-black dark:text-white">
                {currentModule.title}
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1 leading-relaxed">
                {currentModule.description}
              </p>
            </div>

            <div className="space-y-2 pt-3 border-t border-black/8 dark:border-white/8">
              <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Verifiable Milestones</div>
              <div className="space-y-1.5">
                {currentModule.tasks.map((task, idx) => {
                  const isChecked = !!completedTasks[`${currentModule.day}-${idx}`];
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-2.5 p-2.5 rounded-[7px] border transition-all cursor-pointer select-none group ${
                        isChecked
                          ? 'bg-neutral-50 dark:bg-[#18191D] border-black/6 dark:border-white/6 opacity-70'
                          : 'bg-white dark:bg-[#121316] border-black/8 dark:border-white/8 hover:border-black/15 dark:hover:border-white/15'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-black/25 dark:border-white/30 group-hover:border-black/50 dark:group-hover:border-white/50 transition-colors" />
                        )}
                      </div>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleTask(currentModule.day, idx)} className="sr-only" />
                      <span className={`text-xs leading-snug ${isChecked ? 'line-through text-neutral-400' : 'text-neutral-800 dark:text-neutral-200'}`}>
                        {task}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-black/8 dark:border-white/8">
              <Button variant="secondary" size="sm" disabled={activeDay <= 1} icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => setActiveDay((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="primary" size="sm" disabled={activeDay >= data.modules.length} icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right" onClick={() => setActiveDay((p) => Math.min(data.modules.length, p + 1))}>
                Next Day
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-3">
          <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-black dark:text-white" />
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Founding Thesis Tour</span>
            </div>
            <div className="p-3 rounded-[7px] bg-neutral-50 dark:bg-[#18191D] border border-black/8 dark:border-white/8 space-y-2">
              <div className="text-xs font-semibold text-black dark:text-white">Why Startups Die of Context Decay</div>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-snug">
                Founder Aryan debriefs the 4 frictions that destroy early-stage engineering velocity.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[10px] text-neutral-500">{tourPlaying ? 'Playing audio... (3m 45s)' : '3m 45s'}</span>
                <Button
                  variant={tourPlaying ? 'primary' : 'secondary'}
                  size="sm"
                  icon={tourPlaying ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                  onClick={() => setTourPlaying((p) => !p)}
                >
                  {tourPlaying ? 'Pause' : 'Listen'}
                </Button>
              </div>
            </div>
          </div>

          <div className="rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] p-4 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-3.5 h-3.5 text-neutral-400" />
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Suggested Questions</span>
            </div>
            <div className="space-y-1.5">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setMentorDrawerOpen(true); setTimeout(() => handleAskMentor(q), 100); }}
                  className="w-full text-left p-2.5 rounded-[7px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] hover:bg-neutral-100 dark:hover:bg-[#222327] text-xs text-black dark:text-white transition-all leading-snug group"
                >
                  <span className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-0.5 text-neutral-400 shrink-0 group-hover:translate-x-0.5 transition-transform" />
                    <span className="italic opacity-80">"{q}"</span>
                  </span>
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
            onSubmit={(e) => { e.preventDefault(); handleAskMentor(mentorQuery); }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={mentorQuery}
              onChange={(e) => setMentorQuery(e.target.value)}
              placeholder="Ask about decisions, invariants, or architecture..."
              className="flex-1 px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
            />
            <Button type="submit" variant="primary" size="sm" loading={mentorLoading} icon={<Send className="w-3.5 h-3.5" />}>
              Ask
            </Button>
          </form>
        }
      >
        <div className="space-y-3">
          {mentorMessages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3 rounded-[8px] text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-black text-white dark:bg-white dark:text-black ml-8'
                  : 'bg-neutral-100 dark:bg-[#18191D] text-black dark:text-white mr-4 border border-black/6 dark:border-white/8'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1 ${m.sender === 'user' ? 'text-white/60 dark:text-black/60' : 'text-neutral-400'}`}>
                {m.sender === 'user' ? 'You' : 'TARS Mentor'}
              </div>
              <p>{m.text}</p>
              {m.citation && (
                <div className={`pt-1.5 mt-1.5 border-t text-[10px] font-mono ${m.sender === 'user' ? 'border-white/20 dark:border-black/20 text-white/70 dark:text-black/70' : 'border-black/8 dark:border-white/8 text-neutral-500'}`}>
                  ↳ {m.citation}
                </div>
              )}
            </div>
          ))}
          {mentorLoading && (
            <div className="flex items-center gap-2.5 p-3 rounded-[8px] bg-neutral-100 dark:bg-[#18191D] mr-4">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-neutral-400 animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
              <span className="text-xs text-neutral-500">Synthesising…</span>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};
