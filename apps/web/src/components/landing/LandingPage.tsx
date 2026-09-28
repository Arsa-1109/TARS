import React, { useState } from 'react';
import {
  Shield,
  Layers,
  Phone,
  Scale,
  Cpu,
  CheckCircle2,
  ArrowRight,
  Server,
  Zap,
  Moon,
  Sun,
  Lock,
  Terminal,
  FileText,
  CheckSquare,
  Sparkles,
  ChevronRight,
  Sliders,
  Database,
  Compass,
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

  const handleScrollTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -64;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const capabilities = [
    {
      id: 'knowledge' as const,
      label: 'Institutional Memory',
      icon: <Layers className="w-4 h-4" />,
      title: 'Company Knowledge Lake',
      subtitle: 'Deterministic search across decisions, contracts, and architecture in under 150ms.',
      metrics: [
        { label: 'Query Latency', value: '138ms' },
        { label: 'Network Egress', value: '0.00 KB' },
        { label: 'Citations', value: 'Exact Line Level' },
      ],
      preview: (
        <div className="space-y-3 font-sans text-xs">
          <div className="p-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.10] text-[#1D1D1F] dark:text-[#EBEBF5]">
            <span className="text-[#8E8E93] font-mono text-[11px] block mb-1">SEARCH QUERY</span>
            <span className="font-semibold text-black dark:text-white">"What is our policy on enterprise customisations?"</span>
          </div>
          <div className="p-4 rounded-[14px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.12] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-black dark:text-white">
                [1] ADR-014-no-custom-branches.md · Page 2
              </span>
              <span className="px-2 py-0.5 rounded-full bg-[#0A84FF]/[0.12] dark:bg-[#0A84FF]/[0.15] text-[#0071E3] dark:text-[#0A84FF] font-bold text-[10px]">
                98.4% GROUNDED
              </span>
            </div>
            <p className="text-[#3C3C43] dark:text-[#EBEBF5] text-[13px] leading-relaxed">
              "Zero enterprise customisations before Q4 2026. All clients must consume public multi-tenant APIs to preserve single-tenant build velocity."
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'calls' as const,
      label: 'Customer Intelligence',
      icon: <Phone className="w-4 h-4" />,
      title: 'Call Studio & Action Extraction',
      subtitle: 'Local Whisper models isolate customer pain points and extract commitments automatically.',
      metrics: [
        { label: 'Speech Model', value: 'Whisper Large v3' },
        { label: 'Diarization', value: 'On-Device' },
        { label: 'Commitment Sync', value: '1-Click' },
      ],
      preview: (
        <div className="space-y-3 text-xs">
          <div className="flex items-center justify-between p-3 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.10]">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3B30] animate-pulse" />
              <span className="font-semibold text-black dark:text-white">Acme Corp Enterprise Call</span>
            </div>
            <span className="font-mono text-[11px] text-[#8E8E93]">03:42 • Diarized</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="p-3 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.10] shadow-sm">
              <div className="font-semibold text-black dark:text-white mb-1">Customer Constraint</div>
              <p className="text-[#6E6E73] dark:text-[#8E8E93]">Requires on-premise execution with zero cloud telemetry.</p>
            </div>
            <div className="p-3 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-[#0A84FF]/[0.25] shadow-sm">
              <div className="font-semibold text-[#0071E3] dark:text-[#0A84FF] mb-1">Extracted Commitment</div>
              <p className="text-[#3C3C43] dark:text-[#EBEBF5]">Deliver AST diff benchmark by Friday.</p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'decisions' as const,
      label: 'Decision Registry',
      icon: <Scale className="w-4 h-4" />,
      title: 'Contradiction Radar & What-If Simulations',
      subtitle: 'Immutable Git-backed ledger intercepts contradictory proposals before team commits.',
      metrics: [
        { label: 'Integrity', value: 'Git Commit Hashes' },
        { label: 'Conflict Check', value: 'Real-Time' },
        { label: 'Runway Forecast', value: 'Active Simulation' },
      ],
      preview: (
        <div className="p-4 rounded-[14px] bg-[#FF3B30]/[0.08] dark:bg-[#FF453A]/[0.10] border border-[#FF3B30]/[0.25] text-xs space-y-2">
          <div className="flex items-center gap-2 text-[#C0392B] dark:text-[#FF453A] font-bold text-[12px]">
            <Scale className="w-4 h-4" />
            <span>Contradiction Warning Detected</span>
          </div>
          <p className="text-[#3C3C43] dark:text-[#EBEBF5] text-[12px] leading-relaxed">
            Proposed $80k custom SAML branch directly contradicts <strong className="text-black dark:text-white font-mono">Decision #14</strong>.
            Forecasted impact: -1.8 months cash runway and 3.5 weeks self-serve product delay.
          </p>
        </div>
      ),
    },
    {
      id: 'architecture' as const,
      label: 'Code Invariants',
      icon: <Cpu className="w-4 h-4" />,
      title: 'Sub-50ms Tree-Sitter AST Enforcement',
      subtitle: 'Intercept architectural violations before code lands in main repository branch.',
      metrics: [
        { label: 'AST Parser', value: 'Tree-Sitter' },
        { label: 'Execution', value: '38.4 ms' },
        { label: 'Living ADRs', value: 'Automated' },
      ],
      preview: (
        <div className="p-3.5 rounded-[14px] bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.08] dark:border-white/[0.10] font-mono text-[11px] space-y-2">
          <div className="flex items-center justify-between text-[#C0392B] dark:text-[#FF453A] font-bold">
            <span>[BLOCKED] INV-017: HTTP call inside DB transaction</span>
            <span>line 22</span>
          </div>
          <div className="text-[#6E6E73] dark:text-[#8E8E93] pl-2">File: app/services/billing.py</div>
          <div className="text-[#0071E3] dark:text-[#0A84FF] pl-2">Recommendation: Apply Transactional Outbox pattern</div>
        </div>
      ),
    },
    {
      id: 'actions' as const,
      label: 'Tasks & Commitments',
      icon: <CheckSquare className="w-4 h-4" />,
      title: 'Full Lineage Action Hub',
      subtitle: 'Every commitment tracks back to caller audio timestamp or architectural finding.',
      metrics: [
        { label: 'Lineage', value: 'Provenanced' },
        { label: 'Sync', value: 'Local SQLite' },
        { label: 'Standup Memo', value: '1-Click Copy' },
      ],
      preview: (
        <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
          <div className="p-3 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.10] shadow-sm">
            <div className="text-[#B25000] dark:text-[#FF9F0A] font-bold mb-1">OPEN</div>
            <div className="text-black dark:text-white font-medium">INV-017 Outbox Refactor</div>
            <div className="text-[#8E8E93] mt-1">Elena • Due 2d</div>
          </div>
          <div className="p-3 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.10] shadow-sm">
            <div className="text-black dark:text-white font-bold mb-1">IN PROGRESS</div>
            <div className="text-black dark:text-white font-medium">Acme SSO Assessment</div>
            <div className="text-[#8E8E93] mt-1">Aryan • Due 3d</div>
          </div>
          <div className="p-3 rounded-[12px] bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.10] shadow-sm">
            <div className="text-[#0071E3] dark:text-[#0A84FF] font-bold mb-1">DONE</div>
            <div className="text-black dark:text-white font-medium">AST Parser Benchmark</div>
            <div className="text-[#8E8E93] mt-1">Passed (38ms)</div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-black text-[#1D1D1F] dark:text-white font-sans selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black transition-colors duration-300">
      {/* Apple-grade Sticky Header */}
      <header className="sticky top-0 z-40 h-[52px] border-b border-black/[0.08] dark:border-white/[0.10] flex items-center justify-between px-6 lg:px-12 backdrop-blur-[24px] bg-white/80 dark:bg-black/80 transition-colors select-none relative">
        <div className="flex items-center gap-2.5 z-10">
          <div className="w-7 h-7 rounded-[8px] bg-black text-white dark:bg-white dark:text-black flex items-center justify-center font-bold text-xs shadow-sm">
            T
          </div>
          <span className="font-semibold text-[15px] tracking-tight text-black dark:text-white">TARS</span>
        </div>

        {/* Center Navigation: Mathematically centered in viewport */}
        <nav className="hidden md:flex items-center gap-8 text-[13px] font-medium text-[#86868B] dark:text-[#8E8E98] absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">
          <a
            href="#capabilities"
            onClick={(e) => handleScrollTo(e, 'capabilities')}
            className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            Workspaces
          </a>
          <a
            href="#hardware"
            onClick={(e) => handleScrollTo(e, 'hardware')}
            className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            Air-Gap Architecture
          </a>
          <a
            href="#specifications"
            onClick={(e) => handleScrollTo(e, 'specifications')}
            className="hover:text-black dark:hover:text-white transition-colors cursor-pointer"
          >
            Specifications
          </a>
        </nav>

        <div className="flex items-center gap-2.5 z-10">
          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-1.5 h-8 w-8 rounded-[8px] text-[#86868B] dark:text-[#8E8E98] hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors flex items-center justify-center"
              title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
              aria-label="Toggle theme"
            >
              {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={() => onOpenAuth('signin')}
            className="px-3.5 py-1.5 text-[13px] font-medium text-[#1D1D1F] dark:text-[#F5F5F7] hover:opacity-70 transition-opacity"
          >
            Sign In
          </button>
          <button
            onClick={() => onOpenAuth('signup')}
            className="h-8 px-4 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[12px] font-medium active:scale-[0.98] transition-all shadow-sm"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-6 lg:px-12 max-w-5xl mx-auto flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#121317] text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E98] mb-6 shadow-xs">
          <span>TARS 2.0</span>
          <span className="text-black/[0.2] dark:text-white/[0.2]">|</span>
          <span className="text-black dark:text-white">Institutional Memory for High-Growth Startups</span>
        </div>

        <h1 className="text-5xl sm:text-7xl lg:text-[76px] font-bold tracking-tight text-black dark:text-white max-w-4xl mx-auto leading-[1.05] mb-6 text-center">
          The sovereign brain for high-growth startups.
        </h1>

        <p className="text-lg sm:text-xl text-[#86868B] dark:text-[#8E8E98] max-w-2xl mx-auto font-normal leading-relaxed mb-10 text-center">
          Zero cloud telemetry. Every customer conversation, code invariant, and founder decision compiled into your company's permanent, private institutional memory.
        </p>

        {/* Hero CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mb-14">
          <button
            onClick={() => onOpenAuth('signup')}
            className="w-full sm:w-auto h-11 px-7 rounded-full bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 text-[13px] font-medium active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-sm"
          >
            <span>Get Started</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onLaunchDemo}
            className="w-full sm:w-auto h-11 px-7 rounded-full border border-black/[0.12] dark:border-white/[0.16] bg-white dark:bg-[#121317] text-black dark:text-white text-[13px] font-medium hover:bg-black/[0.04] dark:hover:bg-white/[0.06] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xs"
          >
            <span>Launch Live Workspace</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#86868B]" />
          </button>
        </div>

        {/* Local Sovereign Node Summary Card */}
        <div className="w-full max-w-3xl mx-auto rounded-[22px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#121317] p-4 sm:p-5 shadow-[0_12px_40px_rgba(0,0,0,0.06)] dark:shadow-[0_16px_48px_rgba(0,0,0,0.70)] relative overflow-hidden text-left">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-[#0071E3] dark:text-[#2997FF] shrink-0">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <div className="text-[13px] font-semibold text-black dark:text-white">Local Sovereign Node</div>
                <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E98] font-mono">Apple Silicon & Linux (48GB Unified RAM)</div>
              </div>
            </div>

            <div className="flex items-center gap-6 font-mono text-xs pt-2 sm:pt-0 border-t sm:border-t-0 border-black/[0.06] dark:border-white/[0.06]">
              <div>
                <div className="text-[10px] text-[#8E8E98] uppercase font-bold">Network</div>
                <div className="text-[#0071E3] dark:text-[#2997FF] font-bold">0.00 KB Egress</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8E8E98] uppercase font-bold">AST Check</div>
                <div className="text-black dark:text-white font-bold">&lt;38ms</div>
              </div>
              <div>
                <div className="text-[10px] text-[#8E8E98] uppercase font-bold">Vector Graph</div>
                <div className="text-black dark:text-white font-bold">Local Tantivy</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Capabilities Segment Showcase */}
      <section id="capabilities" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto border-t border-black/[0.08] dark:border-white/[0.08]">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-black dark:text-white mb-2">
            Integrated Workspace Architecture
          </h2>
          <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] max-w-md mx-auto">
            Five synchronized workspaces designed for institutional memory and execution.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-8 overflow-x-auto pb-2">
          <div className="p-1 rounded-full bg-black/[0.06] dark:bg-white/[0.08] flex gap-1">
            {capabilities.map((c) => (
              <button
                key={c.id}
                onClick={() => setActiveTab(c.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeTab === c.id
                    ? 'bg-white dark:bg-[#3A3A3C] text-black dark:text-white shadow-sm'
                    : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white'
                }`}
              >
                {c.icon}
                <span className="whitespace-nowrap">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Showcase Card */}
        {(() => {
          const cap = capabilities.find((c) => c.id === activeTab)!;
          return (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center rounded-[24px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] p-6 sm:p-10 shadow-[0_8px_32px_rgba(0,0,0,0.06)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.50)]">
              <div className="lg:col-span-5 space-y-4">
                <div className="inline-flex items-center gap-2 text-[11px] font-bold text-black dark:text-white uppercase tracking-wider">
                  {cap.icon}
                  <span>{cap.label}</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white leading-snug">
                  {cap.title}
                </h3>
                <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                  {cap.subtitle}
                </p>

                <div className="grid grid-cols-3 gap-3 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
                  {cap.metrics.map((m, i) => (
                    <div key={i} className="space-y-0.5">
                      <div className="text-[10px] font-mono text-[#8E8E93] uppercase font-bold">{m.label}</div>
                      <div className="text-xs font-semibold text-black dark:text-white font-mono">{m.value}</div>
                    </div>
                  ))}
                </div>

                <div className="pt-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={onLaunchDemo}
                    icon={<ArrowRight className="w-3.5 h-3.5" />}
                  >
                    Open Workspace
                  </Button>
                </div>
              </div>

              <div className="lg:col-span-7 rounded-[18px] border border-black/[0.06] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 p-5">
                {cap.preview}
              </div>
            </div>
          );
        })()}
      </section>

      {/* Hardware Appliance & Zero Egress */}
      <section id="hardware" className="py-20 px-6 lg:px-12 max-w-5xl mx-auto border-t border-black/[0.08] dark:border-white/[0.08]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-6 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] text-[11px] font-mono text-[#3C3C43] dark:text-[#EBEBF5]">
              <Server className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>Turnkey Hardware Ownership</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-bold tracking-tight text-black dark:text-white leading-tight">
              100% Offline Resilience. Zero WAN Dependency.
            </h2>
            <p className="text-xs sm:text-sm text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
              TARS runs on dedicated local silicon. Even if the WAN ethernet cable is physically disconnected, all document indexing, Whisper transcription, and AST pre-commit checks continue without disruption.
            </p>

            <div className="space-y-2 text-xs font-mono text-[#3C3C43] dark:text-[#EBEBF5]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                <span>Zero telemetry sockets (E_net = 0.00 KB) verified</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                <span>Local Whisper-Large-v3 speech recognition</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                <span>Deterministic Tree-sitter AST queries in &lt;50ms</span>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 rounded-[22px] border border-black/[0.12] dark:border-white/[0.14] bg-black text-white p-6 shadow-2xl font-mono text-xs space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.10]">
              <div className="flex items-center gap-2 text-zinc-300">
                <Terminal className="w-4 h-4 text-[#0A84FF]" />
                <span className="font-semibold text-white">tars-host-doctor --verify-airgap</span>
              </div>
              <span className="text-[10px] text-[#0A84FF] bg-[#0A84FF]/[0.15] px-2 py-0.5 rounded border border-[#0A84FF]/[0.30] font-bold">
                AIR-GAPPED
              </span>
            </div>

            <div className="space-y-1 text-zinc-400 text-[11px] leading-relaxed">
              <div>[KERNEL] Probing physical network interfaces (eth0, wlan0)...</div>
              <div>[SOCKET] Outbound sockets outside local subnet: 0 pkts</div>
              <div>[EGRESS] Verified invariant: E_net = 0.00 KB</div>
              <div>[GRAPH] Tantivy vector store: 4 active collections</div>
              <div className="text-[#0A84FF] pt-1 font-semibold">
                ✓ ALL SOVEREIGN INVARIANTS SATISFIED. ZERO WAN EXPOSURE.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-black/[0.08] dark:border-white/[0.08] py-10 px-6 lg:px-12 max-w-5xl mx-auto text-xs text-[#8E8E93] font-mono select-none">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-[6px] bg-black text-white dark:bg-white dark:text-black font-bold text-[10px] flex items-center justify-center">
              T
            </div>
            <span className="text-black dark:text-white font-sans font-semibold">TARS Sovereign OS</span>
          </div>
          <div className="flex items-center gap-6 text-[11px]">
            <span>Air-Gap Invariant Verified</span>
            <span>Tree-Sitter &lt;38ms</span>
            <span>Local Tantivy</span>
          </div>
        </div>
        <div className="mt-6 pt-4 border-t border-black/[0.05] dark:border-white/[0.06] text-center sm:text-left text-[11px] text-[#8E8E93]">
          © 2026 TARS. 100% on-premises intelligence. Zero cloud egress.
        </div>
      </footer>
    </div>
  );
};
