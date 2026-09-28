import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { Drawer } from '../primitives/Drawer';
import { MOCK_ONBOARDING_DATA } from '../../mocks/fixtures';
import { UserRole } from '../../types/contracts';
import {
  CheckCircle2,
  Circle,
  HelpCircle,
  Play,
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
  onOpenCitation: (docTitle: string, snippet: string) => void;
}

export const OnboardingWorkspace: React.FC<OnboardingWorkspaceProps> = ({
  userRole,
  onOpenCitation,
}) => {
  const [data] = useState(MOCK_ONBOARDING_DATA);
  const [activeDay, setActiveDay] = useState(3);
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({
    '1-0': true,
    '1-1': true,
    '1-2': true,
    '2-0': true,
    '2-1': true,
    '2-2': true,
    '3-0': true,
  });

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

  const handleAskMentor = (questionText: string) => {
    if (!questionText.trim()) return;
    const userMsg = questionText.trim();
    setMentorMessages((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setMentorQuery('');
    setMentorLoading(true);

    setTimeout(() => {
      let reply = 'All company operations are designed for deterministic execution.';
      let cite = 'Founding Manifesto P.1';

      if (userMsg.toLowerCase().includes('decision 14') || userMsg.toLowerCase().includes('custom')) {
        reply =
          'Decision #14 was ratified to protect cash runway and prevent Bus Factor = 1 amnesia. With a 4-person team, maintaining bespoke branches diverts 50% of founder capacity and delays the core self-serve product.';
        cite = 'Decision #14 (ADR Ratified 2026-09-14)';
      } else if (userMsg.toLowerCase().includes('inv-017') || userMsg.toLowerCase().includes('transaction')) {
        reply =
          'INV-017 strictly prevents wrapping outbound HTTP calls inside database transactions. If external APIs experience latency, database row locks remain open, exhausting connection pools.';
        cite = 'ADR-017: Outbox Pattern & Transaction Isolation';
      } else if (userMsg.toLowerCase().includes('sovereign') || userMsg.toLowerCase().includes('air-gap')) {
        reply =
          'Sovereignty guarantees zero cloud egress (0.00 KB). All Qwen 8B, Whisper, and Tree-sitter models execute on your local hardware so customer code and NDA recordings are never leaked.';
        cite = 'PRD Section 3.1: Local Host Architecture';
      } else {
        reply = `According to our internal records, this practice is documented in our core engineering guidelines. All code invariants are enforced deterministically at commit time in <50ms.`;
        cite = 'Engineering Architecture Playbook P.4';
      }

      setMentorMessages((prev) => [
        ...prev,
        { sender: 'mentor', text: reply, citation: cite },
      ]);
      setMentorLoading(false);
    }, 600);
  };

  const currentModule = data.modules.find((m) => m.day === activeDay) || data.modules[0];

  const totalTasks = data.modules.reduce((acc, m) => acc + m.tasks.length, 0);
  const completedCount = Object.values(completedTasks).filter(Boolean).length;
  const progressPct = Math.round((completedCount / totalTasks) * 100);

  const radius = 22;
  const circ = 2 * Math.PI * radius;
  const strokeOffset = circ - (progressPct / 100) * circ;

  const suggestedQueries = [
    'Why does Decision #14 restrict enterprise customisation?',
    'What is the rationale behind invariant INV-017?',
    'How does TARS prove zero cloud egress on stage?',
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Onboarding"
        title="Fast Onboarding Hub"
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
                Founder Aryan debriefs the 4 frictions that destroy early-stage engineering velocity.
              </p>
              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[11px] text-[#8E8E93]">3m 45s</span>
                <Button variant="secondary" size="sm" icon={<Play className="w-3 h-3" />}>Listen</Button>
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
