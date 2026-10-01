import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { Drawer } from '../primitives/Drawer';
import { EmptyState } from '../primitives/EmptyState';
import {
  UserRole,
  CompanyProfile,
  OnboardingFlightPlanDTO,
  OnboardingModuleDTO,
} from '../../types/contracts';
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
  Sliders,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Check,
  Building2,
  Lock,
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
}) => {
  const { profile: sessionProfile } = useSessionStore();
  const [profile, setProfile] = useState<CompanyProfile | null>(propProfile || null);
  const [flightPlan, setFlightPlan] = useState<OnboardingFlightPlanDTO | null>(null);
  const [activeDay, setActiveDay] = useState(1);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [tourPlaying, setTourPlaying] = useState(false);
  const [isLoadingPlan, setIsLoadingPlan] = useState(false);

  // Founder Studio Drawer State
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioModules, setStudioModules] = useState<OnboardingModuleDTO[]>([]);
  const [studioActiveDay, setStudioActiveDay] = useState(1);
  const [studioSaving, setStudioSaving] = useState(false);
  const [studioToast, setStudioToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [newTaskInput, setNewTaskInput] = useState('');

  // Socratic Mentor State
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

  // Synchronise Profile
  useEffect(() => {
    if (propProfile) {
      if (
        sessionProfile?.company_name &&
        propProfile.company_name &&
        propProfile.company_name.toLowerCase().trim() !== sessionProfile.company_name.toLowerCase().trim()
      ) {
        setProfile(null);
      } else {
        setProfile(propProfile);
      }
    } else {
      const userCompany = sessionProfile?.company_name || sessionProfile?.company_id || undefined;
      if (!userCompany) {
        setProfile(null);
      } else {
        api
          .getCompanyProfile(userCompany)
          .then((p) => {
            if (
              p &&
              (!sessionProfile?.company_name ||
                p.company_name.toLowerCase().trim() === sessionProfile.company_name.toLowerCase().trim())
            ) {
              setProfile(p);
            } else {
              setProfile(null);
            }
          })
          .catch(() => {
            setProfile(null);
          });
      }
    }
  }, [propProfile, sessionProfile?.company_name, sessionProfile?.company_id]);

  const targetCompanyName = useMemo(() => {
    return (
      sessionProfile?.company_name ||
      profile?.company_name ||
      (sessionProfile?.name ? `${sessionProfile.name}'s Startup` : 'Sovereign Startup')
    );
  }, [sessionProfile?.company_name, sessionProfile?.name, profile?.company_name]);

  const currentUserId = useMemo(() => {
    return sessionProfile?.id || sessionProfile?.email || (userRole === 'NEW_HIRE' ? 'usr-chloe' : 'usr-alex');
  }, [sessionProfile?.id, sessionProfile?.email, userRole]);

  // Load Flight Plan from Backend SQLite
  const loadFlightPlan = async (compName: string, uId: string) => {
    try {
      setIsLoadingPlan(true);
      const plan = await api.getFlightPlan(compName, uId);
      if (plan) {
        setFlightPlan(plan);
        setCompletedTasks(plan.completed_tasks || {});
      }
    } catch (err) {
      console.warn('Notice: Failed to load flight plan from server:', err);
    } finally {
      setIsLoadingPlan(false);
    }
  };

  useEffect(() => {
    if (profile?.company_name || sessionProfile?.company_name) {
      loadFlightPlan(targetCompanyName, currentUserId);
    }
  }, [targetCompanyName, currentUserId, profile?.company_name, sessionProfile?.company_name]);

  // Toggle Task Completion with SQLite Persistence
  const toggleTask = async (day: number, index: number) => {
    const key = `${day}-${index}`;
    const nextVal = !completedTasks[key];

    // Optimistic UI update
    setCompletedTasks((prev) => ({ ...prev, [key]: nextVal }));

    try {
      const res = await api.updateTaskProgress({
        company_name: flightPlan?.company_name || targetCompanyName,
        user_id: currentUserId,
        task_key: key,
        completed: nextVal,
      });
      if (res && res.completed_tasks) {
        setCompletedTasks(res.completed_tasks);
      }
    } catch (err) {
      console.warn('Notice: Failed to sync task progress to server:', err);
    }
  };

  // Founder Studio Handlers
  const handleOpenStudio = () => {
    const initialModules =
      flightPlan?.modules && flightPlan.modules.length > 0
        ? JSON.parse(JSON.stringify(flightPlan.modules))
        : [];
    setStudioModules(initialModules);
    setStudioActiveDay(1);
    setStudioToast(null);
    setNewTaskInput('');
    setStudioOpen(true);
  };

  const handleAddDay = () => {
    if (studioModules.length >= 14) {
      setStudioToast({ message: 'Maximum 14 onboarding days allowed.', type: 'error' });
      return;
    }
    const nextDay = studioModules.length + 1;
    const newModule: OnboardingModuleDTO = {
      id: `MOD-${Date.now()}`,
      day: nextDay,
      title: `Day ${nextDay}: Deepening Operational Autonomy`,
      description: `Targeted milestones and compliance check-offs for ${targetCompanyName}.`,
      tasks: [
        `Review architecture invariants and verification tests for Day ${nextDay}`,
        `Document institutional learnings into Knowledge Base`,
      ],
      order_index: nextDay,
      is_published: true,
      status: 'UPCOMING',
    };
    setStudioModules((prev) => [...prev, newModule]);
    setStudioActiveDay(nextDay);
  };

  const handleDeleteDay = (dayToDelete: number) => {
    if (studioModules.length <= 1) {
      setStudioToast({ message: 'A flight-plan must have at least 1 day.', type: 'error' });
      return;
    }
    const filtered = studioModules
      .filter((m) => m.day !== dayToDelete)
      .map((m, idx) => ({ ...m, day: idx + 1, order_index: idx + 1 }));
    setStudioModules(filtered);
    setStudioActiveDay((prev) => Math.min(prev, filtered.length));
  };

  const handleUpdateDayField = (day: number, field: 'title' | 'description', value: string) => {
    setStudioModules((prev) =>
      prev.map((m) => (m.day === day ? { ...m, [field]: value } : m))
    );
  };

  const handleAddTask = (day: number) => {
    if (!newTaskInput.trim()) return;
    const text = newTaskInput.trim();
    setStudioModules((prev) =>
      prev.map((m) => (m.day === day ? { ...m, tasks: [...m.tasks, text] } : m))
    );
    setNewTaskInput('');
  };

  const handleUpdateTask = (day: number, taskIdx: number, text: string) => {
    setStudioModules((prev) =>
      prev.map((m) => {
        if (m.day === day) {
          const nextTasks = [...m.tasks];
          nextTasks[taskIdx] = text;
          return { ...m, tasks: nextTasks };
        }
        return m;
      })
    );
  };

  const handleDeleteTask = (day: number, taskIdx: number) => {
    setStudioModules((prev) =>
      prev.map((m) => {
        if (m.day === day) {
          const nextTasks = m.tasks.filter((_, i) => i !== taskIdx);
          return { ...m, tasks: nextTasks };
        }
        return m;
      })
    );
  };

  const handleMoveTask = (day: number, taskIdx: number, direction: 'UP' | 'DOWN') => {
    setStudioModules((prev) =>
      prev.map((m) => {
        if (m.day === day) {
          const targetIdx = direction === 'UP' ? taskIdx - 1 : taskIdx + 1;
          if (targetIdx < 0 || targetIdx >= m.tasks.length) return m;
          const nextTasks = [...m.tasks];
          const temp = nextTasks[taskIdx];
          nextTasks[taskIdx] = nextTasks[targetIdx];
          nextTasks[targetIdx] = temp;
          return { ...m, tasks: nextTasks };
        }
        return m;
      })
    );
  };

  const handleResetToDefaults = async () => {
    try {
      setStudioSaving(true);
      const res = await api.resetFlightPlanDefaults(targetCompanyName);
      if (res) {
        setFlightPlan(res);
        setStudioModules(JSON.parse(JSON.stringify(res.modules || [])));
        setStudioActiveDay(1);
        setStudioToast({
          message: 'Reset to intelligent Genesis-calibrated defaults.',
          type: 'success',
        });
      }
    } catch (err) {
      setStudioToast({ message: 'Failed to reset flight-plan defaults.', type: 'error' });
    } finally {
      setStudioSaving(false);
    }
  };

  const handleSaveAndPublish = async () => {
    try {
      setStudioSaving(true);
      const res = await api.saveFlightPlan({
        company_name: targetCompanyName,
        title: `${targetCompanyName} Flight-Plan`,
        total_days: Math.max(14, studioModules.length),
        modules: studioModules,
      });
      if (res) {
        setFlightPlan(res);
        setStudioToast({
          message: 'Flight-plan published live to all company members.',
          type: 'success',
        });
        setTimeout(() => {
          setStudioOpen(false);
        }, 800);
      }
    } catch (err) {
      setStudioToast({ message: 'Failed to save and publish flight-plan.', type: 'error' });
    } finally {
      setStudioSaving(false);
    }
  };

  const founderName = sessionProfile?.name || 'Founder';
  const companyName = targetCompanyName;
  const techStack = profile?.tech_stack || 'Python, TypeScript, SQLite';
  const enterprisePolicy = profile?.enterprise_policy || 'Strict Rejection of Bespoke Forks';
  const teamSize = profile?.team_size || 'core team';

  // Active Modules
  const modules = useMemo(() => {
    const raw = flightPlan?.modules || [];
    return raw.map((mod) => {
      const isAllTasksDone =
        mod.tasks.length > 0 &&
        mod.tasks.every((_, idx) => !!completedTasks[`${mod.day}-${idx}`]);
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
  }, [flightPlan?.modules, completedTasks, activeDay]);

  const currentModule = modules.find((m) => m.day === activeDay) || modules[0] || {
    day: 1,
    title: 'Initialising Flight-Plan',
    description: 'Loading sovereign onboarding modules...',
    tasks: [],
    status: 'CURRENT' as const,
  };

  const totalTasks = modules.reduce((acc, m) => acc + m.tasks.length, 0);
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (progressPct / 100) * circ;

  const suggestedQueries = [
    `What are the founding principles of ${companyName}?`,
    `What is our policy on enterprise customisations?`,
    `How does TARS prove zero cloud egress for ${companyName}?`,
  ];

  // Socratic Mentor Question Handler
  const handleAskMentor = async (questionText: string) => {
    if (!questionText.trim()) return;
    const userMsg = questionText.trim();
    setMentorMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setMentorQuery('');
    setMentorLoading(true);

    const lower = userMsg.toLowerCase();
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

      if (
        userMsg.toLowerCase().includes('bdr-014') ||
        userMsg.toLowerCase().includes('decision 14') ||
        userMsg.toLowerCase().includes('custom') ||
        userMsg.toLowerCase().includes('policy')
      ) {
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
        cite = 'Engineering Architecture Playbook P.4';
      }
      return { reply, cite };
    };

    try {
      const searchRes = await api.search({
        query: userMsg,
        department: 'ALL',
        clearance: userRole === 'FOUNDER' ? 'EXECUTIVE_ONLY' : 'ALL_TEAM',
        user_role: userRole,
      });

      if (
        searchRes &&
        searchRes.answer &&
        searchRes.answer.trim().length > 0 &&
        !searchRes.answer.startsWith('Found 0')
      ) {
        let reply = searchRes.answer;
        const cite =
          searchRes.citations && searchRes.citations.length > 0
            ? `${searchRes.citations[0].doc_title} (P.${searchRes.citations[0].page_number || 1})`
            : 'TARS Institutional Intelligence';
        if (
          searchRes.citations &&
          searchRes.citations.length > 0 &&
          !reply.includes(searchRes.citations[0].snippet)
        ) {
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

  // If company profile does not exist at all, offer Genesis onboarding
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

  // Active module inside Founder Studio drawer
  const studioCurrentModule =
    studioModules.find((m) => m.day === studioActiveDay) || studioModules[0];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Onboarding"
        title={`${companyName} Onboarding Hub`}
        description="Role-tailored flight-plans and Socratic mentor sandbox to bring new hires to day-3 productivity."
        actions={
          <div className="flex items-center gap-2.5">
            {userRole === 'FOUNDER' && (
              <Button
                variant="secondary"
                size="sm"
                icon={<Sliders className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />}
                onClick={handleOpenStudio}
              >
                Configure Flight-Plan
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              icon={<Sparkles className="w-4 h-4" />}
              onClick={() => setMentorDrawerOpen(true)}
            >
              Ask Mentor
            </Button>
          </div>
        }
      />

      {/* Progress Overview Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-5 flex items-center gap-4 shadow-sm">
          <div className="relative shrink-0">
            <svg width="60" height="60" viewBox="0 0 60 60" className="-rotate-90">
              <circle
                cx="30"
                cy="30"
                r={radius}
                fill="none"
                strokeWidth="3.5"
                stroke="currentColor"
                className="text-black/[0.06] dark:text-white/[0.08]"
              />
              <circle
                cx="30"
                cy="30"
                r={radius}
                fill="none"
                strokeWidth="3.5"
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
            <div className="text-[12px] text-[#8E8E93] mt-0.5">
              {completedCount} of {totalTasks} done
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-[14px] bg-[#0071E3]/[0.10] dark:bg-[#0A84FF]/[0.12] flex items-center justify-center shrink-0">
            <Compass className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Current Phase</div>
            <div className="text-[13px] font-semibold text-black dark:text-white mt-0.5 truncate">
              Day {activeDay} — {currentModule.title}
            </div>
          </div>
        </div>

        <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-5 flex items-center gap-4 shadow-sm">
          <div className="w-11 h-11 rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-black dark:text-white" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Your Role</div>
            <div className="text-[13px] font-semibold text-black dark:text-white mt-0.5">
              {userRole.replace('_', ' ')}
            </div>
          </div>
        </div>
      </div>

      {/* Day Stepper */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
            Flight-Plan Timeline ({modules.length} Modules Active)
          </div>
          {isLoadingPlan && (
            <span className="text-[11px] font-mono text-[#8E8E93] animate-pulse">Syncing...</span>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {modules.map((mod) => {
            const isSelected = mod.day === activeDay;
            const isPast = mod.status === 'COMPLETED';
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
                <div
                  className={`text-xs font-semibold truncate ${
                    isSelected ? 'text-[#0071E3] dark:text-[#0A84FF]' : 'text-black dark:text-white'
                  }`}
                >
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
                <span className="text-[#0071E3] dark:text-[#0A84FF] font-semibold">
                  {currentModule.status}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-bold tracking-tight text-black dark:text-white">
                {currentModule.title}
              </h3>
              <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-1.5 leading-relaxed">
                {currentModule.description}
              </p>
            </div>

            <div className="space-y-2.5 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                  Verifiable Milestones
                </div>
                <span className="text-[11px] font-mono text-[#8E8E93]">
                  {currentModule.tasks.filter((_, idx) => !!completedTasks[`${currentModule.day}-${idx}`]).length} of {currentModule.tasks.length} done
                </span>
              </div>
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
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTask(currentModule.day, idx)}
                        className="sr-only"
                      />
                      <span
                        className={`text-[13px] leading-snug ${
                          isChecked ? 'line-through text-[#8E8E93]' : 'text-black dark:text-white'
                        }`}
                      >
                        {task}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-black/[0.06] dark:border-white/[0.06]">
              <Button
                variant="secondary"
                size="sm"
                disabled={activeDay <= 1}
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => setActiveDay((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={activeDay >= modules.length}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
                onClick={() => setActiveDay((p) => Math.min(modules.length, p + 1))}
              >
                Next Day
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4">
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-black dark:text-white" />
              <span className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                Founding Thesis Tour
              </span>
            </div>
            <div className="p-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 border border-black/[0.06] dark:border-white/[0.08] space-y-2.5">
              <div className="text-[13px] font-semibold text-black dark:text-white">
                {currentModule.milestone_tour?.title || 'Why Startups Die of Context Decay'}
              </div>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] leading-snug">
                {currentModule.milestone_tour?.speaker || founderName} debriefs the 4 frictions that destroy early-stage engineering velocity.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[11px] text-[#8E8E93]">
                  {tourPlaying
                    ? `Playing audio... (${currentModule.milestone_tour?.audio_duration || '3m 45s'})`
                    : currentModule.milestone_tour?.audio_duration || '3m 45s'}
                </span>
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
              <span className="text-[12px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                Suggested Questions
              </span>
            </div>
            <div className="space-y-2">
              {suggestedQueries.map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMentorDrawerOpen(true);
                    setTimeout(() => handleAskMentor(q), 100);
                  }}
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

      {/* Founder Flight-Plan Studio Drawer */}
      <Drawer
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        title="Founder Flight-Plan Studio"
        subtitle={`Design and publish ${companyName}'s live onboarding curriculum`}
        width="max-w-xl sm:max-w-2xl"
        footer={
          <div className="flex items-center justify-between w-full">
            <Button
              variant="ghost"
              size="sm"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={handleResetToDefaults}
              loading={studioSaving}
            >
              Reset to Defaults
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setStudioOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={<Check className="w-3.5 h-3.5" />}
                loading={studioSaving}
                onClick={handleSaveAndPublish}
              >
                Save & Publish
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-6">
          {/* Tenant Status Pill */}
          <div className="flex items-center justify-between p-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E]/70 border border-black/[0.06] dark:border-white/[0.08]">
            <div className="flex items-center gap-2.5">
              <Building2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
              <div>
                <span className="text-xs font-semibold text-black dark:text-white block">{companyName}</span>
                <span className="text-[11px] text-[#8E8E93]">Sovereign Onboarding Database · SQLite WAL</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#0071E3] dark:text-[#0A84FF] text-[11px] font-medium border border-black/[0.06] dark:border-white/[0.08]">
              <Lock className="w-3 h-3" />
              Isolated
            </div>
          </div>

          {/* Toast / Banner */}
          {studioToast && (
            <div
              className={`p-3 rounded-[12px] text-xs font-medium flex items-center justify-between ${
                studioToast.type === 'success'
                  ? 'bg-[#0071E3]/10 text-[#0051A2] dark:text-[#0A84FF] border border-[#0071E3]/20'
                  : 'bg-[#FF3B30]/10 text-[#D70015] dark:text-[#FF453A] border border-[#FF3B30]/20'
              }`}
            >
              <span>{studioToast.message}</span>
              <button onClick={() => setStudioToast(null)} className="text-xs opacity-60 hover:opacity-100">
                ✕
              </button>
            </div>
          )}

          {/* Day Stepper Selector */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                Select Day to Configure
              </span>
              <Button
                variant="ghost"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddDay}
              >
                Add Day
              </Button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {studioModules.map((m) => {
                const isSelected = m.day === studioActiveDay;
                return (
                  <button
                    key={m.day}
                    onClick={() => setStudioActiveDay(m.day)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium shrink-0 transition-all ${
                      isSelected
                        ? 'bg-[#0071E3] text-white shadow-sm'
                        : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white hover:bg-black/[0.08] dark:hover:bg-white/[0.10]'
                    }`}
                  >
                    Day {m.day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Module Editor */}
          {studioCurrentModule && (
            <div className="space-y-4 p-4 rounded-[16px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold text-[#8E8E93]">
                  DAY {studioCurrentModule.day} MODULE CONFIGURATION
                </span>
                {studioModules.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#D70015] dark:hover:text-[#FF453A] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDeleteDay(studioCurrentModule.day)}
                  >
                    Remove Day
                  </Button>
                )}
              </div>

              {/* Module Title */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                  Module Title
                </label>
                <input
                  type="text"
                  value={studioCurrentModule.title}
                  onChange={(e) =>
                    handleUpdateDayField(studioCurrentModule.day, 'title', e.target.value)
                  }
                  placeholder="e.g. Sovereignty & Air-Gap Invariant"
                  className="w-full px-3.5 py-2 text-[13px] rounded-[10px] border border-black/[0.12] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
                />
              </div>

              {/* Module Description */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                  Module Description
                </label>
                <textarea
                  rows={2}
                  value={studioCurrentModule.description}
                  onChange={(e) =>
                    handleUpdateDayField(studioCurrentModule.day, 'description', e.target.value)
                  }
                  placeholder="What will the new hire master during this day?"
                  className="w-full px-3.5 py-2 text-[13px] rounded-[10px] border border-black/[0.12] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all resize-none"
                />
              </div>

              {/* Task List Management */}
              <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                    Interactive Milestones ({studioCurrentModule.tasks.length})
                  </span>
                </div>

                <div className="space-y-2">
                  {studioCurrentModule.tasks.map((task, tIdx) => (
                    <div
                      key={tIdx}
                      className="flex items-center gap-2 p-2 rounded-[12px] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 border border-black/[0.06] dark:border-white/[0.06]"
                    >
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          disabled={tIdx === 0}
                          onClick={() => handleMoveTask(studioCurrentModule.day, tIdx, 'UP')}
                          className="p-1 text-[#8E8E93] hover:text-black dark:hover:text-white disabled:opacity-20"
                          title="Move up"
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          disabled={tIdx === studioCurrentModule.tasks.length - 1}
                          onClick={() => handleMoveTask(studioCurrentModule.day, tIdx, 'DOWN')}
                          className="p-1 text-[#8E8E93] hover:text-black dark:hover:text-white disabled:opacity-20"
                          title="Move down"
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                      </div>

                      <input
                        type="text"
                        value={task}
                        onChange={(e) =>
                          handleUpdateTask(studioCurrentModule.day, tIdx, e.target.value)
                        }
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-[8px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] text-black dark:text-white focus:outline-none focus:border-[#0071E3]"
                      />

                      <button
                        onClick={() => handleDeleteTask(studioCurrentModule.day, tIdx)}
                        className="p-1.5 text-[#8E8E93] hover:text-[#D70015] dark:hover:text-[#FF453A] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] rounded-md shrink-0"
                        title="Delete task"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add New Task Form */}
                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="text"
                    value={newTaskInput}
                    onChange={(e) => setNewTaskInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddTask(studioCurrentModule.day);
                      }
                    }}
                    placeholder="Add milestone task..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:border-[#0071E3]"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    icon={<Plus className="w-3 h-3" />}
                    onClick={() => handleAddTask(studioCurrentModule.day)}
                  >
                    Add
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </Drawer>

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
              className="flex-1 px-3.5 py-2.5 text-[13px] rounded-full border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 focus:border-[#0071E3] transition-all"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={mentorLoading}
              icon={<Send className="w-3.5 h-3.5" />}
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
              className={`px-4 py-3.5 rounded-[16px] text-[13px] leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#0071E3] text-white ml-8'
                  : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white mr-4'
              }`}
            >
              <div
                className={`text-[10px] font-semibold uppercase tracking-wider mb-1.5 ${
                  m.sender === 'user' ? 'text-white/60' : 'text-[#8E8E93]'
                }`}
              >
                {m.sender === 'user' ? 'You' : 'TARS Mentor'}
              </div>
              <p>{m.text}</p>
              {m.citation && (
                <div
                  className={`pt-2 mt-2 border-t text-[11px] font-mono ${
                    m.sender === 'user'
                      ? 'border-white/20 text-white/70'
                      : 'border-black/[0.08] dark:border-white/[0.08] text-[#0071E3] dark:text-[#0A84FF]'
                  }`}
                >
                  ↳ {m.citation}
                </div>
              )}
            </div>
          ))}
          {mentorLoading && (
            <div className="flex items-center gap-2.5 p-3.5 rounded-[16px] bg-[#F5F5F7] dark:bg-[#2C2C2E] mr-4">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-[#8E8E93] animate-pulse"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
              <span className="text-[12px] text-[#8E8E93]">Synthesising…</span>
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};
