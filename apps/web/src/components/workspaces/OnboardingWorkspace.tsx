import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { Drawer } from '../primitives/Drawer';
import { MOCK_ONBOARDING_DATA } from '../../mocks/fixtures';
import { UserRole } from '../../types/contracts';
import {
  Compass,
  CheckCircle2,
  Circle,
  HelpCircle,
  Play,
  ArrowRight,
  ArrowLeft,
  MessageSquare,
  Sparkles,
  BookOpen,
  Send,
} from 'lucide-react';

interface OnboardingWorkspaceProps {
  userRole: UserRole;
  onOpenCitation: (docTitle: string, snippet: string) => void;
}

export const OnboardingWorkspace: React.FC<OnboardingWorkspaceProps> = ({
  userRole,
  onOpenCitation,
}) => {
  const [data, setData] = useState(MOCK_ONBOARDING_DATA);
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

  // Socratic Mentor Drawer state
  const [mentorDrawerOpen, setMentorDrawerOpen] = useState(false);
  const [mentorQuery, setMentorQuery] = useState('');
  const [mentorMessages, setMentorMessages] = useState<
    { sender: 'user' | 'mentor'; text: string; citation?: string }[]
  >([
    {
      sender: 'mentor',
      text: "Hello Alex! I am your sovereign Socratic mentor. I have access to all founding thesis documents, technical decisions (ADRs), and architecture contracts. Ask me any question about internal code invariants, past pivot trade-offs, or client commitments.",
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
      let reply = "All company operations are designed for deterministic execution.";
      let cite = "Founding Manifesto P.1";

      if (userMsg.toLowerCase().includes('decision 14') || userMsg.toLowerCase().includes('custom')) {
        reply = "Decision #14 was ratified to protect cash runway and prevent Bus Factor = 1 amnesia. With a 4-person team, maintaining bespoke branches diverts 50% of founder capacity and delays the core self-serve product.";
        cite = "Decision #14 (ADR Ratified 2026-09-14)";
      } else if (userMsg.toLowerCase().includes('inv-017') || userMsg.toLowerCase().includes('transaction')) {
        reply = "INV-017 strictly prevents wrapping outbound HTTP calls (like Stripe or webhooks) inside database transactions. If external APIs experience latency, database row locks remain open, exhausting connection pools.";
        cite = "ADR-017: Outbox Pattern & Transaction Isolation";
      } else if (userMsg.toLowerCase().includes('sovereign') || userMsg.toLowerCase().includes('air-gap')) {
        reply = "Sovereignty guarantees zero cloud egress (0.00 KB). All Qwen 8B, Whisper, and Tree-sitter models execute on your local hardware so customer code and NDA recordings are never leaked to external clouds.";
        cite = "PRD Section 3.1: Local Host Architecture";
      } else {
        reply = `According to our internal records, this practice is documented in our core engineering guidelines. All code invariants are enforced deterministically at commit time in <50ms.`;
        cite = "Engineering Architecture Playbook P.4";
      }

      setMentorMessages((prev) => [
        ...prev,
        { sender: 'mentor', text: reply, citation: cite },
      ]);
      setMentorLoading(false);
    }, 600);
  };

  const currentModule = data.modules.find((m) => m.day === activeDay) || data.modules[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace 3"
        title="Fast Onboarding Hub"
        description="Role-tailored flight-plans and patient Socratic mentor sandbox to bring new hires to day-3 productivity."
        actions={
          <Button
            variant="primary"
            size="sm"
            icon={<HelpCircle className="w-4 h-4" />}
            onClick={() => setMentorDrawerOpen(true)}
          >
            Ask Socratic Mentor
          </Button>
        }
      />

      {/* Stepper Progress Bar */}
      <Surface className="p-4 sm:p-5 shadow-subtle">
        <div className="flex items-center justify-between text-xs font-semibold text-tars-text-secondary uppercase tracking-wider mb-4">
          <span>Flight-Plan Progress ({userRole.replace('_', ' ')})</span>
          <span className="font-mono text-tars-text-primary">
            Day {activeDay} of {data.total_days}
          </span>
        </div>

        {/* Stepper Controls */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {data.modules.map((mod) => {
            const isSelected = mod.day === activeDay;
            const isCompleted = mod.day < 3;
            return (
              <button
                key={mod.day}
                onClick={() => setActiveDay(mod.day)}
                className={`p-3 rounded-control border text-left transition-all ${
                  isSelected
                    ? 'border-tars-border-strong bg-tars-surface font-semibold shadow-subtle'
                    : isCompleted
                    ? 'border-tars-separator bg-tars-surface-secondary/40 text-tars-text-secondary'
                    : 'border-tars-separator/70 bg-tars-surface-secondary/20 text-tars-text-tertiary'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono">Day {mod.day}</span>
                  {isCompleted ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-tars-success-text" />
                  ) : isSelected ? (
                    <span className="w-2 h-2 rounded-full bg-tars-text-primary" />
                  ) : (
                    <Circle className="w-3 h-3 text-tars-text-tertiary" />
                  )}
                </div>
                <div className="text-xs font-medium truncate text-tars-text-primary">
                  {mod.title}
                </div>
              </button>
            );
          })}
        </div>
      </Surface>

      {/* Active Day Detail Work Surface */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Current Day Objectives & Interactive Checklist (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <Surface className="p-5 sm:p-6 space-y-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono text-tars-text-tertiary">
                <span>DAY {currentModule.day} MODULE</span>
                <span>•</span>
                <span className="text-tars-accent font-semibold">{currentModule.status}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-tars-text-primary mt-1">
                {currentModule.title}
              </h3>
              <p className="text-xs sm:text-sm text-tars-text-secondary mt-1.5 leading-relaxed">
                {currentModule.description}
              </p>
            </div>

            {/* Checklist Items */}
            <div className="space-y-3 pt-3 border-t border-tars-separator/60">
              <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                Verifiable Milestone Checklist
              </div>
              <div className="space-y-2.5">
                {currentModule.tasks.map((task, idx) => {
                  const isChecked = !!completedTasks[`${currentModule.day}-${idx}`];
                  return (
                    <label
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-control border border-tars-separator transition-colors cursor-pointer select-none ${
                        isChecked ? 'bg-tars-surface-secondary/40 line-through opacity-75' : 'bg-tars-surface hover:bg-tars-surface-secondary/30'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleTask(currentModule.day, idx)}
                        className="mt-0.5 rounded border-tars-separator text-tars-text-primary focus:ring-tars-accent shrink-0"
                      />
                      <span className="text-xs sm:text-sm text-tars-text-primary leading-snug">
                        {task}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Stepper Navigation Buttons */}
            <div className="flex items-center justify-between pt-4 border-t border-tars-separator/60">
              <Button
                variant="secondary"
                size="sm"
                disabled={activeDay <= 1}
                icon={<ArrowLeft className="w-3.5 h-3.5" />}
                onClick={() => setActiveDay((prev) => Math.max(1, prev - 1))}
              >
                Previous Day
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={activeDay >= data.modules.length}
                icon={<ArrowRight className="w-3.5 h-3.5" />}
                iconPosition="right"
                onClick={() => setActiveDay((prev) => Math.min(data.modules.length, prev + 1))}
              >
                Next Day
              </Button>
            </div>
          </Surface>
        </div>

        {/* Right Column: Audio Milestone Tour & Socratic Trigger (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Founding Milestone Tour */}
          <Surface className="p-4 sm:p-5 space-y-3">
            <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-tars-accent" />
              <span>Founding Thesis Tour</span>
            </div>
            <div className="p-3 rounded-control border border-tars-separator bg-tars-surface-secondary/50 space-y-2">
              <div className="text-xs font-semibold text-tars-text-primary">
                Why Startups Die of Context Decay
              </div>
              <p className="text-[11px] text-tars-text-secondary leading-snug">
                Founder Aryan debriefs the 4 frictions that destroy early-stage engineering velocity.
              </p>
              <div className="pt-2 flex items-center justify-between text-xs">
                <span className="font-mono text-tars-text-tertiary">3m 45s</span>
                <Button variant="secondary" size="sm" icon={<Play className="w-3 h-3" />}>
                  Listen
                </Button>
              </div>
            </div>
          </Surface>

          {/* Socratic Mentor Quick Prompts */}
          <Surface className="p-4 sm:p-5 space-y-3">
            <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <HelpCircle className="w-4 h-4 text-tars-accent" />
              <span>Suggested Mentor Queries</span>
            </div>
            <div className="space-y-1.5 text-xs">
              {[
                "Why does Decision #14 restrict enterprise customisation?",
                "What is the rationale behind invariant INV-017?",
                "How does TARS prove zero cloud egress on stage?",
              ].map((q, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setMentorDrawerOpen(true);
                    handleAskMentor(q);
                  }}
                  className="w-full text-left p-2.5 rounded-control border border-tars-separator bg-tars-surface hover:bg-tars-surface-secondary text-tars-text-primary transition-colors text-xs leading-snug"
                >
                  "{q}"
                </button>
              ))}
            </div>
          </Surface>
        </div>
      </div>

      {/* Socratic Mentor Drawer */}
      <Drawer
        isOpen={mentorDrawerOpen}
        onClose={() => setMentorDrawerOpen(false)}
        title="Socratic Onboarding Mentor"
        subtitle="Zero-judgment private sandbox answering context questions with citations"
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
              placeholder="Ask anything about company terminology, past decisions..."
              className="flex-1 px-3 py-2 text-xs rounded-control border border-tars-separator bg-tars-canvas text-tars-text-primary focus:outline-none focus:ring-1 focus:ring-tars-accent"
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
        <div className="space-y-3.5">
          {mentorMessages.map((m, idx) => (
            <div
              key={idx}
              className={`p-3.5 rounded-control text-xs leading-relaxed space-y-1.5 ${
                m.sender === 'user'
                  ? 'bg-tars-surface-tertiary ml-8 text-tars-text-primary border border-tars-separator'
                  : 'bg-tars-surface mr-4 text-tars-text-primary border border-tars-separator'
              }`}
            >
              <div className="font-semibold text-[11px] text-tars-text-secondary uppercase tracking-wider">
                {m.sender === 'user' ? 'You' : 'TARS Socratic Mentor'}
              </div>
              <p>{m.text}</p>
              {m.citation && (
                <div className="pt-1.5 mt-1 border-t border-tars-separator/40 text-[11px] font-mono text-tars-accent">
                  Source Reference: {m.citation}
                </div>
              )}
            </div>
          ))}
          {mentorLoading && (
            <div className="p-3 text-xs text-tars-text-tertiary font-mono animate-pulse">
              Synthesising institutional answer from local knowledge graph...
            </div>
          )}
        </div>
      </Drawer>
    </div>
  );
};
