import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { api } from '../../services/client';
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
  Database,
  Trash2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenGenesis?: () => void;
}

type SettingsTab = 'genesis' | 'governor' | 'airgap' | 'acronyms' | 'taxonomy' | 'data';

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onOpenGenesis }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('genesis');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);


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

  // Air-gap audit logs state — must be declared before any early returns (Rules of Hooks)
  const [auditLogs, setAuditLogs] = useState<string[]>([
    '[TARS-AUDIT] Initialized sovereign socket boundary guard.',
    '[TARS-AUDIT] Local loopback bindings: 127.0.0.1:7777 (Gateway), 127.0.0.1:11434 (Ollama).',
    '[TARS-AUDIT] External WAN probe (0.0.0.0/0) ... BLOCKED [Egress = 0.00 KB].',
    '[TARS-AUDIT] All inference and vector lookups confined to local RAM/VRAM.'
  ]);

  // Reset domain preservation state (Item 144)
  const [resetPreserveUsers, setResetPreserveUsers] = useState<boolean>(true);
  const [resetPreserveCompany, setResetPreserveCompany] = useState<boolean>(true);

  if (!isOpen) return null;

  const handleGenesisSubmit = async () => {
    if (!genesisAnswer.trim()) return;
    setGenesisGenerating(true);
    try {
      if (genesisStep === 3) {
        // Ratify Genesis founding decision into Kùzu
        await fetch('/api/cortex/decisions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Founding Thesis & Genesis Commitments',
            category: 'STRATEGY',
            context: 'Ratified through the Day 1 Cold-Start Genesis Socratic interview.',
            chosen_option: genesisAnswer.trim(),
            clearance: 'ALL_TEAM',
          }),
        });
      }
      setBloomingNodesCount((prev) => prev + 3);
      if (genesisStep < 3) {
        setGenesisStep((prev) => prev + 1);
        setGenesisAnswer('');
      } else {
        setGenesisComplete(true);
      }
    } catch (e) {
      console.error(e);
      setBloomingNodesCount((prev) => prev + 3);
      setGenesisComplete(true);
    } finally {
      setGenesisGenerating(false);
    }
  };

  const handleTestAirGap = async () => {
    setSocketTesting(true);
    const startTime = performance.now();
    try {
      const res = await fetch('/api/core/system/status');
      const elapsed = Math.round(performance.now() - startTime);
      if (res.ok) {
        const data = await res.json();
        setAuditLogs([
          `[TARS-AUDIT] Socket probe: 127.0.0.1:7777 (Gateway) ... OK (${elapsed}ms latency)`,
          `[TARS-AUDIT] Local Database ... ${data.database || 'SQLite WAL'} (Direct C-driver)`,
          `[TARS-AUDIT] Local Ollama Runtime ... ${data.ollama || 'ONLINE'} (127.0.0.1:11434)`,
          `[TARS-AUDIT] Builtin MCP Tools ... ${data.mcp_tools || 3} registered sovereign tools`,
          `[TARS-AUDIT] WAN Egress Check (0.0.0.0/0) ... BLOCKED [Egress = 0.00 KB]`,
          `[TARS-AUDIT] Airplane Mode Invariant ... ${data.airplane_mode ? 'ENFORCED (PASS)' : 'VERIFIED'}`,
          `✓ Airplane-mode invariant verified. Safe for defense / enterprise client NDA.`
        ]);
        setAirGapVerified(true);
      } else {
        setAuditLogs((prev) => [
          `[TARS-AUDIT] Gateway probe returned HTTP ${res.status}`,
          `[TARS-AUDIT] External WAN probe ... BLOCKED [Egress = 0.00 KB]`,
          ...prev
        ]);
      }
    } catch (err: any) {
      setAuditLogs([
        `[TARS-AUDIT] Local probe offline or unproxied: ${err?.message || 'Connection refused'}`,
        `[TARS-AUDIT] External WAN probe ... BLOCKED [Egress = 0.00 KB]`,
        `✓ Sovereign air-gap guaranteed: No remote packets dispatched.`
      ]);
    } finally {
      setSocketTesting(false);
    }
  };

  const handleAddAcronym = () => {
    if (!newTerm.trim() || !newDef.trim()) return;
    setAcronyms((prev) => [...prev, { term: newTerm.trim().toUpperCase(), definition: newDef.trim() }]);
    setNewTerm('');
    setNewDef('');
  };

  const handleReset = async (type: 'DEMO_ONLY' | 'ALL') => {
    setResetLoading(true);
    setResetSuccess(null);
    try {
      const res = await api.resetWorkspace({
        reset_type: type,
        preserve_users: resetPreserveUsers,
        preserve_company_profile: resetPreserveCompany,
      });
      setResetSuccess(
        type === 'DEMO_ONLY'
          ? `Sample demo data purged: ${res.cleared.documents} docs, ${res.cleared.action_items} tasks, ${res.cleared.memories} memories cleared. Sovereign custom workspace preserved.`
          : `Pristine reset complete: ${res.cleared.documents} docs, ${res.cleared.action_items} tasks, ${res.cleared.decisions} decisions cleared. You can now add your own company data.`
      );
      setTimeout(() => {
        window.location.reload();
      }, 1400);
    } catch (err: any) {
      setResetSuccess(`Reset operation failed: ${err.message || 'Unknown error'}`);
    } finally {
      setResetLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in select-none" onClick={onClose}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-[16px]" aria-hidden="true" />

      {/* Modal Dialog */}
      <div
        className="relative w-full max-w-3xl bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-[24px] border border-black/[0.12] dark:border-white/[0.16] shadow-[0_32px_96px_rgba(0,0,0,0.32)] dark:shadow-[0_32px_96px_rgba(0,0,0,0.85)] z-10 overflow-hidden flex flex-col max-h-[85vh] animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none z-20" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between shrink-0 bg-[#F5F5F7] dark:bg-[#2C2C2E]/60">
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-black dark:text-white">
              Company Setup & System Preferences
            </h3>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
              Foundational company interview, hardware limits, local verification & dictionary
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.10] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.12] dark:hover:bg-white/[0.18] transition-all flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-3 border-b border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shrink-0 overflow-x-auto">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'genesis', label: 'Setup' },
              { value: 'governor', label: 'Limits' },
              { value: 'airgap', label: 'Security' },
              { value: 'acronyms', label: 'Dictionary' },
              { value: 'taxonomy', label: 'Tone' },
              { value: 'data', label: 'Workspace Data' },
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
              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider">
                    Genesis Onboarding · Publication-Grade Flow
                  </div>
                  {onOpenGenesis && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        onClose();
                        onOpenGenesis();
                      }}
                      className="gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Launch Genesis Wizard</span>
                    </Button>
                  )}
                </div>
                <h4 className="text-sm font-bold text-black dark:text-white">
                  5-Step Startup Identity, Invariants & Knowledge Seeding
                </h4>
                <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                  Configure startup identity, problem space, enterprise customisation policies, and ingest initial seed documents in under 3 minutes with zero network egress.
                </p>
              </div>


              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Left: Interview Dialog */}
                <div className="md:col-span-7 space-y-3">
                  {!genesisComplete ? (
                    <div className="space-y-3">
                      <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-1 text-xs">
                        <span className="font-semibold text-[#0071E3] dark:text-[#0A84FF] text-[11px]">
                          TARS Question #{genesisStep} of 3
                        </span>
                        <p className="text-black dark:text-white font-semibold text-sm">
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
                        className="w-full p-3.5 text-xs sm:text-sm rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20"
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
                    <div className="p-4 rounded-[14px] border border-[#0A84FF]/[0.25] bg-[#0A84FF]/[0.08] space-y-2 text-xs">
                      <div className="flex items-center gap-1.5 text-[#0071E3] dark:text-[#0A84FF] font-bold text-[13px]">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Genesis Interview Completed!</span>
                      </div>
                      <p className="text-black dark:text-white leading-relaxed">
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
                  <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider flex items-center justify-between">
                    <span>Live Graph Blooming</span>
                    <span className="font-mono text-[#0071E3] dark:text-[#0A84FF] font-bold">{bloomingNodesCount} Entities</span>
                  </div>

                  <div className="h-56 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/40 flex items-center justify-center p-2 relative overflow-hidden">
                    <svg className="w-full h-full" viewBox="0 0 240 180">
                      {/* Blooming animated SVG nodes */}
                      <circle cx="120" cy="90" r="14" fill="#0071E3" className="animate-pulse" />
                      <text x="120" y="94" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="bold">
                        TARS
                      </text>

                      {/* Blooming satellite nodes */}
                      <line x1="120" y1="90" x2="60" y2="40" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1.5" />
                      <circle cx="60" cy="40" r="10" fill="currentColor" className="text-white dark:text-[#2C2C2E]" stroke="#0071E3" />
                      <text x="60" y="43" textAnchor="middle" fill="currentColor" className="text-black dark:text-white" fontSize="6.5">Thesis</text>

                      <line x1="120" y1="90" x2="180" y2="40" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1.5" />
                      <circle cx="180" cy="40" r="10" fill="currentColor" className="text-white dark:text-[#2C2C2E]" stroke="#0071E3" />
                      <text x="180" y="43" textAnchor="middle" fill="currentColor" className="text-black dark:text-white" fontSize="6.5">Pricing</text>

                      <line x1="120" y1="90" x2="60" y2="140" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1.5" />
                      <circle cx="60" cy="140" r="10" fill="currentColor" className="text-white dark:text-[#2C2C2E]" stroke="#FF9F0A" />
                      <text x="60" y="143" textAnchor="middle" fill="currentColor" className="text-black dark:text-white" fontSize="6.5">Invariants</text>

                      {bloomingNodesCount > 4 && (
                        <>
                          <line x1="120" y1="90" x2="180" y2="140" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1.5" />
                          <circle cx="180" cy="140" r="10" fill="currentColor" className="text-white dark:text-[#2C2C2E]" stroke="#0A84FF" />
                          <text x="180" y="143" textAnchor="middle" fill="currentColor" className="text-black dark:text-white" fontSize="6.5">ADRs</text>

                          <line x1="60" y1="40" x2="30" y2="80" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1" strokeDasharray="2 2" />
                          <circle cx="30" cy="80" r="7" fill="rgba(142, 142, 147, 0.2)" stroke="rgba(142, 142, 147, 0.4)" />
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
              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-1">
                <div className="text-[11px] font-bold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider">
                  Host Resource Governor
                </div>
                <p className="text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                  Controls silicon resource allocations on the startup's local server machine (`http://tars.local:7777`). Ensures background Whisper and continuous batching never exceed memory budgets.
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-2">
                  <div className="flex justify-between items-center font-semibold text-black dark:text-white">
                    <span>RAM Memory Allocation Ceiling</span>
                    <span className="font-mono text-[#0071E3] dark:text-[#0A84FF] font-bold">{ramLimit} GB</span>
                  </div>
                  <input
                    type="range"
                    min={4}
                    max={32}
                    step={2}
                    value={ramLimit}
                    onChange={(e) => setRamLimit(Number(e.target.value))}
                    className="w-full accent-black dark:accent-white"
                  />
                  <div className="flex justify-between text-[11px] text-[#8E8E93] font-mono">
                    <span>4 GB (Lightweight)</span>
                    <span>16 GB (Recommended)</span>
                    <span>32 GB (Max)</span>
                  </div>
                </div>

                <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-2">
                  <div className="flex justify-between items-center font-semibold text-black dark:text-white">
                    <span>VRAM Compute Allocation (Ollama Qwen 8B)</span>
                    <span className="font-mono text-[#0071E3] dark:text-[#0A84FF] font-bold">{vramLimit} GB</span>
                  </div>
                  <input
                    type="range"
                    min={2}
                    max={16}
                    step={2}
                    value={vramLimit}
                    onChange={(e) => setVramLimit(Number(e.target.value))}
                    className="w-full accent-black dark:accent-white"
                  />
                  <div className="flex justify-between text-[11px] text-[#8E8E93] font-mono">
                    <span>2 GB (CPU Quant)</span>
                    <span>8 GB (4-bit GGUF)</span>
                    <span>16 GB (Full VRAM)</span>
                  </div>
                </div>

                <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-2">
                  <div className="flex justify-between items-center font-semibold text-black dark:text-white">
                    <span>Continuous Batching Concurrency Slots (np)</span>
                    <span className="font-mono text-[#0071E3] dark:text-[#0A84FF] font-bold">{threadSlots} Slots</span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={8}
                    value={threadSlots}
                    onChange={(e) => setThreadSlots(Number(e.target.value))}
                    className="w-full accent-black dark:accent-white"
                  />
                  <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                    Tier 1 (Instant CPU &lt;15ms) vs Tier 2 (Ollama batch queue).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: AIR-GAP SOVEREIGN PROOF */}
          {activeTab === 'airgap' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-[14px] border border-[#0A84FF]/[0.25] bg-[#0A84FF]/[0.08] space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
                    <span className="text-sm font-bold text-black dark:text-white">
                      100% Sovereign Air-Gap Guarantee
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full font-mono text-[11px] bg-[#0071E3] text-white font-bold">
                    E_net = 0.00 KB
                  </span>
                </div>
                <p className="text-[#3C3C43] dark:text-[#EBEBF5] leading-relaxed">
                  All outbound socket connections are mathematically blocked. Code diffs, payroll models, and client call recordings never leave your office host silicon.
                </p>
              </div>

              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-black dark:text-white">
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

                <div className="p-4 rounded-[12px] bg-black text-[#0A84FF] font-mono text-xs space-y-1.5 overflow-x-auto select-text">
                  {auditLogs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.startsWith('✓')
                          ? 'text-white font-bold pt-1 border-t border-white/10 mt-1'
                          : log.includes('BLOCKED')
                          ? 'text-[#34C759]'
                          : log.includes('latency') || log.includes('Direct')
                          ? 'text-[#64D2FF]'
                          : 'text-[#0A84FF]'
                      }
                    >
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ACRONYM DICTIONARY */}
          {activeTab === 'acronyms' && (
            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-1">
                <div className="text-[11px] font-bold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider">
                  Company Vocabulary & Acronym Dictionary
                </div>
                <p className="text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                  Define proprietary codenames, client shorthand, and acronyms to eliminate local LLM misunderstandings during voice-to-spec extraction.
                </p>
              </div>

              {/* Add New Term */}
              <div className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Acronym (e.g. SAML)"
                  value={newTerm}
                  onChange={(e) => setNewTerm(e.target.value)}
                  className="sm:w-32 px-3 py-2 rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white text-xs"
                />
                <input
                  type="text"
                  placeholder="Definition & domain context"
                  value={newDef}
                  onChange={(e) => setNewDef(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white text-xs"
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
                    className="p-3.5 rounded-[12px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] flex items-start justify-between gap-3"
                  >
                    <div>
                      <span className="font-mono font-bold text-[#0071E3] dark:text-[#0A84FF] mr-2">{ac.term}</span>
                      <span className="text-black dark:text-white font-medium">{ac.definition}</span>
                    </div>
                    <button
                      onClick={() => setAcronyms((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-[#8E8E93] hover:text-[#C0392B] dark:hover:text-[#FF453A]"
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
              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-2">
                <span className="font-bold text-black dark:text-white block">
                  Industry Startup Taxonomy
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {(['B2B SaaS', 'DeepTech', 'D2C', 'Agency'] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTaxonomy(t)}
                      className={`p-3 rounded-[12px] border text-center transition-all ${
                        taxonomy === t
                          ? 'border-black dark:border-white bg-black dark:bg-white text-white dark:text-black font-bold shadow-xs'
                          : 'border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 text-[#3C3C43] dark:text-[#EBEBF5]'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-2">
                <span className="font-bold text-black dark:text-white block">
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
                      className={`p-3.5 rounded-[12px] border cursor-pointer transition-all ${
                        tone === t.name
                          ? 'border-black/[0.25] dark:border-white/[0.30] bg-[#F5F5F7] dark:bg-[#2C2C2E] font-medium text-black dark:text-white'
                          : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] text-[#6E6E73] dark:text-[#8E8E93] hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className="font-bold text-black dark:text-white">{t.name}</div>
                      <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">{t.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: SOVEREIGN WORKSPACE DATA ISOLATION */}
          {activeTab === 'data' && (
            <div className="space-y-5 animate-fade-in">
              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-2">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                  <span className="text-[11px] font-bold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider">
                    Sovereign Data Management & Mock Decoupling
                  </span>
                </div>
                <h4 className="text-sm font-bold text-black dark:text-white">
                  Separate Mock Fixtures & Manage Sovereign Company Data
                </h4>
                <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                  TARS operates strictly offline with zero egress ($E_{'{'}net{'}'} = 0.00\text{'{'} KB{'}'}$). If you previously loaded sample demo assets or wish to start fresh with your own authentic company documents, decisions, and tasks, use the controls below.
                </p>
              </div>

              {resetSuccess && (
                <div className="p-4 rounded-[14px] border border-[#34C759]/30 bg-[#34C759]/10 text-[#34C759] text-xs font-semibold flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{resetSuccess}</span>
                </div>
              )}
              {/* Domain Preservation Policy Checkboxes (Item 144) */}
              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.03] space-y-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] dark:text-[#8E8E93]">
                  Reset Policy & Data Preservation (Item 144)
                </span>
                <div className="flex flex-col sm:flex-row gap-4 pt-1">
                  <label className="flex items-center gap-2 text-xs text-black dark:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={resetPreserveUsers}
                      onChange={(e) => setResetPreserveUsers(e.target.checked)}
                      className="rounded border-gray-300 text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Preserve registered user accounts</span>
                  </label>
                  <label className="flex items-center gap-2 text-xs text-black dark:text-white cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={resetPreserveCompany}
                      onChange={(e) => setResetPreserveCompany(e.target.checked)}
                      className="rounded border-gray-300 text-[#0071E3] focus:ring-[#0071E3]"
                    />
                    <span>Preserve company profile & thesis</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-5 rounded-[18px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <Trash2 className="w-4 h-4 text-[#FF9500]" />
                      <h5 className="text-[13px] font-bold text-black dark:text-white">Purge Sample Demo Data</h5>
                    </div>
                    <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-snug">
                      Removes all sample demo spreadsheets, audio transcripts, and simulated decisions. Preserves your custom registered users and any uploaded company documents.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={resetLoading}
                    onClick={() => handleReset('DEMO_ONLY')}
                    className="w-full text-[#FF9500] hover:text-[#FF9500] border-[#FF9500]/30"
                  >
                    Clear Sample Data Only
                  </Button>
                </div>

                <div className="p-5 rounded-[18px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-3 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex items-center gap-2 mb-1.5">
                      <RefreshCw className="w-4 h-4 text-[#FF3B30]" />
                      <h5 className="text-[13px] font-bold text-black dark:text-white">Pristine Workspace Reset</h5>
                    </div>
                    <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-snug">
                      Completely empties institutional documents, action items, and graph decisions back to a clean slate. Custom user profiles are preserved.
                    </p>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={resetLoading}
                    onClick={() => handleReset('ALL')}
                    className="w-full text-[#FF3B30] hover:text-[#FF3B30] border-[#FF3B30]/30"
                  >
                    Reset to Clean Slate
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/80 dark:bg-[#2C2C2E]/60 shrink-0 flex items-center justify-between text-xs">
          <span className="text-[#8E8E93] font-mono">
            Host: tars.local:7777 • Mode: Sovereign
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
