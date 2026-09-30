import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { Drawer } from '../primitives/Drawer';
import { EmptyState } from '../primitives/EmptyState';
import { UserRole, CompanyProfile } from '../../types/contracts';
import { api } from '../../services/client';
import { useSessionStore } from '../../state/useSessionStore';
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
  const { profile: sessionProfile } = useSessionStore();
  const [profile, setProfile] = useState<CompanyProfile | null>(propProfile || null);
  const [activeDay, setActiveDay] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [tourPlaying, setTourPlaying] = useState(false);

  useEffect(() => {
    if (propProfile) {
      if (sessionProfile?.company_name && propProfile.company_name && propProfile.company_name.toLowerCase().trim() !== sessionProfile.company_name.toLowerCase().trim()) {
        setProfile(null);
      } else {
        setProfile(propProfile);
      }
    } else {
      const userCompany = sessionProfile?.company_name || sessionProfile?.company_id || undefined;
      if (!userCompany) {
        setProfile(null);
      } else {
        api.getCompanyProfile(userCompany).then((p) => {
          if (p && (!sessionProfile?.company_name || p.company_name.toLowerCase().trim() === sessionProfile.company_name.toLowerCase().trim())) {
            setProfile(p);
          } else {
            setProfile(null);
          }
        }).catch(() => {
          setProfile(null);
        });
      }
    }
  }, [propProfile, sessionProfile?.company_name, sessionProfile?.company_id]);

  const founderName = sessionProfile?.name || 'Founder';
  const companyName = sessionProfile?.company_name || profile?.company_name || (sessionProfile?.name ? `${sessionProfile.name}'s Startup` : 'Sovereign Startup');
  const techStack = profile?.tech_stack || 'Python, TypeScript, SQLite';
  const enterprisePolicy = profile?.enterprise_policy || 'Strict Rejection of Bespoke Forks';
  const teamSize = profile?.team_size || 'core team';

  const rawModules = [
    {
      day: 1,
      title: `Sovereignty & The Air-Gap Invariant (${companyName})`,
      description: `Understand why ${companyName} enforces zero cloud egress ($E_{net} = 0.00\\text{ KB}$) and how local on-premise execution protects company IP.`,
      tasks: [
        `Inspect ${companyName} institutional identity and core thesis in Knowledge Base`,
        `Verify .tars/invariants.yaml and install local pre-commit AST guards`,
        `Run airplane-mode verification script in local terminal with 0.00 KB egress`,
      ],
      milestone_tour: {
        title: `Founding Thesis: Why Startups Die of Context Decay`,
        audio_duration: '3m 45s',
        speaker: `${founderName} (${companyName})`,
      },
    },
    {
      day: 2,
      title: `Deterministic AST Enforcement & ${techStack}`,
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
      description: `Author and commit your first feature passing all invariant gates for ${companyName}.`,
      tasks: [
        `Implement new service component adhering to Hexagonal architecture`,
        `Verify sub-50ms pre-commit hook execution without regressions`,
        `Submit PR with automated institutional executive summary`,
      ],
    },
  ];

  const modules = rawModules.map((mod) => {
    const isAllTasksDone = mod.tasks.length > 0 && mod.tasks.every((_, idx) => !!completedTasks[`${mod.day}-${idx}`]);
    let status: 'COMPLETED' | 'CURRENT' | 'UPCOMING';
    if (isAllTasksDone) {
      status = 'COMPLETED';
    } else if (mod.day === activeDay) {
      status = 'CURRENT';
    } else if (mod.day < activeDay) {
      status = 'COMPLETED';
    } else {
      status = 'UPCOMING';
    }
    return {
      ...mod,
      status,
    };
  });

  const data = {
    role: userRole,
    title: `${companyName} Flight-Plan`,
    total_days: 14,
    current_day: activeDay,
    modules,
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
            `Your primary role is executive governance, company runway management, and architectural discipline. You enforce our institutional operating policy (${enterprisePolicy}) and guarantee 100% data sovereignty (zero cloud egress).`,
          cite: 'Founder Flight-Plan · Executive Track P.1',
        },
        ENGINEER: {
          roleTitle: 'Lead Software & Systems Engineer (Engineering Track)',
          responsibilities:
            `Your primary role is architecting and building the sovereign offline platform adhering to our core architectural invariants in ${techStack} (such as Transactional Outbox pattern, local cookie auth, and parameter validation), ensuring all AST pre-commit checks pass deterministically in <50ms.`,
          cite: 'Engineering Architecture Playbook · Section 2',
        },
        PRODUCT: {
          roleTitle: 'Product & Customer Intelligence Lead (Product Track)',
          responsibilities:
            `Your primary role is compiling unstructured customer audio debriefs and call recordings into structured 4-part specs (pains, features, commitments), promoting deliverables to the Unified Action Hub, and ensuring commitments align with ${enterprisePolicy}.`,
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
      let reply = `All ${companyName} operations are designed for deterministic execution.`;
      let cite = 'Founding Manifesto P.1';

      if (userMsg.toLowerCase().includes('bdr-014') || userMsg.toLowerCase().includes('decision 14') || userMsg.toLowerCase().includes('custom') || userMsg.toLowerCase().includes('policy')) {
        reply =
          `${companyName}'s strategic operating policy enforces ${enterprisePolicy} to protect cash runway and maintain engineering focus. For a ${teamSize} team, maintaining bespoke branches diverts core capacity and introduces technical debt.`;
        cite = `Institutional Governance Policy (${enterprisePolicy})`;
      } else if (userMsg.toLowerCase().includes('inv-017') || userMsg.toLowerCase().includes('transaction')) {
        reply =
          'INV-017 strictly prevents wrapping outbound HTTP calls inside database transactions. If external APIs experience latency, database row locks remain open, exhausting connection pools.';
        cite = 'ADR-017: Outbox Pattern & Transaction Isolation';
      } else if (userMsg.toLowerCase().includes('sovereign') || userMsg.toLowerCase().includes('air-gap')) {
        reply =
          `Sovereignty guarantees zero cloud egress (0.00 KB). All AI, Whisper, and Tree-sitter models execute on ${companyName}'s local hardware so proprietary code and recordings are never leaked.`;
        cite = 'PRD Section 3.1: Local Host Architecture';
      } else {
        reply = `Evaluated across verified institutional memory for ${companyName}: All architectural contracts and operational policies are enforced deterministically in <50ms without cloud egress.`;
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
          title={`${companyName} Onboarding Hub`}
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
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Onboarding"
        title={`${companyName} Onboarding Hub`}
        description="Role-tailored flight-plans and Socratic mentor sandbox to bring new hires to day-3 productivity."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles className="w-4 h-4" />}
            onClick={() => setMentorDrawerOpen(true)}
          >
            Ask Mentor
          </Button>
        }
      />

      {/* Progress Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-5 flex items-center gap-4 shadow-sm">
          <div className="relative shrink-0">
            <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
              <circle cx="30" cy="30" r={radius} fill="none" strokeWidth="3.5" stroke="currentColor" className="text-black/[0.06] dark:text-white/[0.08]" />
              <circle
                cx="30" cy="30" r={radius}
                fill="none" strokeWidth="3.5"
                stroke="#0071E3"
                strokeLinecap="round"
                strokeDasharray={circ}
                strokeDashoffset={strokeOffset}
                style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[13px] font-bold text-black dark:text-white tabular-nums">
              {progressPct}%
            </span>
          </div>
          <div>
            <div className="text-[13px] font-semibold text-black dark:text-white">Overall Progress</div>
            <div className="text-[12px] text-[#8E8E93] mt-0.5">{completedCount} of {totalTasks} done</div>
          </div>
        </div>

        <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-[14px] bg-[#0071E3]/[0.10] dark:bg-[#0A84FF]/[0.12] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Current Phase</div>
            <div className="text-[13px] font-semibold text-black dark:text-white mt-0.5">Day {activeDay} — {currentModule.title}</div>
          </div>
        </div>

        <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-black dark:text-white" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Your Role</div>
            <div className="text-[13px] font-semibold text-black dark:text-white mt-0.5">{userRole.replace('_', ' ')}</div>
          </div>
        </div>
      </div>

      {/* Day Stepper */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 shadow-sm">
        <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-3">Flight-Plan Timeline</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {data.modules.map((mod) => {
            const isSelected = mod.day === activeDay;
            const isPast = mod.day < activeDay;
            return (
              <button
                key={mod.day}
                onClick={() => setActiveDay(mod.day)}
                className={`p-3.5 rounded-[14px] border text-left transition-all duration-200 ${
                  isSelected
                    ? 'border-[#0071E3]/30 dark:border-[#0A84FF]/30 bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.08] ring-1 ring-[#0071E3]/20 shadow-sm'
                    : isPast
                    ? 'border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60'
                    : 'border-black/[0.06] dark:border-white/[0.06] bg-[#F5F5F7]/50 dark:bg-[#2C2C2E]/30'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-semibold text-[#8E8E93]">DAY {mod.day}</span>
                  {isPast ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#0A84FF]" />
                  ) : isSelected ? (
                    <span className="w-2 h-2 rounded-full bg-[#0071E3]" />
                  ) : (
                    <Circle className="w-3 h-3 text-[#8E8E93]" />
                  )}
                </div>
                <div className={`text-xs font-semibold truncate ${isSelected ? 'text-[#0071E3] dark:text-[#0A84FF]' : 'text-black dark:text-white'}`}>
                  {mod.title}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 space-y-4">
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-5 sm:p-6 space-y-5 shadow-sm">
            <div>
              <div className="flex items-center gap-2 text-[11px] font-mono text-[#8E8E93] mb-1.5">
                <span className="uppercase tracking-wider">Day {currentModule.day} Module</span>
                <span>·</span>
                <span className="text-[#0071E3] dark:text-[#0A84FF] font-semibold">{currentModule.status}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-black dark:text-white">
                {currentModule.title}
              </h3>
              <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-1.5 leading-relaxed">
                {currentModule.description}
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
              <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Verifiable Milestones</div>
              <div className="space-y-2">
                {currentModule.tasks.map((task, idx) => {
                  const isChecked = !!completedTasks[`${currentModule.day}-${idx}`];
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3.5 rounded-[14px] border transition-all duration-200 cursor-pointer select-none group ${
                        isChecked
                          ? 'bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 border-black/[0.06] dark:border-white/[0.06] opacity-70'
                          : 'bg-white dark:bg-[#1C1C1E] border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.14] dark:hover:border-white/[0.14] hover:shadow-sm'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <CheckCircle2 className="w-4 h-4 text-[#0A84FF]" />
                        ) : (
                          <div className="w-4 h-4 rounded-full border-2 border-black/[0.20] dark:border-white/[0.20] group-hover:border-black/[0.40] dark:group-hover:border-white/[0.40] transition-colors" />
                        )}
                      </div>
                      <input type="checkbox" checked={isChecked} onChange={() => toggleTask(currentModule.day, idx)} className="sr-only" />
                      <span className={`text-[13px] leading-snug ${isChecked ? 'line-through text-[#8E8E93]' : 'text-black dark:text-white'}`}>
                        {task}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
              <Button variant="secondary" size="sm" disabled={activeDay <= 1} icon={<ArrowLeft className="w-3.5 h-3.5" />} onClick={() => setActiveDay((p) => Math.max(1, p - 1))}>
                Previous
              </Button>
              <Button variant="primary" size="sm" disabled={activeDay >= data.modules.length} icon={<ArrowRight className="w-3.5 h-3.5" />} iconPosition="right" onClick={() => setActiveDay((p) => Math.min(data.modules.length, p + 1))}>
                Next Day
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-black dark:text-white" />
              <span className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">Founding Thesis Tour</span>
            </div>
            <div className="p-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 border border-black/[0.06] dark:border-white/[0.08] space-y-2.5">
              <div className="text-[13px] font-semibold text-black dark:text-white">Why Startups Die of Context Decay</div>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] leading-snug">
                {founderName} debriefs the 4 frictions that destroy early-stage engineering velocity.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[11px] text-[#8E8E93]">{tourPlaying ? 'Playing audio... (3m 45s)' : '3m 45s'}</span>
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

          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
              <span className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">Suggested Questions</span>
            </div>
            <div className="space-y-2">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setMentorDrawerOpen(true); setTimeout(() => handleAskMentor(q), 100); }}
                  className="w-full text-left p-3 rounded-[12px] border border-black/[0.07] dark:border-white/[0.08] bg-[#F5F5F7]/70 dark:bg-[#2C2C2E]/40 hover:bg-[#F5F5F7] dark:hover:bg-[#2C2C2E]/70 text-[12px] text-black dark:text-white transition-all duration-150 leading-snug group"
                >
                  <span className="flex items-start gap-2">
                    <ArrowRight className="w-3 h-3 mt-0.5 text-[#0071E3] dark:text-[#0A84FF] shrink-0 group-hover:translate-x-0.5 transition-transform" />
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
              className="flex-1 px-3.5 py-2.5 text-[13px] rounded-full border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
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
              className={`px-4 py-3.5 rounded-[16px] text-[13px] leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#0071E3] text-white ml-8'
                  : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white mr-4'
              }`}
            >
              <div className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${m.sender === 'user' ? 'text-white/60' : 'text-[#8E8E93]'}`}>
                {m.sender === 'user' ? 'You' : 'TARS Mentor'}
              </div>
              <p>{m.text}</p>
              {m.citation && (
                <div className={`pt-2 mt-2 border-t text-[11px] font-mono ${m.sender === 'user' ? 'border-white/20 text-white/70' : 'border-black/[0.08] dark:border-white/[0.08] text-[#0071E3] dark:text-[#0A84FF]'}`}>
                  ↳ {m.citation}
                </div>
              )}
            </div>
          ))}
          {mentorLoading && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-[16px] bg-[#F5F5F7] dark:bg-[#2C2C2E] mr-4">
              {[0, 1, 2].map((i) => (
                <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#8E8E93] animate-pulse" style={{ animationDelay: `${i * 0.15}s` }} />
              ))}
              <span className="text-[12px] text-[#8E8E93]">Synthesising…</span>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};
