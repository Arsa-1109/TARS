import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { StatusLabel } from '../primitives/StatusLabel';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { InvariantCheckResult } from '../../types/contracts';
import { EmptyState } from '../primitives/EmptyState';
import { api } from '../../services/client';
import {
  Cpu,
  AlertOctagon,
  CheckCircle2,
  FileCode,
  GitCommit,
  RefreshCw,
  Terminal,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Wand2,
  Play,
  RotateCw,
} from 'lucide-react';

interface ArchitectureWorkspaceProps {
  activeFindingId: string | null;
  onSelectFinding: (ruleId: string) => void;
}

export const ArchitectureWorkspace: React.FC<ArchitectureWorkspaceProps> = ({
  activeFindingId,
  onSelectFinding,
}) => {
  const [invariants, setInvariants] = useState<InvariantCheckResult[]>([]);
  const [selectedRule, setSelectedRule] = useState<InvariantCheckResult | null>(null);
  const [runningCheck, setRunningCheck] = useState(false);
  const [executionTime, setExecutionTime] = useState<number | null>(38.4);
  const [selectedGraphNode, setSelectedGraphNode] = useState<string>('payments');
  const [activeTab, setActiveTab] = useState<'diff' | 'madr' | 'tester'>('diff');
  const [refactorApplied, setRefactorApplied] = useState(false);

  // Staged Diff Tester state
  const [testScenario, setTestScenario] = useState<'INV-017' | 'INV-021' | 'INV-014' | 'INV-008'>('INV-017');
  const [terminalLog, setTerminalLog] = useState<string[]>([]);

  useEffect(() => {
    const scenarioLogs: Record<string, string[]> = {
      'INV-017': [
        '[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...',
        '[tars-hook] Checking 4 staged files (285 additions, 42 deletions)...',
        '[tars-hook] BREACH DETECTED: INV-017 (External HTTP calls inside database transactions)',
        "[tars-hook] Violating AST node: CallExpression 'stripe_client.charges.create' at src/payments/service.py:84",
        '[tars-hook] ERROR: Commit blocked in 38.4ms. Outbox pattern required.'
      ],
      'INV-021': [
        '[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...',
        '[tars-hook] Checking 2 staged files in src/storage/...',
        '[tars-hook] BREACH DETECTED: INV-021 (Cloud S3 sync import in offline binary)',
        "[tars-hook] Violating AST node: ImportDeclaration 'boto3.client(\"s3\")' in src/storage/sync.py:12",
        '[tars-hook] ERROR: Commit blocked in 21.3ms. Local disk Tantivy storage required by sovereign NDA.'
      ],
      'INV-014': [
        '[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...',
        '[tars-hook] Checking 3 staged files in .tars/flags.yaml and config...',
        '[tars-hook] Invariant check PASS: INV-014 (Dead feature flag resurrection)',
        '[tars-hook] All 14 dormant feature flags confirmed purged.',
        '[tars-hook] Pre-commit AST scan succeeded in 19.8ms.'
      ],
      'INV-008': [
        '[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...',
        '[tars-hook] Checking 1 staged file in src/auth/jwt.py...',
        '[tars-hook] Invariant check PASS: INV-008 (Sensitive token logging prevention)',
        '[tars-hook] Zero raw token identifiers found in logger calls.',
        '[tars-hook] Pre-commit AST scan succeeded in 15.2ms.'
      ]
    };
    setTerminalLog(scenarioLogs[testScenario] || scenarioLogs['INV-017']);
  }, [testScenario]);

  useEffect(() => {
    api.getInvariants().then((data) => {
      setInvariants(data);
      if (data.length > 0) {
        const found = data.find((inv) => inv.rule_id === activeFindingId) || data[0];
        setSelectedRule(found);
      }
    });
  }, [activeFindingId]);

  const handleRunASTCheck = async () => {
    setRunningCheck(true);
    try {
      const res = await api.triggerASTCheck();
      setExecutionTime(res.execution_time_ms);
      setInvariants(res.results);
      if (selectedRule) {
        const updated = res.results.find((r) => r.rule_id === selectedRule.rule_id);
        if (updated) setSelectedRule(updated);
      }
    } finally {
      setRunningCheck(false);
    }
  };

  const handleApplyRefactor = () => {
    setRefactorApplied(true);
    setInvariants((prev) =>
      prev.map((inv) =>
        inv.rule_id === 'INV-017'
          ? {
              ...inv,
              is_breached: false,
              observed_code:
                "# REFACTORED: Outbox pattern applied\nasync with db.transaction():\n    order = await create_order(db, payload)\n    await outbox.publish('order.created', order.id)\n# Stripe dispatch executed asynchronously post-commit",
            }
          : inv
      )
    );
    if (selectedRule?.rule_id === 'INV-017') {
      setSelectedRule((prev) =>
        prev
          ? {
              ...prev,
              is_breached: false,
              observed_code:
                "# REFACTORED: Outbox pattern applied\nasync with db.transaction():\n    order = await create_order(db, payload)\n    await outbox.publish('order.created', order.id)\n# Stripe dispatch executed asynchronously post-commit",
            }
          : null
      );
    }
  };

  // 2D Topology Graph entities
  const graphNodes = [
    { id: 'gateway', name: 'FastAPI Gateway', layer: 'Entry', x: 40, y: 70 },
    { id: 'auth', name: 'Auth Session', layer: 'Core', x: 200, y: 30 },
    {
      id: 'payments',
      name: 'Payments Service',
      layer: 'Core',
      x: 200,
      y: 130,
      isBreached: !refactorApplied,
    },
    { id: 'db', name: 'SQLite Connection Pool', layer: 'Data', x: 380, y: 70 },
    { id: 'webhook', name: 'Outbox Dispatcher', layer: 'Event', x: 380, y: 150 },
  ];

  if (!selectedRule) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Workspace 6"
          title="Tech & Architecture Workspace"
          description="Deterministic architectural enforcement powered by Tree-sitter AST queries (<50ms) and embedded Kùzu call-graph analysis."
          actions={
            <Button
              variant="primary"
              size="sm"
              loading={runningCheck}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleRunASTCheck}
            >
              Run AST Scan
            </Button>
          }
        />
        <EmptyState
          icon={<Cpu className="w-5 h-5 text-[#8E8E93]" />}
          title="No AST invariants loaded yet"
          description="Invariants enforce architectural rules at git pre-commit time. Run an AST check or verify .tars/invariants.yaml."
          actionLabel="Run AST Scan"
          onAction={handleRunASTCheck}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace 6"
        title="Tech & Architecture Workspace"
        description="Deterministic architectural enforcement powered by Tree-sitter AST queries (<50ms) and embedded Kùzu call-graph analysis."
        actions={
          <div className="flex items-center gap-2">
            {executionTime && (
              <span className="text-xs font-mono text-[#6E6E73] dark:text-[#8E8E93] bg-white dark:bg-[#1C1C1E] px-3 py-1.5 rounded-[10px] border border-black/[0.08] dark:border-white/[0.12] shadow-xs">
                AST Scan: <span className="text-black dark:text-white font-bold">{executionTime} ms</span>
              </span>
            )}
            <Button
              variant="primary"
              size="sm"
              loading={runningCheck}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
              onClick={handleRunASTCheck}
            >
              Run AST Hook
            </Button>
          </div>
        }
      />

      {/* Invariant Rules Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {invariants.map((inv) => {
          const isSelected = selectedRule.rule_id === inv.rule_id;
          return (
            <div
              key={inv.rule_id}
              onClick={() => {
                setSelectedRule(inv);
                onSelectFinding(inv.rule_id);
              }}
              className={`p-4 rounded-[18px] border transition-all cursor-pointer ${
                isSelected
                  ? 'border-black/[0.25] dark:border-white/[0.30] bg-white dark:bg-[#1C1C1E] shadow-sm ring-1 ring-black/[0.08] dark:ring-white/[0.12]'
                  : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] hover:border-black/20 dark:hover:border-white/20'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-semibold text-black dark:text-white">
                  {inv.rule_id}
                </span>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    inv.is_breached
                      ? 'bg-[#FF3B30]/10 text-[#FF3B30] dark:text-[#FF453A]'
                      : 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]'
                  }`}
                >
                  {inv.is_breached ? 'Violation' : 'Passing'}
                </span>
              </div>
              <p className="text-xs font-medium text-black dark:text-white line-clamp-2 leading-snug">
                {inv.rule_name}
              </p>
              <div className="mt-2.5 text-[11px] text-[#86868B] dark:text-[#8E8E93] truncate font-mono">
                {inv.violating_file}:{inv.line_number}
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Split: Left Code Evidence / MADR & Right Call Graph */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: AST Finding Detail & Code Diff View (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] p-6 space-y-5 shadow-sm">
            {/* View Switcher: Code Diff vs Living MADR vs Git Pre-Commit Simulator */}
            <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3">
              <SegmentedControl
                size="sm"
                options={[
                  { value: 'diff', label: 'AST Code Diff' },
                  { value: 'madr', label: 'Living MADR' },
                  { value: 'tester', label: 'Pre-Commit Simulator' },
                ]}
                value={activeTab}
                onChange={(v) => setActiveTab(v as any)}
              />

              {selectedRule.is_breached && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Wand2 className="w-3.5 h-3.5" />}
                  onClick={handleApplyRefactor}
                >
                  Apply Outbox Refactor
                </Button>
              )}
            </div>

            {/* TAB 1: CODE DIFF VIEW */}
            {activeTab === 'diff' && (
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-black dark:text-white">
                        {selectedRule.rule_id}
                      </span>
                      <StatusLabel
                        size="sm"
                        status={selectedRule.is_breached ? 'critical' : 'success'}
                        label={selectedRule.is_breached ? 'COMMIT BLOCKED' : 'PASSING'}
                      />
                    </div>
                    <h3 className="text-base font-bold tracking-tight text-black dark:text-white mt-1">
                      {selectedRule.rule_name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-[#8E8E93] bg-black/[0.05] dark:bg-white/[0.08] px-2 py-0.5 rounded">
                    pre-commit hook
                  </span>
                </div>

                {/* Syntax Highlighted Code Diff Container */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                    <span className="font-mono font-medium">{selectedRule.violating_file}:{selectedRule.line_number}</span>
                    <span className="text-[11px] text-[#8E8E93] font-mono">Tree-sitter AST C-bindings</span>
                  </div>

                  <div className="rounded-[14px] border border-black/[0.12] dark:border-white/[0.14] bg-[#121214] text-neutral-200 p-4 font-mono text-xs overflow-x-auto leading-relaxed select-text shadow-inner">
                    {selectedRule.observed_code ? (
                      <pre className="space-y-1">
                        {selectedRule.observed_code.split('\n').map((line, i) => {
                          const isViolatingLine =
                            (line.includes('stripe_client') || line.includes('BREACH')) &&
                            selectedRule.is_breached;
                          return (
                            <div
                              key={i}
                              className={`flex items-start gap-3 px-2 py-0.5 rounded ${
                                isViolatingLine
                                  ? 'bg-[#FF3B30]/[0.15] text-[#FF453A] border-l-2 border-[#FF3B30] font-semibold'
                                  : line.includes('REFACTORED')
                                  ? 'bg-[#0071E3]/[0.15] text-[#0A84FF] border-l-2 border-[#0071E3]'
                                  : 'text-neutral-400'
                              }`}
                            >
                              <span className="text-neutral-600 select-none w-5 text-right shrink-0">
                                {selectedRule.line_number - 2 + i}
                              </span>
                              <span>{line}</span>
                            </div>
                          );
                        })}
                      </pre>
                    ) : (
                      <div className="text-neutral-500">Clean code AST. No syntax invariant violation.</div>
                    )}
                  </div>
                </div>

                {/* Rationale & Suggested Refactor */}
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                    Architectural Rationale
                  </div>
                  <p className="text-xs sm:text-sm text-[#1D1D1F] dark:text-[#EBEBF5] leading-relaxed font-sans">
                    {selectedRule.rationale}
                  </p>

                  <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-1.5 border-l-4 border-l-[#0071E3] dark:border-l-[#0A84FF]">
                    <div className="text-xs font-bold text-black dark:text-white uppercase tracking-wider">
                      Deterministic Suggested Refactor
                    </div>
                    <p className="text-xs sm:text-sm text-black dark:text-white leading-relaxed font-medium">
                      {selectedRule.suggested_refactor}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVING MADR VIEWER */}
            {activeTab === 'madr' && (
              <div className="space-y-4 text-xs font-sans select-text">
                <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-2">
                  <div className="text-xs font-mono font-bold text-[#0071E3] dark:text-[#0A84FF]">
                    docs/adr/{selectedRule.adr_ref}
                  </div>
                  <h4 className="text-sm font-bold text-black dark:text-white">
                    MADR: {selectedRule.rule_name}
                  </h4>
                  <div className="text-[#8E8E93] font-mono text-[11px]">
                    Status: Living • Generated by Local Qwen 8B • Hash: sha256:7f81a9
                  </div>
                </div>

                <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-3 leading-relaxed">
                  <h5 className="font-bold text-black dark:text-white uppercase tracking-wider text-[11px]">
                    1. Context & Problem Statement
                  </h5>
                  <p className="text-[#3C3C43] dark:text-[#EBEBF5]">
                    Wrapping third-party network I/O within a database transaction holds row-level locks indefinitely during network latency spikes, resulting in DB pool exhaustion.
                  </p>

                  <h5 className="font-bold text-black dark:text-white uppercase tracking-wider text-[11px] pt-2">
                    2. Decision Outcome
                  </h5>
                  <p className="text-[#3C3C43] dark:text-[#EBEBF5]">
                    Chosen pattern: **Transactional Outbox Pattern**. All database state changes are committed first; an independent dispatcher reads outbox events and executes external network calls asynchronously.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PRE-COMMIT GIT DIFF TESTER */}
            {activeTab === 'tester' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-black dark:text-white">
                    Simulate Staged Diff Inspection:
                  </span>
                  <div className="flex gap-1.5 text-xs">
                    {(['INV-017', 'INV-021', 'INV-014', 'INV-008'] as const).map((rule) => (
                      <button
                        key={rule}
                        onClick={() => setTestScenario(rule)}
                        className={`px-2.5 py-1 rounded-[8px] text-xs font-mono transition-all ${
                          testScenario === rule
                            ? 'bg-black text-white dark:bg-white dark:text-black font-bold shadow-xs'
                            : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                        }`}
                      >
                        {rule}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[14px] bg-black text-[#0A84FF] font-mono text-xs p-4 space-y-1.5 select-text overflow-x-auto border border-black/[0.12] dark:border-white/[0.12]">
                  <div className="text-neutral-500 font-bold">$ git commit -m "feat(payments): execute stripe charge"</div>
                  {terminalLog.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes('BREACH') || log.includes('ERROR')
                          ? 'text-[#FF453A] font-bold'
                          : log.includes('Violating')
                          ? 'text-[#FF9F0A]'
                          : 'text-[#0A84FF]'
                      }
                    >
                      {log}
                    </div>
                  ))}
                  <div className="text-neutral-400 pt-1 text-[11px]">
                    Executed in 38.4ms on local Apple/x86 silicon • 0.00 KB egress.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: System Topology & Call Graph (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3">
              <div>
                <h4 className="text-xs font-bold text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-black dark:text-white" />
                  <span>Kùzu System Call Topology</span>
                </h4>
                <p className="text-[11px] text-[#8E8E93]">
                  Embedded Graph Cypher verification
                </p>
              </div>
            </div>

            {/* 2D Call Graph Canvas */}
            <div className="rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/40 h-72 flex items-center justify-center p-2 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 240">
                {/* Edges */}
                <line x1="140" y1="100" x2="200" y2="60" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1.5" />
                <line
                  x1="140"
                  y1="100"
                  x2="200"
                  y2="160"
                  stroke={!refactorApplied ? '#FF453A' : 'rgba(142, 142, 147, 0.4)'}
                  strokeWidth="2"
                  strokeDasharray={!refactorApplied ? '3 3' : 'none'}
                />
                <line x1="300" y1="60" x2="380" y2="100" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1.5" />
                <line
                  x1="300"
                  y1="160"
                  x2="380"
                  y2="100"
                  stroke={!refactorApplied ? '#FF453A' : 'rgba(142, 142, 147, 0.4)'}
                  strokeWidth="1.5"
                />
                <line x1="300" y1="160" x2="380" y2="180" stroke="rgba(142, 142, 147, 0.4)" strokeWidth="1.5" />

                {/* Nodes */}
                {graphNodes.map((gn) => {
                  const isSelected = selectedGraphNode === gn.id;
                  return (
                    <g
                      key={gn.id}
                      transform={`translate(${gn.x}, ${gn.y})`}
                      onClick={() => setSelectedGraphNode(gn.id)}
                      className="cursor-pointer"
                    >
                      <rect
                        width="110"
                        height="50"
                        rx="10"
                        fill="currentColor"
                        className="text-white dark:text-[#2C2C2E]"
                        stroke={
                          gn.isBreached
                            ? '#FF453A'
                            : isSelected
                            ? '#0071E3'
                            : 'rgba(142, 142, 147, 0.3)'
                        }
                        strokeWidth={gn.isBreached || isSelected ? '2' : '1'}
                      />
                      <text x="8" y="16" fill="#8E8E93" fontSize="8.5" fontWeight="bold">
                        {gn.layer}
                      </text>
                      <text x="8" y="32" fill="currentColor" className="text-black dark:text-white" fontSize="10.5" fontWeight="bold">
                        {gn.name.length > 14 ? gn.name.slice(0, 14) + '..' : gn.name}
                      </text>
                      {gn.isBreached && (
                        <circle cx="98" cy="14" r="3.5" fill="#FF453A" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Graph Node Inspector */}
            <div className="p-3.5 rounded-[12px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-black dark:text-white">
                  Selected Node: {graphNodes.find((n) => n.id === selectedGraphNode)?.name}
                </span>
                {graphNodes.find((n) => n.id === selectedGraphNode)?.isBreached && (
                  <span className="text-[10px] text-[#C0392B] dark:text-[#FF453A] font-bold uppercase font-mono">
                    Breach Detected
                  </span>
                )}
              </div>
              <p className="text-[#6E6E73] dark:text-[#8E8E93] text-[11px] leading-relaxed">
                {selectedGraphNode === 'payments' && !refactorApplied
                  ? "Direct call to external Stripe API inside transaction boundary violates INV-017."
                  : "All ingress and egress edges adhere to Hexagonal layer isolation invariants."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
