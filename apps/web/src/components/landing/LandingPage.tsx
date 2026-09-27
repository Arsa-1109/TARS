import React, { useState } from 'react';
import {
  Shield,
  Lock,
  Cpu,
  Layers,
  Phone,
  Scale,
  CheckCircle2,
  ArrowRight,
  Terminal,
  Server,
  Key,
  HardDrive,
  Users,
  Compass,
  CheckSquare,
  Play,
  FileText,
  AlertTriangle,
  ChevronRight,
  Zap,
  Moon,
  Sun,
} from 'lucide-react';
import { Button } from '../primitives/Button';

interface LandingPageProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onLaunchDemo: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onOpenAuth,
  onLaunchDemo,
  theme = 'light',
  onToggleTheme,
}) => {
  const [activeTab, setActiveTab] = useState<'knowledge' | 'calls' | 'decisions' | 'architecture' | 'actions'>(
    'knowledge'
  );

  const capabilities = [
    {
      id: 'knowledge' as const,
      label: 'Knowledge Base',
      icon: <Layers className="w-4 h-4" />,
      headline: 'Fast hybrid search with verifiable citations',
      description:
        'Every pull request, customer contract, design doc, and team discussion indexed into local Tantivy and vector indices. Find any detail across your company in under 150ms.',
      metrics: [
        { label: 'Query Latency', value: '138ms' },
        { label: 'Network Egress', value: '0.00 KB' },
        { label: 'Citations', value: 'Line-Level' },
      ],
      previewContent: (
        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-black/10 dark:border-white/10 text-zinc-800 dark:text-zinc-300">
            <span className="text-zinc-500">// Search:</span> "SAML 2.0 SSO enterprise requirements"
          </div>
          <div className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/80 border border-black/5 dark:border-white/10 text-zinc-800 dark:text-zinc-200 shadow-sm">
            <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold mb-1">
              [1] ADR-014-no-custom-branches.md · Page 2 · Confidence 98.4%
            </div>
            <p className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed font-sans">
              "We mandate standard OIDC token federation for multi-tenant deployments and reject bespoke SAML XML assertions before Q4 to preserve single-tenant build velocity."
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'calls' as const,
      label: 'Customer Calls',
      icon: <Phone className="w-4 h-4" />,
      headline: 'Local transcription and automated action extraction',
      description:
        'Whisper models run entirely on local silicon. Diarize speakers, isolate unvarnished client feedback, and extract commitments into actionable tasks with one click.',
      metrics: [
        { label: 'Transcription', value: 'Local Whisper' },
        { label: 'Speaker Split', value: 'Diarized' },
        { label: 'Commitments', value: '1-Click Export' },
      ],
      previewContent: (
        <div className="space-y-2.5 text-xs">
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-black/5 dark:border-white/10">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="font-mono text-zinc-600 dark:text-zinc-400">Call #ACME-01 (VP Eng John)</span>
            <span className="ml-auto font-mono text-zinc-500">03:42</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/90 border border-black/5 dark:border-white/10 shadow-sm">
              <span className="font-semibold text-zinc-900 dark:text-zinc-200 block mb-1">Customer Pain Point</span>
              <span className="text-zinc-600 dark:text-zinc-400">Client compliance requires on-premise execution with zero cloud proxies.</span>
            </div>
            <div className="p-3 rounded-xl bg-white dark:bg-zinc-900/90 border border-black/5 dark:border-white/10 shadow-sm">
              <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-1">Extracted Commitment</span>
              <span className="text-zinc-700 dark:text-zinc-300">Deliver on-prem AST diff benchmark by Friday.</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'decisions' as const,
      label: 'Decisions',
      icon: <Scale className="w-4 h-4" />,
      headline: 'Decision registry and conflict detection',
      description:
        'Track foundational architectural and business decisions as immutable Git commits. Real-time conflict checks warn you before your team makes conflicting promises.',
      metrics: [
        { label: 'Storage', value: 'Git Commits' },
        { label: 'Conflict Check', value: 'Real-time' },
        { label: 'Simulation', value: 'Runway Forecast' },
      ],
      previewContent: (
        <div className="space-y-2.5 text-xs font-sans">
          <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-900 dark:text-red-200">
            <div className="flex items-center gap-2 font-semibold text-xs text-red-600 dark:text-red-400 mb-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Conflict Warning (Strict Sensitivity)</span>
            </div>
            <p className="text-[11px] text-zinc-700 dark:text-zinc-300 leading-snug">
              Proposed $80k custom SAML branch conflicts with <span className="text-zinc-900 dark:text-white font-mono font-semibold">Decision #14</span>.
              Simulated impact: -1.8 months runway and 3.5 weeks launch delay.
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'architecture' as const,
      label: 'Architecture',
      icon: <Cpu className="w-4 h-4" />,
      headline: 'Fast pre-commit code invariant checks',
      description:
        'Catch architectural breaches before code lands in main. Banned patterns (like external HTTP calls inside database transactions) are intercepted in under 50ms.',
      metrics: [
        { label: 'AST Parser', value: 'Tree-Sitter' },
        { label: 'Check Time', value: '<50ms' },
        { label: 'Living ADRs', value: 'Automated' },
      ],
      previewContent: (
        <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-950 border border-black/5 dark:border-white/10 font-mono text-[11px] space-y-1.5 shadow-sm">
          <div className="text-red-600 dark:text-red-400 flex items-center justify-between font-semibold">
            <span>[BLOCKED] INV-017: HTTP call inside DB transaction</span>
            <span>line 84</span>
          </div>
          <div className="text-zinc-500 pl-3">File: src/payments/service.py</div>
          <div className="text-emerald-600 dark:text-emerald-400 pl-3">Suggested fix: Apply Transactional Outbox pattern</div>
        </div>
      ),
    },
    {
      id: 'actions' as const,
      label: 'Tasks',
      icon: <CheckSquare className="w-4 h-4" />,
      headline: 'Direct lineage from conversation to code commit',
      description:
        'Every action item links back to its source — whether a client audio recording timestamp, an architectural decision, or an invariant check.',
      metrics: [
        { label: 'Views', value: 'List & Board' },
        { label: 'Sync', value: 'Local Only' },
        { label: 'Standup Memo', value: '1-Click Copy' },
      ],
      previewContent: (
        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-xs">
            <div className="text-zinc-500 dark:text-zinc-400 font-bold mb-1">OPEN</div>
            <div className="text-zinc-800 dark:text-zinc-200">INV-017 Outbox Refactor</div>
            <div className="text-zinc-400 dark:text-zinc-500 mt-1">Elena • Due 2d</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-xs">
            <div className="text-blue-600 dark:text-blue-400 font-bold mb-1">IN PROGRESS</div>
            <div className="text-zinc-800 dark:text-zinc-200">Acme SSO Assessment</div>
            <div className="text-zinc-400 dark:text-zinc-500 mt-1">Aryan • Due 3d</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-black/5 dark:border-white/10 shadow-xs">
            <div className="text-emerald-600 dark:text-emerald-400 font-bold mb-1">DONE</div>
            <div className="text-zinc-800 dark:text-zinc-200">AST Parser Benchmark</div>
            <div className="text-zinc-400 dark:text-zinc-500 mt-1">Passed (&lt;50ms)</div>
          </div>
        </div>
      ),
    },
  ];

  const frictions = [
    {
      title: 'Context Decay',
      problem: 'Foundational decisions get lost across ephemeral Slack threads and verbal hallway syncs.',
      solution: 'TARS compiles every discussion, decision, and commit into an immutable, locally searchable Kùzu knowledge graph.',
    },
    {
      title: 'Decision Amnesia',
      problem: 'Startups waste hundreds of hours re-litigating decisions already resolved weeks earlier.',
      solution: 'The Contradiction Radar intercepts duplicate or conflicting proposals before they are codified into engineering tasks.',
    },
    {
      title: 'The Onboarding Chasm',
      problem: 'New engineering hires take 90 days to grasp architectural trade-offs and code invariants.',
      solution: 'Role-adaptive 14-day flight plans and the offline Socratic Mentor ramp up new hires in under two weeks.',
    },
    {
      title: 'Cloud IP Leakage',
      problem: 'Engineers paste proprietary source code, secrets, and customer financials into public cloud LLMs.',
      solution: 'TARS runs 100% on-premises on local silicon with provable zero network egress (E_net = 0.00 KB).',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-zinc-100 font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-200">
      {/* Sleek Apple-style Sticky Header */}
      <header className="sticky top-0 z-40 h-14 apple-glass border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between px-6 lg:px-12 backdrop-blur-2xl bg-white/70 dark:bg-black/60 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
            T
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-zinc-900 dark:text-white">TARS</span>
            <span className="hidden sm:inline-block px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-black/5 dark:border-white/10">
              Sovereign Node v1.0
            </span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-medium text-zinc-600 dark:text-zinc-400">
          <a href="#capabilities" className="hover:text-black dark:hover:text-white transition-colors">
            Capabilities
          </a>
          <a href="#sovereignty" className="hover:text-black dark:hover:text-white transition-colors">
            Air-Gap Sovereignty
          </a>
          <a href="#appliance" className="hover:text-black dark:hover:text-white transition-colors">
            Hardware Appliance
          </a>
          <a href="#pricing" className="hover:text-black dark:hover:text-white transition-colors">
            Deployment Tiers
          </a>
        </nav>

        <div className="flex items-center gap-3">
          {/* Theme Toggle on Landing Page */}
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 h-8 w-8 rounded-xl border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/80 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white transition-colors flex items-center justify-center shadow-xs"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={() => onOpenAuth('signin')}
            className="px-3.5 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors"
          >
            Sign In
          </button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => onOpenAuth('signin')}
            className="rounded-xl px-4 py-1.5 text-xs font-semibold bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 active:scale-[0.98] transition-all shadow-sm"
          >
            Get Started
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6 lg:px-12 max-w-6xl mx-auto text-center">
        {/* Subtle Ambient Radial Highlight */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-blue-500/[0.04] dark:bg-white/[0.03] rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/90 dark:bg-zinc-900/80 text-[11px] text-zinc-700 dark:text-zinc-300 font-mono mb-8 shadow-xs apple-glass">
          <Shield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>Local Sovereign Architecture</span>
          <span className="text-zinc-400 dark:text-zinc-600">•</span>
          <span className="text-zinc-600 dark:text-zinc-400">0.00 KB Egress</span>
        </div>

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white max-w-4xl mx-auto leading-[1.08] mb-6">
          The Sovereign Platform for Startups.
        </h1>

        <p className="text-base sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto font-normal leading-relaxed mb-10">
          Zero cloud egress. Zero data leaks. Every client call, engineering invariant, and strategic
          founder decision compiled into your company's permanent, private intelligence.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-16">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto h-11 px-7 rounded-2xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black text-xs font-semibold dark:hover:bg-zinc-200 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-md"
          >
            <span>Get Started</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto h-11 px-6 rounded-2xl border border-black/10 dark:border-white/15 bg-white/80 dark:bg-zinc-900/60 text-zinc-800 dark:text-white text-xs font-medium hover:bg-white dark:hover:bg-zinc-800 transition-all flex items-center justify-center gap-2 shadow-xs apple-glass"
          >
            <Shield className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
            <span>Deploy Locally</span>
          </button>
        </div>

        {/* Live Hardware Telemetry Card */}
        <div className="p-4 sm:p-5 rounded-3xl border border-black/[0.08] dark:border-white/[0.12] bg-white/90 dark:bg-zinc-950/80 apple-glass max-w-3xl mx-auto shadow-xl dark:shadow-2xl relative overflow-hidden text-zinc-900 dark:text-white">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-black/10 dark:via-white/20 to-transparent" />
          <div className="flex flex-wrap items-center justify-between gap-4 text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-zinc-900 dark:text-white">Local Node</div>
                <div className="text-[11px] text-zinc-500 dark:text-zinc-400 font-mono">Apple Silicon & Linux (48GB Unified)</div>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs">
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Network</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-semibold">0.00 KB Egress</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">AST Check</div>
                <div className="text-zinc-900 dark:text-white font-semibold">&lt;48ms</div>
              </div>
              <div>
                <div className="text-[10px] text-zinc-500 uppercase">Graph Engine</div>
                <div className="text-blue-600 dark:text-blue-400 font-semibold">Embedded Kùzu</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Capabilities Showcase */}
      <section id="capabilities" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto border-t border-black/[0.08] dark:border-white/[0.08]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
            Core Capabilities
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
            Five integrated workspaces that govern every stage of startup growth.
          </p>
        </div>

        {/* Tab Controls (Apple-style Segmented) */}
        <div className="flex justify-center mb-8 overflow-x-auto pb-2">
          <div className="p-1 rounded-2xl bg-zinc-200/80 dark:bg-zinc-900/80 border border-black/5 dark:border-white/10 flex gap-1 apple-glass">
            {capabilities.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${
                  activeTab === c.id
                    ? 'bg-white text-zinc-900 dark:bg-white dark:text-black font-semibold shadow-sm'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
                }`}
              >
                {c.icon}
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Active Tab Preview Display */}
        {(() => {
          const cap = capabilities.find((c) => c.id === activeTab)!;
          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-3xl border border-black/[0.08] dark:border-white/[0.12] bg-white/90 dark:bg-zinc-950/70 p-6 sm:p-10 apple-glass shadow-lg">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  {cap.icon}
                  <span>{cap.label}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white leading-snug">
                  {cap.headline}
                </h3>
                <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {cap.description}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-black/5 dark:border-white/5">
                  {cap.metrics.map((m, i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">{m.label}</div>
                      <div className="text-xs font-semibold text-zinc-900 dark:text-white font-mono">{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onLaunchDemo}
                    className="rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-zinc-900 dark:text-white text-xs shadow-xs"
                  >
                    <span>Launch {cap.label}</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-2xl border border-black/[0.06] dark:border-white/10 bg-zinc-50 dark:bg-zinc-900/50 p-5 apple-glass shadow-inner">
                {cap.previewContent}
              </div>
            </div>
          );
        })()}
      </section>

      {/* The 4 Startup Frictions */}
      <section className="py-20 px-6 lg:px-12 max-w-6xl mx-auto border-t border-black/[0.08] dark:border-white/[0.08]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
            Why Startups Die Without Sovereign Memory
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-lg mx-auto">
            Traditional tools create silos. TARS binds every decision, call, and commit into permanent context.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {frictions.map((f, i) => (
            <div
              key={i}
              className="p-6 rounded-3xl border border-black/[0.06] dark:border-white/[0.08] bg-white/80 dark:bg-zinc-950/60 hover:bg-white dark:hover:bg-zinc-950/90 transition-all apple-glass space-y-3 shadow-xs"
            >
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-black/5 dark:border-white/10 text-[11px] font-mono font-bold flex items-center justify-center text-zinc-700 dark:text-zinc-300">
                  0{i + 1}
                </span>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-white tracking-tight">{f.title}</h3>
              </div>
              <div className="space-y-1.5 text-xs">
                <p className="text-zinc-500 leading-snug">
                  <span className="font-semibold text-zinc-700 dark:text-zinc-400">Problem:</span> {f.problem}
                </p>
                <p className="text-zinc-800 dark:text-zinc-300 leading-snug">
                  <span className="font-semibold text-zinc-900 dark:text-white">Solution:</span> {f.solution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Hardware Appliance & Zero Egress Specification */}
      <section id="appliance" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto border-t border-black/[0.08] dark:border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/10 dark:border-white/10 bg-white/80 dark:bg-zinc-900/60 text-[11px] font-mono text-zinc-700 dark:text-zinc-300 shadow-xs">
              <Server className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <span>Dedicated Silicon Appliance</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white leading-tight">
              Turnkey Hardware. 100% Offline Resilience.
            </h2>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
              TARS does not depend on cloud uptime, OpenAI outages, or subscription price hikes. It runs on a dedicated Mac Studio or 1U rackmount node in your office. Even if you physically disconnect the WAN ethernet cable, all operations continue without interruption.
            </p>

            <div className="space-y-2 text-xs font-mono text-zinc-700 dark:text-zinc-300">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Zero telemetry sockets (E_net = 0.00 KB) verified by eBPF</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Local Whisper-Large-v3 speech recognition</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Embedded Kùzu Cypher graph database & Tantivy indexing</span>
              </div>
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Deterministic Tree-sitter AST queries in &lt;50ms</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-3xl border border-black/[0.08] dark:border-white/[0.12] bg-zinc-950 text-white p-6 shadow-2xl font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2 text-zinc-300">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-white">tars-host-doctor --verify-airgap</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                SECURE
              </span>
            </div>

            <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
              <div>[KERNEL] Probing physical network interfaces (eth0, wlan0)...</div>
              <div>[SOCKET] Total outbound packets outside local subnet: 0 pkts</div>
              <div>[EGRESS] Mathematical guarantee verified: E_net = 0.00 KB</div>
              <div>[GRAPH] Kùzu active nodes: 1,420 | edges: 3,890</div>
              <div>[INFERENCE] Llama-3-70B-Instruct-Q4_K_M resident in 48GB unified VRAM</div>
              <div className="text-emerald-400 pt-1 font-semibold">
                ✓ ALL SOVEREIGN INVARIANTS SATISFIED. SYSTEM AIR-GAPPED.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deployment Tiers & Pricing */}
      <section id="pricing" className="py-20 px-6 lg:px-12 max-w-6xl mx-auto border-t border-black/[0.08] dark:border-white/[0.08]">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-zinc-900 dark:text-white mb-3">
            Deploy on Your Terms
          </h2>
          <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-md mx-auto">
            One-time hardware ownership or self-hosted deployment. Zero per-seat cloud SaaS fees.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Tier 1 */}
          <div className="p-6 rounded-3xl border border-black/[0.08] dark:border-white/10 bg-white/90 dark:bg-zinc-950/60 apple-glass space-y-4 shadow-sm">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase font-mono">Developer Node</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">Free</div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              For solo founders running on their local MacBook or Linux workstation.
            </p>
            <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 font-mono pt-2">
              <div>• Single operator login</div>
              <div>• Full AST diff checker</div>
              <div>• Local Tantivy & Kùzu store</div>
            </div>
            <Button
              variant="secondary"
              className="w-full justify-center h-10 text-xs font-medium rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-900 dark:text-white shadow-xs"
              onClick={() => onOpenAuth('signin')}
            >
              Launch Developer Mode
            </Button>
          </div>

          {/* Tier 2: Turnkey Appliance */}
          <div className="p-6 rounded-3xl border border-black/20 dark:border-white/20 bg-white dark:bg-zinc-900/70 apple-glass space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-mono bg-black text-white dark:bg-white dark:text-black font-bold">
              RECOMMENDED
            </div>
            <div className="text-xs font-semibold text-zinc-600 dark:text-zinc-300 uppercase font-mono">Startup Appliance</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">$2,499</div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              Turnkey dedicated Mac Studio / 1U rack node shipped pre-configured for your office.
            </p>
            <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 font-mono pt-2">
              <div>• Up to 50 team operators</div>
              <div>• 48GB unified memory appliance</div>
              <div>• 100% zero-egress hardware guarantee</div>
              <div>• Role-adaptive onboarding flight plans</div>
            </div>
            <Button
              variant="primary"
              className="w-full justify-center h-10 text-xs font-semibold rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-md"
              onClick={() => onOpenAuth('signup')}
            >
              Order Sovereign Appliance
            </Button>
          </div>

          {/* Tier 3: Enterprise Air-Gap */}
          <div className="p-6 rounded-3xl border border-black/[0.08] dark:border-white/10 bg-white/90 dark:bg-zinc-950/60 apple-glass space-y-4 shadow-sm">
            <div className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase font-mono">Defense Air-Gap</div>
            <div className="text-2xl font-bold text-zinc-900 dark:text-white">Custom</div>
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              For defense contractors, sovereign funds, and healthcare startups with strict infosec vetoes.
            </p>
            <div className="space-y-2 text-xs text-zinc-700 dark:text-zinc-300 font-mono pt-2">
              <div>• Custom cryptographic enclave</div>
              <div>• Hardware-tamper evident audit trail</div>
              <div>• Dedicated on-site installation</div>
            </div>
            <Button
              variant="secondary"
              className="w-full justify-center h-10 text-xs font-medium rounded-xl border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 text-zinc-900 dark:text-white shadow-xs"
              onClick={() => onOpenAuth('signin')}
            >
              Contact Sovereign Architect
            </Button>
          </div>
        </div>
      </section>

      {/* Founder Quote */}
      <section className="py-20 px-6 lg:px-12 max-w-4xl mx-auto text-center border-t border-black/[0.08] dark:border-white/[0.08]">
        <blockquote className="text-lg sm:text-2xl font-medium text-zinc-900 dark:text-white tracking-tight leading-relaxed mb-6">
          "Startups die when context leaks or disperses. TARS ensures our company remembers everything and
          betrays nothing."
        </blockquote>
        <div className="space-y-1">
          <div className="text-sm font-semibold text-zinc-900 dark:text-white">Aryan</div>
          <div className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">Founder & Chief Architect, TARS</div>
        </div>
      </section>

      {/* Apple-style Footer */}
      <footer className="border-t border-black/[0.08] dark:border-white/[0.08] py-12 px-6 lg:px-12 max-w-6xl mx-auto text-xs text-zinc-500 font-mono">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-black text-white dark:bg-white dark:text-black font-bold text-[10px] flex items-center justify-center">
              T
            </div>
            <span className="text-zinc-700 dark:text-zinc-400 font-sans font-medium">TARS Sovereign Operating System</span>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <span>Air-Gap Invariant Verified</span>
            <span>Git State Store</span>
            <span>Tree-Sitter &lt;50ms</span>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-black/5 dark:border-white/5 text-center sm:text-left text-[11px] text-zinc-400 dark:text-zinc-600">
          © 2026 TARS. All rights reserved. 100% on-premises intelligence. Zero cloud egress.
        </div>
      </footer>
    </div>
  );
};
