import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { Drawer } from '../primitives/Drawer';
import { Dialog } from '../primitives/Dialog';
import { InlineNotice } from '../primitives/InlineNotice';
import { StatusLabel } from '../primitives/StatusLabel';
import { EmptyState } from '../primitives/EmptyState';
import { DecisionItem, ContradictionCheckResponse, SimulationResponse } from '../../types/contracts';
import { api } from '../../services/client';
import {
  Scale,
  AlertTriangle,
  Play,
  Plus,
  Clock,
  CheckCircle2,
  FileText,
  TrendingDown,
  Layers,
  Sparkles,
  GitCommit,
} from 'lucide-react';

interface DecisionsWorkspaceProps {
  activeDecisionId: string | null;
  onSelectDecision: (id: string) => void;
}

export const DecisionsWorkspace: React.FC<DecisionsWorkspaceProps> = ({
  activeDecisionId,
  onSelectDecision,
}) => {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(null);
  const [sensitivity, setSensitivity] = useState<'STRICT' | 'BALANCED' | 'RELAXED'>('BALANCED');

  // Contradiction Check State
  const [testProposal, setTestProposal] = useState('');
  const [contradictionResult, setContradictionResult] = useState<ContradictionCheckResponse | null>(null);
  const [checkingContradiction, setCheckingContradiction] = useState(false);

  // Simulation Drawer State
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simProposal, setSimProposal] = useState('');
  const [delayDays, setDelayDays] = useState(14);
  const [reallocatedDevs, setReallocatedDevs] = useState(1);
  const [simResult, setSimResult] = useState<SimulationResponse | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Record Decision Dialog State
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'STRATEGY' | 'ENGINEERING' | 'SECURITY' | 'PRODUCT'>('STRATEGY');
  const [newContext, setNewContext] = useState('');
  const [newChoice, setNewChoice] = useState('');

  useEffect(() => {
    api.getDecisions().then((data) => {
      setDecisions(data);
      if (data.length > 0) {
        const found = data.find((d) => d.id === activeDecisionId) || data[0];
        setSelectedDecision(found);
      }
    });
  }, [activeDecisionId]);

  const runContradictionCheck = async () => {
    setCheckingContradiction(true);
    try {
      const res = await api.checkContradiction(testProposal, sensitivity);
      setContradictionResult(res);
    } finally {
      setCheckingContradiction(false);
    }
  };

  useEffect(() => {
    runContradictionCheck();
  }, [sensitivity]);

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await api.simulateImpact({
        proposal: simProposal,
        delay_days: delayDays,
        reallocated_devs: reallocatedDevs,
      });
      setSimResult(res);
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveDecision = async () => {
    if (!newTitle.trim() || !newChoice.trim()) return;
    const created = await api.recordDecision({
      title: newTitle,
      category: newCategory,
      context: newContext,
      chosen_option: newChoice,
      clearance: 'ALL_TEAM',
    });
    setDecisions((prev) => [created, ...prev]);
    setSelectedDecision(created);
    setRecordDialogOpen(false);
    setNewTitle('');
    setNewContext('');
    setNewChoice('');
  };

  const categoryColors: Record<string, string> = {
    STRATEGY: 'bg-[#0071E3]/[0.10] text-[#0071E3] dark:bg-[#0A84FF]/[0.12] dark:text-[#0A84FF]',
    ENGINEERING: 'bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white',
    SECURITY: 'bg-[#FF3B30]/[0.08] text-[#C0392B] dark:bg-[#FF453A]/[0.10] dark:text-[#FF453A]',
    PRODUCT: 'bg-[#FF9500]/[0.10] text-[#B25000] dark:bg-[#FF9F0A]/[0.12] dark:text-[#FF9F0A]',
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        eyebrow="Workspace 5"
        title="Strategic Decision Registry"
        description="Immutable company architectural & business decision ledger with contradiction detection and counterfactual simulation."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => { setSimulationOpen(true); handleRunSimulation(); }}
            >
              What-If Simulation
            </Button>
            <Button
              variant="primary"
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setRecordDialogOpen(true)}
            >
              Record Decision
            </Button>
          </div>
        }
      />

      {/* Contradiction Detection Surface */}
      <div className="p-4 sm:p-5 rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-black dark:text-white block">Policy Contradiction Check</span>
              <span className="text-[11px] text-[#86868B] dark:text-[#8E8E93]">Verifies proposals against ratified ADR decisions</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#86868B] dark:text-[#8E8E93]">Sensitivity:</span>
            <SegmentedControl
              size="sm"
              options={[
                { value: 'STRICT', label: 'Strict' },
                { value: 'BALANCED', label: 'Balanced' },
                { value: 'RELAXED', label: 'Relaxed' },
              ]}
              value={sensitivity}
              onChange={(v) => setSensitivity(v as any)}
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <input
            type="text"
            value={testProposal}
            onChange={(e) => setTestProposal(e.target.value)}
            placeholder="Test a pending strategic proposal against company memory..."
            className="flex-1 px-4 py-2.5 text-[13px] rounded-full border border-black/[0.08] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white transition-all"
          />
          <Button variant="secondary" size="sm" loading={checkingContradiction} onClick={runContradictionCheck}>
            Check Contradiction
          </Button>
        </div>

        {contradictionResult?.has_conflict && (
          <InlineNotice
            type="warning"
            title="Strategic Contradiction Detected"
            action={
              contradictionResult.conflicting_decision_id && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    const found = decisions.find((d) => d.id === contradictionResult.conflicting_decision_id);
                    if (found) setSelectedDecision(found);
                  }}
                >
                  View Decision #{contradictionResult.conflicting_decision_id}
                </Button>
              )
            }
          >
            {contradictionResult.explanation}
          </InlineNotice>
        )}
      </div>

      {/* Main Ledger Split or Empty State */}
      {decisions.length === 0 || !selectedDecision ? (
        <EmptyState
          icon={<Scale className="w-5 h-5 text-[#8E8E93]" />}
          title="No strategic decisions recorded yet"
          description="Record architectural, product, or strategy decisions to establish immutable institutional memory and trigger automatic conflict detection."
          actionLabel="Record First Decision"
          onAction={() => setRecordDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left: Decision Ledger List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider px-1">
            <span>Decision Ledger ({decisions.length})</span>
            <span className="font-mono text-[11px]">Git-as-State</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {decisions.map((dec) => {
              const isSelected = selectedDecision.id === dec.id;
              return (
                <div
                  key={dec.id}
                  onClick={() => { setSelectedDecision(dec); onSelectDecision(dec.id); }}
                  className={`group p-4 rounded-[16px] border cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? 'border-[#0071E3]/30 dark:border-[#0A84FF]/30 bg-white dark:bg-[#1C1C1E] shadow-sm ring-1 ring-[#0071E3]/10 dark:ring-[#0A84FF]/10'
                      : 'border-black/[0.07] dark:border-white/[0.07] bg-white/70 dark:bg-[#1C1C1E]/60 hover:bg-white dark:hover:bg-[#1C1C1E] hover:border-black/[0.14] dark:hover:border-white/[0.14] hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className={`font-mono text-[11px] font-bold ${isSelected ? 'text-[#0071E3] dark:text-[#0A84FF]' : 'text-black dark:text-white'}`}>
                      {dec.id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {dec.category && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${categoryColors[dec.category] || categoryColors.STRATEGY}`}>
                          {dec.category}
                        </span>
                      )}
                      <StatusLabel
                        size="sm"
                        status={dec.lifecycle_status === 'SUPERSEDED' ? 'superseded' : 'success'}
                        label={dec.lifecycle_status || 'ACTIVE'}
                      />
                    </div>
                  </div>
                  <h4 className="text-[13px] font-semibold text-black dark:text-white leading-snug">{dec.title}</h4>
                  <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] line-clamp-2 mt-1 leading-snug">{dec.chosen_option}</p>
                  {isSelected && (
                    <div className="mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center gap-1 text-[11px] text-[#0071E3] dark:text-[#0A84FF] font-medium">
                      <span>Viewing details</span>
                      <CheckCircle2 className="w-3 h-3" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Decision Detail */}
        <div className="lg:col-span-7">
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] shadow-sm overflow-hidden">
            {/* Accent top bar */}
            <div className="h-0.5 bg-gradient-to-r from-[#0071E3] via-[#0A84FF] to-transparent" />

            <div className="p-5 sm:p-6 space-y-5">
              {/* Header */}
              <div className="pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                <div className="flex items-center justify-between flex-wrap gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[12px] font-bold text-[#8E8E93]">{selectedDecision.id}</span>
                    {selectedDecision.category && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${categoryColors[selectedDecision.category] || categoryColors.STRATEGY}`}>
                        {selectedDecision.category}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-[#8E8E93] font-mono">
                    {(() => {
                      const t = Number(selectedDecision.timestamp);
                      const ms = isNaN(t) ? Date.now() : t < 10000000000 ? t * 1000 : t;
                      return new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    })()}
                  </span>
                </div>
                <h3 className="text-lg sm:text-xl font-bold tracking-tight text-black dark:text-white leading-snug">
                  {selectedDecision.title}
                </h3>
              </div>

              {/* Context & Drivers */}
              <div className="space-y-2">
                <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Context & Drivers</div>
                <p className="text-[13px] text-[#1D1D1F] dark:text-[#EBEBF5] leading-relaxed">{selectedDecision.context}</p>
                {selectedDecision.drivers && (
                  <ul className="space-y-1 pt-1 pl-4 list-disc">
                    {selectedDecision.drivers.map((d, idx) => (
                      <li key={idx} className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">{d}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Chosen Direction — accent card */}
              <div className="p-4 rounded-[14px] bg-[#0071E3]/[0.05] dark:bg-[#0A84FF]/[0.06] border border-[#0071E3]/[0.15] dark:border-[#0A84FF]/[0.15] border-l-4 border-l-[#0071E3] dark:border-l-[#0A84FF] space-y-1.5">
                <div className="text-[11px] font-bold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider">Chosen Policy / Decision</div>
                <p className="text-[13px] text-black dark:text-white leading-relaxed font-medium">{selectedDecision.chosen_option}</p>
              </div>

              {/* Options Considered */}
              {selectedDecision.options_considered && (
                <div className="space-y-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06]">
                  <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">Options Evaluated</div>
                  <ul className="space-y-1 pl-4 list-disc">
                    {selectedDecision.options_considered.map((opt, i) => (
                      <li key={i} className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">{opt}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Footer */}
              <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#8E8E93]">
                <div className="flex items-center gap-1.5">
                  <GitCommit className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                  <span className="font-mono">docs/adr/ADR-{selectedDecision.id}.md</span>
                </div>
                <span className="font-mono">Clearance: {selectedDecision.clearance}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* What-If Simulation Drawer */}
      <Drawer
        isOpen={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        title="Counterfactual What-If Simulation"
        subtitle="Cross-references payroll burn, client commitments, and code call graphs locally"
        width="max-w-md sm:max-w-xl"
      >
        <div className="space-y-5">
          <div className="p-4 rounded-[16px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-3">
            <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">Scenario Parameters</div>
            <div>
              <label className="text-[12px] font-semibold text-black dark:text-white block mb-1">Proposal Hypothesis</label>
              <input
                type="text"
                value={simProposal}
                onChange={(e) => setSimProposal(e.target.value)}
                placeholder="e.g. Reallocate 2 engineers to custom SAML SSO for client..."
                className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[12px] font-semibold text-black dark:text-white block mb-1">Delay: {delayDays}d</label>
                <input type="range" min={7} max={60} value={delayDays} onChange={(e) => setDelayDays(Number(e.target.value))} className="w-full accent-[#0071E3]" />
              </div>
              <div>
                <label className="text-[12px] font-semibold text-black dark:text-white block mb-1">Devs: {reallocatedDevs} of 4</label>
                <input type="range" min={1} max={4} value={reallocatedDevs} onChange={(e) => setReallocatedDevs(Number(e.target.value))} className="w-full accent-[#0071E3]" />
              </div>
            </div>

            <Button variant="primary" size="sm" loading={simulating} onClick={handleRunSimulation} className="w-full mt-1">
              Re-Calculate Forecast
            </Button>
          </div>

          {simResult && (
            <div className="space-y-4 animate-slide-up">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E]">
                  <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">Cash Runway Impact</div>
                  <div className="text-xl font-bold text-[#C0392B] dark:text-[#FF453A] font-mono mt-1">{simResult.runway_impact_months} months</div>
                  <div className="text-[11px] text-[#8E8E93] mt-0.5">11.4 mo → 9.6 mo</div>
                </div>
                <div className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E]">
                  <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">Product Delay</div>
                  <div className="text-xl font-bold text-[#B25000] dark:text-[#FF9F0A] font-mono mt-1">+{simResult.delivery_delay_weeks}w</div>
                  <div className="text-[11px] text-[#8E8E93] mt-0.5">Launch postponed</div>
                </div>
              </div>

              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-2">
                <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">Compromised Deliverables</div>
                <ul className="space-y-1 pl-4 list-disc">
                  {simResult.affected_client_promises.map((p, idx) => (
                    <li key={idx} className="text-[12px] text-black dark:text-white">{p}</li>
                  ))}
                </ul>
              </div>

              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 border-l-4 border-l-black dark:border-l-white space-y-2">
                <div className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider">Executive Counterfactual</div>
                <p className="text-[13px] text-[#1D1D1F] dark:text-[#EBEBF5] leading-relaxed">{simResult.executive_synthesis}</p>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* Record Decision Dialog */}
      <Dialog
        isOpen={recordDialogOpen}
        onClose={() => setRecordDialogOpen(false)}
        title="Record Durable Company Decision"
        description="Recorded decisions are versioned in Git (.tars) and protected by contradiction checks."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRecordDialogOpen(false)}>Cancel</Button>
            <Button variant="primary" size="sm" onClick={handleSaveDecision}>Ratify Decision</Button>
          </>
        }
      >
        <div className="space-y-3.5 py-1">
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">Title</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Hexagonal Domain Isolation for Auth"
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">Category</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 appearance-none transition-all"
            >
              <option value="STRATEGY">Strategy</option>
              <option value="ENGINEERING">Engineering</option>
              <option value="SECURITY">Security</option>
              <option value="PRODUCT">Product</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">Context & Drivers</label>
            <textarea
              rows={3}
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              placeholder="What trade-offs or constraints drove this decision?"
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 resize-none transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">Chosen Direction</label>
            <textarea
              rows={2}
              value={newChoice}
              onChange={(e) => setNewChoice(e.target.value)}
              placeholder="The precise binding policy adopted..."
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 resize-none transition-all"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
