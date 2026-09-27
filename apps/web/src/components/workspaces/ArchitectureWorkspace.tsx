import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { StatusLabel } from '../primitives/StatusLabel';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { InvariantCheckResult } from '../../types/contracts';
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
  const [terminalLog, setTerminalLog] = useState<string[]>([
    "[tars-hook] Running Tree-sitter AST diff check against .tars/invariants.yaml...",
    "[tars-hook] Checking 4 staged files (285 additions, 42 deletions)...",
    "[tars-hook] BREACH DETECTED: INV-017 (External HTTP calls inside database transactions)",
    "[tars-hook] Violating AST node: CallExpression 'stripe_client.charges.create' at src/payments/service.py:84",
    "[tars-hook] ERROR: Commit blocked in 38.4ms. Outbox pattern required."
  ]);

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

  if (!selectedRule) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace 6"
        title="Tech & Architecture Workspace"
        description="Deterministic architectural enforcement powered by Tree-sitter AST queries (<50ms) and embedded Kùzu call-graph analysis."
        actions={
          <div className="flex items-center gap-2">
            {executionTime && (
              <span className="text-xs font-mono text-tars-text-secondary bg-tars-surface px-3 py-1.5 rounded-xl border border-tars-separator">
                AST Scan: <span className="text-tars-text-primary font-bold">{executionTime} ms</span>
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

      {/* Top Banner: 4 Killer Invariants Quick Status */}
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
              className={`apple-card p-4 cursor-pointer transition-all ${
                isSelected
                  ? 'border-tars-border-strong bg-tars-surface shadow-apple ring-1 ring-tars-accent/40'
                  : 'bg-tars-surface/50 hover:bg-tars-surface'
              }`}
            >
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-mono font-bold text-tars-text-primary">
                  {inv.rule_id}
                </span>
                <StatusLabel
                  size="sm"
                  status={inv.is_breached ? 'critical' : 'success'}
                  label={inv.is_breached ? 'BREACHED' : 'PASSING'}
                />
              </div>
              <p className="text-xs font-semibold text-tars-text-primary line-clamp-2 leading-snug">
                {inv.rule_name}
              </p>
              <div className="mt-2.5 text-[11px] font-mono text-tars-text-tertiary truncate">
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
          <div className="apple-card p-6 space-y-5">
            {/* View Switcher: Code Diff vs Living MADR vs Git Pre-Commit Simulator */}
            <div className="flex items-center justify-between border-b border-tars-separator/60 pb-3">
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
                      <span className="font-mono text-xs font-bold text-tars-accent">
                        {selectedRule.rule_id}
                      </span>
                      <StatusLabel
                        size="sm"
                        status={selectedRule.is_breached ? 'critical' : 'success'}
                        label={selectedRule.is_breached ? 'COMMIT BLOCKED' : 'PASSING'}
                      />
                    </div>
                    <h3 className="text-base font-semibold text-tars-text-primary mt-1">
                      {selectedRule.rule_name}
                    </h3>
                  </div>
                  <span className="text-[11px] font-mono text-tars-text-tertiary bg-tars-surface-tertiary px-2 py-0.5 rounded">
                    pre-commit hook
                  </span>
                </div>

                {/* Syntax Highlighted Code Diff Container */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-tars-text-secondary">
                    <span className="font-mono font-medium">{selectedRule.violating_file}:{selectedRule.line_number}</span>
                    <span className="text-[11px] text-tars-text-tertiary font-mono">Tree-sitter AST C-bindings</span>
                  </div>

                  <div className="rounded-xl border border-tars-separator bg-[#1A1A1C] text-neutral-200 p-4 font-mono text-xs overflow-x-auto leading-relaxed select-text shadow-inner">
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
                                  ? 'bg-red-950/80 text-red-200 border-l-2 border-red-500 font-semibold'
                                  : line.includes('REFACTORED')
                                  ? 'bg-emerald-950/70 text-emerald-300 border-l-2 border-emerald-500'
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
                  <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                    Architectural Rationale
                  </div>
                  <p className="text-xs sm:text-sm text-tars-text-primary leading-relaxed font-sans">
                    {selectedRule.rationale}
                  </p>

                  <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface-secondary/50 space-y-1.5 border-l-4 border-l-tars-accent">
                    <div className="text-xs font-semibold text-tars-text-primary uppercase tracking-wider">
                      Deterministic Suggested Refactor
                    </div>
                    <p className="text-xs sm:text-sm text-tars-text-primary leading-relaxed font-medium">
                      {selectedRule.suggested_refactor}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: LIVING MADR VIEWER */}
            {activeTab === 'madr' && (
              <div className="space-y-4 text-xs font-sans select-text">
                <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface-secondary/40 space-y-2">
                  <div className="text-xs font-mono font-bold text-tars-accent">
                    docs/adr/{selectedRule.adr_ref}
                  </div>
                  <h4 className="text-sm font-semibold text-tars-text-primary">
                    MADR: {selectedRule.rule_name}
                  </h4>
                  <div className="text-tars-text-tertiary font-mono">
                    Status: Living • Generated by Local Qwen 8B • Hash: sha256:7f81a9
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface space-y-3 leading-relaxed">
                  <h5 className="font-semibold text-tars-text-primary uppercase tracking-wider text-[11px]">
                    1. Context & Problem Statement
                  </h5>
                  <p className="text-tars-text-secondary">
                    Wrapping third-party network I/O within a database transaction holds row-level locks indefinitely during network latency spikes, resulting in DB pool exhaustion.
                  </p>

                  <h5 className="font-semibold text-tars-text-primary uppercase tracking-wider text-[11px] pt-2">
                    2. Decision Outcome
                  </h5>
                  <p className="text-tars-text-secondary">
                    Chosen pattern: **Transactional Outbox Pattern**. All database state changes are committed first; an independent dispatcher reads outbox events and executes external network calls asynchronously.
                  </p>
                </div>
              </div>
            )}

            {/* TAB 3: PRE-COMMIT GIT DIFF TESTER */}
            {activeTab === 'tester' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-tars-text-primary">
                    Simulate Staged Diff Inspection:
                  </span>
                  <div className="flex gap-1.5 text-xs">
                    {(['INV-017', 'INV-021', 'INV-014', 'INV-008'] as const).map((rule) => (
                      <button
                        key={rule}
                        onClick={() => setTestScenario(rule)}
                        className={`px-2 py-1 rounded text-xs font-mono transition-colors ${
                          testScenario === rule
                            ? 'bg-tars-surface-tertiary text-tars-text-primary font-bold border border-tars-separator'
                            : 'text-tars-text-secondary hover:text-tars-text-primary'
                        }`}
                      >
                        {rule}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-black text-emerald-400 font-mono text-xs p-4 space-y-1.5 select-text overflow-x-auto">
                  <div className="text-neutral-500 font-bold">$ git commit -m "feat(payments): execute stripe charge"</div>
                  {terminalLog.map((log, i) => (
                    <div
                      key={i}
                      className={
                        log.includes('BREACH') || log.includes('ERROR')
                          ? 'text-red-400 font-bold'
                          : log.includes('Violating')
                          ? 'text-yellow-300'
                          : 'text-emerald-400'
                      }
                    >
                      {log}
                    </div>
                  ))}
                  <div className="text-neutral-400 pt-1">
                    Executed in 38.4ms on local Apple/x86 silicon • 0.00 KB egress.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: System Topology & Call Graph (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="apple-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-tars-separator/60 pb-3">
              <div>
                <h4 className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-4 h-4 text-tars-accent" />
                  <span>Kùzu System Call Topology</span>
                </h4>
                <p className="text-[11px] text-tars-text-tertiary">
                  Embedded Graph Cypher verification
                </p>
              </div>
            </div>

            {/* 2D Call Graph Canvas */}
            <div className="rounded-xl border border-tars-separator bg-tars-surface-secondary/30 h-72 flex items-center justify-center p-2 relative overflow-hidden">
              <svg className="w-full h-full" viewBox="0 0 500 240">
                {/* Edges */}
                <line x1="140" y1="100" x2="200" y2="60" stroke="var(--separator)" strokeWidth="1.5" />
                <line
                  x1="140"
                  y1="100"
                  x2="200"
                  y2="160"
                  stroke={!refactorApplied ? 'var(--critical-text)' : 'var(--separator)'}
                  strokeWidth="2"
                  strokeDasharray={!refactorApplied ? '3 3' : 'none'}
                />
                <line x1="300" y1="60" x2="380" y2="100" stroke="var(--separator)" strokeWidth="1.5" />
                <line
                  x1="300"
                  y1="160"
                  x2="380"
                  y2="100"
                  stroke={!refactorApplied ? 'var(--critical-text)' : 'var(--separator)'}
                  strokeWidth="1.5"
                />
                <line x1="300" y1="160" x2="380" y2="180" stroke="var(--separator)" strokeWidth="1.5" />

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
                        fill="var(--surface)"
                        stroke={
                          gn.isBreached
                            ? 'var(--critical-text)'
                            : isSelected
                            ? 'var(--accent)'
                            : 'var(--separator)'
                        }
                        strokeWidth={gn.isBreached || isSelected ? '2' : '1'}
                        className="transition-all"
                      />
                      <text x="8" y="16" fill="var(--text-tertiary)" fontSize="8.5" fontWeight="bold">
                        {gn.layer}
                      </text>
                      <text x="8" y="32" fill="var(--text-primary)" fontSize="10.5" fontWeight="bold">
                        {gn.name.length > 14 ? gn.name.slice(0, 14) + '..' : gn.name}
                      </text>
                      {gn.isBreached && (
                        <circle cx="98" cy="14" r="3.5" fill="var(--critical-text)" />
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Graph Node Inspector */}
            <div className="p-3.5 rounded-xl border border-tars-separator bg-tars-surface-secondary/40 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-tars-text-primary">
                  Selected Node: {graphNodes.find((n) => n.id === selectedGraphNode)?.name}
                </span>
                {graphNodes.find((n) => n.id === selectedGraphNode)?.isBreached && (
                  <span className="text-[10px] text-tars-critical-text font-bold uppercase font-mono">
                    Breach Detected
                  </span>
                )}
              </div>
              <p className="text-tars-text-secondary text-[11px] leading-relaxed">
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
