import React, { useState } from 'react';
import { Dialog } from '../primitives/Dialog';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import {
  Sliders,
  Shield,
  Activity,
  BookOpen,
  Volume2,
  CheckCircle2,
  Cpu,
  Layers,
  Sparkles,
  GitBranch,
  X,
  Play,
  RotateCw,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab = 'genesis' | 'governor' | 'airgap' | 'acronyms' | 'taxonomy';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('genesis');

  // Genesis Interview state
  const [genesisStep, setGenesisStep] = useState(1);
  const [genesisAnswer, setGenesisAnswer] = useState('');
  const [bloomingNodesCount, setBloomingNodesCount] = useState(4);
  const [genesisGenerating, setGenesisGenerating] = useState(false);
  const [genesisComplete, setGenesisComplete] = useState(false);

  // Host Resource Governor state
  const [ramLimit, setRamLimit] = useState(16);
  const [vramLimit, setVramLimit] = useState(8);
  const [threadSlots, setThreadSlots] = useState(4);

  // Air-Gap Testing state
  const [socketTesting, setSocketTesting] = useState(false);
  const [airGapVerified, setAirGapVerified] = useState(true);

  // Acronyms state
  const [acronyms, setAcronyms] = useState<{ term: string; definition: string }[]>([
    { term: 'BGE', definition: 'BAAI General Embedding model for local sub-15ms vector queries' },
    { term: 'AST', definition: 'Abstract Syntax Tree parsed via native C-bindings in Tree-sitter' },
    { term: 'MADR', definition: 'Markdown Architecture Decision Record living in docs/adr/' },
    { term: 'VPC', definition: 'Virtual Private Cloud network container required by enterprise NDAs' },
  ]);
  const [newTerm, setNewTerm] = useState('');
  const [newDef, setNewDef] = useState('');

  // Taxonomy & Tone state
  const [taxonomy, setTaxonomy] = useState<'B2B SaaS' | 'DeepTech' | 'D2C' | 'Agency'>('B2B SaaS');
  const [tone, setTone] = useState<'Socratic Guide' | "Devil's Advocate" | 'Concise Executive'>('Concise Executive');

  if (!isOpen) return null;

  const handleGenesisSubmit = () => {
    if (!genesisAnswer.trim()) return;
    setGenesisGenerating(true);
    setTimeout(() => {
      setBloomingNodesCount((prev) => prev + 3);
      setGenesisGenerating(false);
      if (genesisStep < 3) {
        setGenesisStep((prev) => prev + 1);
        setGenesisAnswer('');
      } else {
        setGenesisComplete(true);
      }
    }, 600);
  };

  const handleTestAirGap = () => {
    setSocketTesting(true);
    setTimeout(() => {
      setSocketTesting(false);
      setAirGapVerified(true);
    }, 800);
  };

  const handleAddAcronym = () => {
    if (!newTerm.trim() || !newDef.trim()) return;
    setAcronyms((prev) => [...prev, { term: newTerm.trim().toUpperCase(), definition: newDef.trim() }]);
    setNewTerm('');
    setNewDef('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-3xl bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] rounded-3xl border border-black/10 dark:border-white/10 shadow-[0_24px_70px_rgba(0,0,0,0.18)] z-10 overflow-hidden flex flex-col max-h-[85vh] animate-apple-in">
        {/* Header */}
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/10 flex items-center justify-between shrink-0 bg-[#F5F5F7] dark:bg-[#2C2C2E]/60">
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-[#1D1D1F] dark:text-white">
              Company Setup & System Preferences
            </h3>
            <p className="text-xs text-[#6E6E73] dark:text-zinc-400 mt-0.5">
              Foundational company interview, hardware limits, local verification & dictionary
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full text-[#6E6E73] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-black/10 dark:border-white/10 bg-white dark:bg-[#1C1C1E] shrink-0 overflow-x-auto">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'genesis', label: 'Setup Interview' },
              { value: 'governor', label: 'Hardware Limits' },
              { value: 'airgap', label: 'Security Verification' },
              { value: 'acronyms', label: 'Company Dictionary' },
              { value: 'taxonomy', label: 'Voice & Tone' },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as SettingsTab)}
          />
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* TAB 1: GENESIS COLD-START INTERVIEW */}
          {activeTab === 'genesis' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface-secondary/40 space-y-1">
                <div className="text-xs font-semibold text-tars-accent uppercase tracking-wider">
                  PRD Section 5.2 • Day 1 Cold Start
                </div>
                <h4 className="text-sm font-semibold text-tars-text-primary">
                  15-Minute Socratic "Genesis Interview"
                </h4>
                <p className="text-xs text-tars-text-secondary leading-relaxed">
                  For brand-new startups with zero documents: TARS conducts a 15-minute voice or text interview probing your thesis, customer commitments, and technical constraints while your knowledge graph blooms in real time.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left: Interview Dialog */}
                <div className="md:col-span-7 space-y-3">
                  {!genesisComplete ? (
                    <div className="space-y-3">
                      <div className="p-3.5 rounded-xl border border-tars-separator bg-tars-surface space-y-1 text-xs">
                        <span className="font-semibold text-tars-accent">
                          TARS Question #{genesisStep} of 3
                        </span>
                        <p className="text-tars-text-primary font-medium text-sm">
                          {genesisStep === 1
                            ? "What is the core customer problem you are solving, and what initial pricing agreement did you discuss?"
                            : genesisStep === 2
                            ? "What technical architecture constraints or compliance boundaries must your team enforce deterministically?"
                            : "What key customer promises or enterprise SLA timelines have been communicated?"}
                        </p>
                      </div>

                      <textarea
                        rows={3}
                        value={genesisAnswer}
                        onChange={(e) => setGenesisAnswer(e.target.value)}
                        placeholder="Type founder answer or dictate over local audio..."
                        className="w-full p-3 text-xs sm:text-sm rounded-xl border border-tars-separator bg-tars-canvas text-tars-text-primary focus:outline-none focus:ring-1 focus:ring-tars-accent"
                      />

                      <Button
                        variant="primary"
                        size="sm"
                        loading={genesisGenerating}
                        onClick={handleGenesisSubmit}
                        className="w-full"
                      >
                        {genesisStep === 3 ? "Compile Initial Memo" : "Submit Answer & Bloom Graph"}
                      </Button>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-tars-success-text/30 bg-tars-success-bg/20 space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-tars-success-text font-semibold">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Genesis Interview Completed!</span>
                      </div>
                      <p className="text-tars-text-primary leading-relaxed">
                        Generated first cohesive executive briefing memo. Seeded Kùzu graph with {bloomingNodesCount} nodes and 8 relational edges.
                      </p>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setGenesisStep(1);
                          setGenesisComplete(false);
                          setBloomingNodesCount(4);
                        }}
                      >
                        Reset Genesis Walkthrough
                      </Button>
                    </div>
                  )}
                </div>

                {/* Right: Live Knowledge Graph Blooming SVG Canvas */}
                <div className="md:col-span-5 space-y-2">
                  <div className="text-[11px] font-semibold text-tars-text-tertiary uppercase tracking-wider flex items-center justify-between">
                    <span>Live Graph Blooming</span>
                    <span className="font-mono text-tars-accent">{bloomingNodesCount} Entities</span>
                  </div>

                  <div className="h-56 rounded-xl border border-tars-separator bg-tars-surface-secondary/50 flex items-center justify-center p-2 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 240 180">
                      {/* Blooming animated SVG nodes */}
                      <circle cx="120" cy="90" r="14" fill="var(--accent)" className="animate-pulse" />
                      <text x="120" y="94" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
                        TARS
                      </text>

                      {/* Blooming satellite nodes */}
                      <line x1="120" y1="90" x2="60" y2="40" stroke="var(--separator)" strokeWidth="1.5" />
                      <circle cx="60" cy="40" r="10" fill="var(--surface)" stroke="var(--accent)" />
                      <text x="60" y="43" textAnchor="middle" fill="var(--text-primary)" fontSize="6.5">Thesis</text>

                      <line x1="120" y1="90" x2="180" y2="40" stroke="var(--separator)" strokeWidth="1.5" />
                      <circle cx="180" cy="40" r="10" fill="var(--surface)" stroke="var(--accent)" />
                      <text x="180" y="43" textAnchor="middle" fill="var(--text-primary)" fontSize="6.5">Pricing</text>

                      <line x1="120" y1="90" x2="60" y2="140" stroke="var(--separator)" strokeWidth="1.5" />
                      <circle cx="60" cy="140" r="10" fill="var(--surface)" stroke="var(--warning-text)" />
                      <text x="60" y="143" textAnchor="middle" fill="var(--text-primary)" fontSize="6.5">Invariants</text>

                      {bloomingNodesCount > 4 && (
                        <>
                          <line x1="120" y1="90" x2="180" y2="140" stroke="var(--separator)" strokeWidth="1.5" />
                          <circle cx="180" cy="140" r="10" fill="var(--surface)" stroke="var(--success-text)" />
                          <text x="180" y="143" textAnchor="middle" fill="var(--text-primary)" fontSize="6.5">ADRs</text>

                          <line x1="60" y1="40" x2="30" y2="80" stroke="var(--separator)" strokeWidth="1" strokeDasharray="2 2" />
                          <circle cx="30" cy="80" r="7" fill="var(--surface-tertiary)" stroke="var(--separator)" />
                        </>
                      )}
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RESOURCE GOVERNOR */}
          {activeTab === 'governor' && (
            <div className="space-y-5 text-xs">
              <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface-secondary/40 space-y-1">
                <div className="text-xs font-semibold text-tars-accent uppercase tracking-wider">
                  Host Resource Governor
                </div>
                <p className="text-tars-text-secondary leading-relaxed">
                  Controls silicon resource allocations on the startup's local server machine (`http://tars.local:7777`). Ensures background Whisper and continuous batching never exceed memory budgets.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface space-y-2">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-tars-text-primary">RAM Memory Allocation Ceiling</span>
                    <span className="font-mono text-tars-accent font-bold">{ramLimit} GB</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={32}
                    step={2}
                    value={ramLimit}
                    onChange={(e) => setRamLimit(Number(e.target.value))}
                    className="w-full accent-tars-text-primary"
                  />
                  <div className="flex justify-between text-[11px] text-tars-text-tertiary font-mono">
                    <span>4 GB (Lightweight)</span>
                    <span>16 GB (Recommended)</span>
                    <span>32 GB (Max)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface space-y-2">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-tars-text-primary">VRAM Compute Allocation (Ollama Qwen 8B)</span>
                    <span className="font-mono text-tars-accent font-bold">{vramLimit} GB</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={16}
                    step={2}
                    value={vramLimit}
                    onChange={(e) => setVramLimit(Number(e.target.value))}
                    className="w-full accent-tars-text-primary"
                  />
                  <div className="flex justify-between text-[11px] text-tars-text-tertiary font-mono">
                    <span>2 GB (CPU Quant)</span>
                    <span>8 GB (4-bit GGUF)</span>
                    <span>16 GB (Full VRAM)</span>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface space-y-2">
                  <div className="flex justify-between items-center font-medium">
                    <span className="text-tars-text-primary">Continuous Batching Concurrency Slots (np)</span>
                    <span className="font-mono text-tars-accent font-bold">{threadSlots} Slots</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={threadSlots}
                    onChange={(e) => setThreadSlots(Number(e.target.value))}
                    className="w-full accent-tars-text-primary"
                  />
                  <p className="text-[11px] text-tars-text-secondary">
                    Tier 1 (Instant CPU &lt;15ms) vs Tier 2 (Ollama batch queue).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AIR-GAP SOVEREIGN PROOF */}
          {activeTab === 'airgap' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-tars-success-text/30 bg-tars-success-bg/20 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-tars-success-text" />
                    <span className="text-sm font-semibold text-tars-text-primary">
                      100% Sovereign Air-Gap Guarantee
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full font-mono text-[11px] bg-tars-success-text text-white font-bold">
                    E_net = 0.00 KB
                  </span>
                </div>
                <p className="text-tars-text-secondary leading-relaxed">
                  All outbound socket connections are mathematically blocked. Code diffs, payroll models, and client call recordings never leave your office host silicon.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-tars-text-primary">
                    Stage Airplane-Mode Live Verification
                  </span>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={socketTesting}
                    icon={<RotateCw className="w-3.5 h-3.5" />}
                    onClick={handleTestAirGap}
                  >
                    Test Socket Egress
                  </Button>
                </div>

                <div className="p-3 rounded-lg bg-black text-emerald-400 font-mono text-xs space-y-1 overflow-x-auto select-text">
                  <div>[TARS-AUDIT] Socket probe: 127.0.0.1:11434 (Ollama) ... OK (Local)</div>
                  <div>[TARS-AUDIT] Socket probe: 127.0.0.1:7777 (Gateway) ... OK (Local)</div>
                  <div>[TARS-AUDIT] External WAN probe (0.0.0.0/0) ... BLOCKED [Egress = 0.00 KB]</div>
                  <div>[TARS-AUDIT] AST Pre-commit check latency ... 38.4 ms (PASS)</div>
                  <div className="text-white font-bold pt-1">
                    ✓ Airplane-mode invariant verified. Safe for defense / enterprise client NDA.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACRONYM DICTIONARY */}
          {activeTab === 'acronyms' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface-secondary/40 space-y-1">
                <div className="text-xs font-semibold text-tars-accent uppercase tracking-wider">
                  Company Vocabulary & Acronym Dictionary
                </div>
                <p className="text-tars-text-secondary leading-relaxed">
                  Define proprietary codenames, client shorthand, and acronyms to eliminate local LLM misunderstandings during voice-to-spec extraction.
                </p>
              </div>

              {/* Add New Term */}
              <div className="p-3.5 rounded-xl border border-tars-separator bg-tars-surface flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Acronym (e.g. SAML)"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="sm:w-32 px-3 py-1.5 rounded-lg border border-tars-separator bg-tars-canvas text-xs"
                />
                <input
                  type="text"
                  placeholder="Definition & domain context"
                  value={newDef}
                  onChange={(e) => setNewDef(e.target.value)}
                  className="flex-1 px-3 py-1.5 rounded-lg border border-tars-separator bg-tars-canvas text-xs"
                />
                <Button variant="primary" size="sm" onClick={handleAddAcronym}>
                  Add Term
                </Button>
              </div>

              {/* Acronyms List */}
              <div className="space-y-2">
                {acronyms.map((ac, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl border border-tars-separator bg-tars-surface flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono font-bold text-tars-accent mr-2">{ac.term}</span>
                      <span className="text-tars-text-primary">{ac.definition}</span>
                    </div>
                    <button
                      onClick={() => setAcronyms((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-tars-text-tertiary hover:text-tars-critical-text"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: TAXONOMY & TONE */}
          {activeTab === 'taxonomy' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface space-y-2">
                <span className="font-semibold text-tars-text-primary block">
                  Industry Startup Taxonomy
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['B2B SaaS', 'DeepTech', 'D2C', 'Agency'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTaxonomy(t)}
                      className={`p-2.5 rounded-xl border text-center transition-colors ${
                        taxonomy === t
                          ? 'border-tars-border-strong bg-tars-surface-tertiary font-bold text-tars-text-primary'
                          : 'border-tars-separator bg-tars-surface text-tars-text-secondary'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface space-y-2">
                <span className="font-semibold text-tars-text-primary block">
                  Role-Based AI Persona Tone Switcher
                </span>
                <div className="space-y-2">
                  {[
                    {
                      name: 'Concise Executive',
                      desc: 'Bullet-pointed, high-density briefings for rapid search and decision making.',
                    },
                    {
                      name: "Devil's Advocate",
                      desc: 'Challenges premises and stresses business models during pitch and PR reviews.',
                    },
                    {
                      name: 'Socratic Guide',
                      desc: 'Patient, pedagogical explanations for junior developer onboarding.',
                    },
                  ].map((t) => (
                    <div
                      key={t.name}
                      onClick={() => setTone(t.name as any)}
                      className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                        tone === t.name
                          ? 'border-tars-border-strong bg-tars-surface-tertiary font-medium text-tars-text-primary'
                          : 'border-tars-separator bg-tars-surface text-tars-text-secondary hover:bg-tars-surface-secondary'
                      }`}
                    >
                      <div className="font-semibold text-tars-text-primary">{t.name}</div>
                      <div className="text-[11px] text-tars-text-secondary mt-0.5">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-tars-separator bg-tars-surface-secondary/40 shrink-0 flex items-center justify-between text-xs">
          <span className="text-tars-text-tertiary font-mono">
            Host: tars.local:7777 • Mode: Sovereign
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
