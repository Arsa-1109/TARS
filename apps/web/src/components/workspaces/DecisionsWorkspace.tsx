import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { Drawer } from '../primitives/Drawer';
import { Dialog } from '../primitives/Dialog';
import { InlineNotice } from '../primitives/InlineNotice';
import { StatusLabel } from '../primitives/StatusLabel';
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
  const [testProposal, setTestProposal] = useState('Add custom on-premise SAML SSO for Acme Corp');
  const [contradictionResult, setContradictionResult] = useState<ContradictionCheckResponse | null>(null);
  const [checkingContradiction, setCheckingContradiction] = useState(false);

  // Simulation Drawer State
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simProposal, setSimProposal] = useState('Reallocate 2 engineers to custom SAML SSO for Acme Corp');
  const [delayDays, setDelayDays] = useState(24);
  const [reallocatedDevs, setReallocatedDevs] = useState(2);
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

  if (!selectedDecision) return null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace 5"
        title="Strategic Decision Registry"
        description="Immutable company architectural & business decision ledger with contradiction detection and counterfactual what-if simulation."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={<Play className="w-3.5 h-3.5" />}
              onClick={() => {
                setSimulationOpen(true);
                handleRunSimulation();
              }}
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
      <Surface className="p-4 sm:p-5 shadow-subtle space-y-3 border-tars-warning-text/30 bg-tars-warning-bg/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-tars-warning-text shrink-0" />
            <span className="text-xs font-semibold text-tars-text-primary uppercase tracking-wider">
              Contradiction Radar & Sensitivity Governor
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-tars-text-secondary">Sensitivity:</span>
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

        {/* Input Proposal & Evaluation */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
          <input
            type="text"
            value={testProposal}
            onChange={(e) => setTestProposal(e.target.value)}
            placeholder="Test a pending strategic proposal against company memory..."
            className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-control border border-tars-separator bg-tars-surface text-tars-text-primary focus:outline-none focus:ring-1 focus:ring-tars-accent"
          />
          <Button
            variant="secondary"
            size="sm"
            loading={checkingContradiction}
            onClick={runContradictionCheck}
          >
            Check Contradiction
          </Button>
        </div>

        {/* Contradiction Result Banner */}
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
                    const found = decisions.find(
                      (d) => d.id === contradictionResult.conflicting_decision_id
                    );
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
      </Surface>

      {/* Main Ledger Split: Left List (4 cols) & Right Detail (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Decision Ledger List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-tars-text-secondary uppercase tracking-wider px-1">
            <span>Decision Ledger ({decisions.length})</span>
            <span className="font-mono text-[11px] text-tars-text-tertiary">Git-as-State-Store</span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {decisions.map((dec) => {
              const isSelected = selectedDecision.id === dec.id;
              return (
                <div
                  key={dec.id}
                  onClick={() => {
                    setSelectedDecision(dec);
                    onSelectDecision(dec.id);
                  }}
                  className={`p-3.5 rounded-control border cursor-pointer transition-all ${
                    isSelected
                      ? 'border-tars-border-strong bg-tars-surface font-semibold text-tars-text-primary shadow-subtle'
                      : 'border-tars-separator bg-tars-surface/50 hover:bg-tars-surface text-tars-text-secondary hover:text-tars-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-mono text-[11px] text-tars-accent">
                      {dec.id}
                    </span>
                    <StatusLabel
                      size="sm"
                      status={dec.lifecycle_status === 'SUPERSEDED' ? 'superseded' : 'success'}
                      label={dec.lifecycle_status || 'ACTIVE'}
                    />
                  </div>
                  <h4 className="text-xs sm:text-sm font-semibold text-tars-text-primary leading-snug">
                    {dec.title}
                  </h4>
                  <p className="text-xs text-tars-text-secondary line-clamp-2 mt-1">
                    {dec.chosen_option}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Selected Decision Detail Record */}
        <div className="lg:col-span-7 space-y-4">
          <Surface className="p-5 sm:p-6 space-y-5 shadow-subtle">
            {/* Header */}
            <div className="border-b border-tars-separator/60 pb-4">
              <div className="flex items-center justify-between text-xs font-mono text-tars-text-tertiary mb-1">
                <span>{selectedDecision.id} • {selectedDecision.category}</span>
                <span>{new Date(selectedDecision.timestamp).toLocaleDateString()}</span>
              </div>
              <h3 className="text-lg sm:text-xl font-semibold text-tars-text-primary">
                {selectedDecision.title}
              </h3>
            </div>

            {/* Context & Drivers */}
            <div className="space-y-2">
              <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                Context & Drivers
              </div>
              <p className="text-xs sm:text-sm text-tars-text-primary leading-relaxed font-sans">
                {selectedDecision.context}
              </p>
              {selectedDecision.drivers && (
                <ul className="space-y-1 text-xs text-tars-text-secondary pt-1 pl-4 list-disc">
                  {selectedDecision.drivers.map((d, idx) => (
                    <li key={idx}>{d}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Chosen Direction */}
            <div className="p-4 rounded-control border border-tars-separator bg-tars-surface-secondary/40 space-y-1.5 border-l-4 border-l-tars-accent">
              <div className="text-xs font-semibold text-tars-text-primary uppercase tracking-wider">
                Chosen Policy / Decision
              </div>
              <p className="text-xs sm:text-sm text-tars-text-primary leading-relaxed font-medium">
                {selectedDecision.chosen_option}
              </p>
            </div>

            {/* Options Considered */}
            {selectedDecision.options_considered && (
              <div className="space-y-2 pt-2 border-t border-tars-separator/60">
                <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                  Options Evaluated Prior to Ratification
                </div>
                <ul className="space-y-1 text-xs text-tars-text-secondary pl-4 list-disc">
                  {selectedDecision.options_considered.map((opt, i) => (
                    <li key={i}>{opt}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* ADR Traceability Link */}
            <div className="pt-3 border-t border-tars-separator/60 flex items-center justify-between text-xs text-tars-text-tertiary">
              <div className="flex items-center gap-1.5">
                <GitCommit className="w-3.5 h-3.5" />
                <span className="font-mono">docs/adr/ADR-{selectedDecision.id}.md</span>
              </div>
              <span>Clearance: {selectedDecision.clearance}</span>
            </div>
          </Surface>
        </div>
      </div>

      {/* What-If Simulation Drawer */}
      <Drawer
        isOpen={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        title="Counterfactual What-If Simulation"
        subtitle="Cross-references payroll burn, client commitments, and code call graphs locally"
        width="max-w-md sm:max-w-xl"
      >
        <div className="space-y-5">
          {/* Simulation Inputs */}
          <div className="p-4 rounded-control border border-tars-separator bg-tars-surface-secondary/50 space-y-3">
            <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
              Simulation Scenario Parameters
            </div>
            <div>
              <label className="text-xs font-medium text-tars-text-primary block mb-1">
                Proposal Hypothesis
              </label>
              <input
                type="text"
                value={simProposal}
                onChange={(e) => setSimProposal(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-control border border-tars-separator bg-tars-surface text-tars-text-primary"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-medium text-tars-text-primary block mb-1">
                  Delivery Delay: {delayDays} days
                </label>
                <input
                  type="range"
                  min={7}
                  max={60}
                  value={delayDays}
                  onChange={(e) => setDelayDays(Number(e.target.value))}
                  className="w-full accent-tars-text-primary"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-tars-text-primary block mb-1">
                  Reallocated Devs: {reallocatedDevs} of 4
                </label>
                <input
                  type="range"
                  min={1}
                  max={4}
                  value={reallocatedDevs}
                  onChange={(e) => setReallocatedDevs(Number(e.target.value))}
                  className="w-full accent-tars-text-primary"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              loading={simulating}
              onClick={handleRunSimulation}
              className="w-full mt-2"
            >
              Re-Calculate Forecast
            </Button>
          </div>

          {/* Simulation Results Display */}
          {simResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-control border border-tars-separator bg-tars-surface">
                  <div className="text-[11px] font-semibold text-tars-text-secondary uppercase tracking-wider">
                    Cash Runway Impact
                  </div>
                  <div className="text-xl font-bold text-tars-critical-text font-mono mt-1">
                    {simResult.runway_impact_months} months
                  </div>
                  <div className="text-[11px] text-tars-text-tertiary mt-0.5">
                    11.4 mo → 9.6 mo survival
                  </div>
                </div>

                <div className="p-3.5 rounded-control border border-tars-separator bg-tars-surface">
                  <div className="text-[11px] font-semibold text-tars-text-secondary uppercase tracking-wider">
                    Core Product Delay
                  </div>
                  <div className="text-xl font-bold text-tars-warning-text font-mono mt-1">
                    +{simResult.delivery_delay_weeks} weeks
                  </div>
                  <div className="text-[11px] text-tars-text-tertiary mt-0.5">
                    Multi-tenant launch postponed
                  </div>
                </div>
              </div>

              {/* Affected Client Promises */}
              <div className="p-4 rounded-control border border-tars-separator bg-tars-surface space-y-2">
                <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                  Compromised Client Deliverables
                </div>
                <ul className="space-y-1 text-xs text-tars-text-primary pl-4 list-disc">
                  {simResult.affected_client_promises.map((p, idx) => (
                    <li key={idx}>{p}</li>
                  ))}
                </ul>
              </div>

              {/* Affected Code Modules */}
              <div className="p-4 rounded-control border border-tars-separator bg-tars-surface space-y-2">
                <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                  Impacted Code Topology Modules
                </div>
                <ul className="space-y-1 text-xs font-mono text-tars-text-secondary pl-4 list-disc">
                  {simResult.affected_code_modules.map((m, idx) => (
                    <li key={idx}>{m}</li>
                  ))}
                </ul>
              </div>

              {/* Executive Synthesis */}
              <div className="p-4 rounded-control border border-tars-separator bg-tars-surface-secondary/70 space-y-2 border-l-4 border-l-tars-text-primary">
                <div className="text-xs font-semibold text-tars-text-primary uppercase tracking-wider">
                  Executive Counterfactual Synthesis
                </div>
                <p className="text-xs sm:text-sm text-tars-text-primary leading-relaxed font-sans">
                  {simResult.executive_synthesis}
                </p>
              </div>
            </div>
          )}
        </div>
      </Drawer>

      {/* Record Decision Modal Dialog */}
      <Dialog
        isOpen={recordDialogOpen}
        onClose={() => setRecordDialogOpen(false)}
        title="Record Durable Company Decision"
        description="Recorded decisions are versioned in Git (.tars) and protected by contradiction checks."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRecordDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDecision}>
              Ratify Decision
            </Button>
          </>
        }
      >
        <div className="space-y-3.5 py-1">
          <div>
            <label className="text-xs font-semibold text-tars-text-primary block mb-1">
              Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Hexagonal Domain Isolation for Auth"
              className="w-full px-3 py-2 text-xs rounded-control border border-tars-separator bg-tars-canvas text-tars-text-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-tars-text-primary block mb-1">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-control border border-tars-separator bg-tars-canvas text-tars-text-primary"
            >
              <option value="STRATEGY">Strategy</option>
              <option value="ENGINEERING">Engineering</option>
              <option value="SECURITY">Security</option>
              <option value="PRODUCT">Product</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-tars-text-primary block mb-1">
              Context & Drivers
            </label>
            <textarea
              rows={3}
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              placeholder="What trade-offs or constraints drove this decision?"
              className="w-full px-3 py-2 text-xs rounded-control border border-tars-separator bg-tars-canvas text-tars-text-primary"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-tars-text-primary block mb-1">
              Chosen Direction / Policy
            </label>
            <textarea
              rows={2}
              value={newChoice}
              onChange={(e) => setNewChoice(e.target.value)}
              placeholder="The precise binding policy adopted..."
              className="w-full px-3 py-2 text-xs rounded-control border border-tars-separator bg-tars-canvas text-tars-text-primary"
            />
          </div>
        </div>
      </Dialog>
    </div>
  );
};
