import React, { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { Drawer } from '../primitives/Drawer';
import { Dialog } from '../primitives/Dialog';
import { InlineNotice } from '../primitives/InlineNotice';
import { StatusLabel } from '../primitives/StatusLabel';
import { EmptyState } from '../primitives/EmptyState';
import {
  DecisionItem,
  ContradictionCheckResponse,
  SimulationScenarioResponse,
} from '../../types/contracts';
import { decisionsApi } from '../../services/decisionsApi';
import {
  Scale,
  Play,
  Plus,
  CheckCircle2,
  TrendingDown,
  GitCommit,
  Trash2,
  Archive,
  Edit3,
  SlidersHorizontal,
  DollarSign,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

interface DecisionsWorkspaceProps {
  activeDecisionId: string | null;
  onSelectDecision: (id: string) => void;
}

type FilterTab = 'ALL' | 'ACTIVE' | 'SUPERSEDED' | 'STRATEGY' | 'ENGINEERING';
type DensityMode = 'comfortable' | 'compact';

export const DecisionsWorkspace: React.FC<DecisionsWorkspaceProps> = ({
  activeDecisionId,
  onSelectDecision,
}) => {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(null);
  const [sensitivity, setSensitivity] = useState<'STRICT' | 'BALANCED' | 'RELAXED'>('BALANCED');
  const [filterTab, setFilterTab] = useState<FilterTab>('ALL');
  const [density, setDensity] = useState<DensityMode>('comfortable');

  // Contradiction Check State
  const [testProposal, setTestProposal] = useState('');
  const [contradictionResult, setContradictionResult] = useState<ContradictionCheckResponse | null>(null);
  const [checkingContradiction, setCheckingContradiction] = useState(false);

  // What-If Simulation Drawer State
  const [simulationOpen, setSimulationOpen] = useState(false);
  const [simScenarioPrompt, setSimScenarioPrompt] = useState('What if Acme Corp delays SAML SSO delivery by 30 days?');
  const [simBurnDelta, setSimBurnDelta] = useState(15000);
  const [simTimelineShift, setSimTimelineShift] = useState(30);
  const [simDevsReallocated, setSimDevsReallocated] = useState(2);
  const [simResult, setSimResult] = useState<SimulationScenarioResponse | null>(null);
  const [simulating, setSimulating] = useState(false);

  // Record Decision Dialog State
  const [recordDialogOpen, setRecordDialogOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'STRATEGY' | 'ENGINEERING' | 'SECURITY' | 'PRODUCT'>('STRATEGY');
  const [newContext, setNewContext] = useState('');
  const [newChoice, setNewChoice] = useState('');

  // Edit Decision Dialog State
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContext, setEditContext] = useState('');
  const [editChoice, setEditChoice] = useState('');
  const [editStatus, setEditStatus] = useState<string>('ACTIVE');

  // Supersede & Purge Dialog States
  const [supersedeDialogOpen, setSupersedeDialogOpen] = useState(false);
  const [supersededByVal, setSupersededByVal] = useState('');
  const [purgeDialogOpen, setPurgeDialogOpen] = useState(false);

  const fetchDecisions = async () => {
    const data = await decisionsApi.getDecisions();
    setDecisions(data);
    if (data.length > 0) {
      const found = data.find((d) => d.id === activeDecisionId) || data[0];
      setSelectedDecision(found);
    } else {
      setSelectedDecision(null);
    }
  };

  useEffect(() => {
    fetchDecisions();
  }, [activeDecisionId]);

  const runContradictionCheck = async () => {
    if (!testProposal.trim()) return;
    setCheckingContradiction(true);
    try {
      const res = await decisionsApi.checkContradiction(testProposal, sensitivity);
      setContradictionResult(res);
    } finally {
      setCheckingContradiction(false);
    }
  };

  useEffect(() => {
    if (testProposal.trim()) {
      runContradictionCheck();
    }
  }, [sensitivity]);

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const res = await decisionsApi.simulateScenario({
        scenario_prompt: simScenarioPrompt,
        burn_delta_monthly: simBurnDelta,
        timeline_shift_days: simTimelineShift,
        devs_reallocated: simDevsReallocated,
      });
      setSimResult(res);
    } finally {
      setSimulating(false);
    }
  };

  const handleSaveDecision = async () => {
    if (!newTitle.trim() || !newChoice.trim()) return;
    const created = await decisionsApi.createDecision({
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

  const handleOpenEdit = (dec: DecisionItem) => {
    setEditTitle(dec.title);
    setEditContext(dec.context || '');
    setEditChoice(dec.chosen_option || '');
    setEditStatus(dec.lifecycle_status || 'ACTIVE');
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedDecision) return;
    const patched = await decisionsApi.patchDecision(selectedDecision.id, {
      title: editTitle,
      context: editContext,
      chosen_option: editChoice,
      lifecycle_status: editStatus,
    });
    setDecisions((prev) => prev.map((d) => (d.id === patched.id ? patched : d)));
    setSelectedDecision(patched);
    setEditDialogOpen(false);
  };

  const handleSoftSupersede = async () => {
    if (!selectedDecision) return;
    await decisionsApi.deleteDecision(selectedDecision.id, false, supersededByVal || undefined);
    setSupersedeDialogOpen(false);
    setSupersededByVal('');
    await fetchDecisions();
  };

  const handleHardPurge = async () => {
    if (!selectedDecision) return;
    await decisionsApi.deleteDecision(selectedDecision.id, true);
    setPurgeDialogOpen(false);
    await fetchDecisions();
  };

  const handleRatifyFromSimulation = () => {
    if (!simResult?.pre_populated_adr) return;
    const adr = simResult.pre_populated_adr;
    setNewTitle(adr.title);
    setNewCategory((adr.category as any) || 'STRATEGY');
    setNewContext(adr.context);
    setNewChoice(adr.chosen_option);
    setSimulationOpen(false);
    setRecordDialogOpen(true);
  };

  const categoryColors: Record<string, string> = {
    STRATEGY: 'bg-black/8 dark:bg-white/12 text-black dark:text-white font-semibold',
    ENGINEERING: 'bg-black/5 dark:bg-white/8 text-neutral-700 dark:text-neutral-300 font-medium',
    SECURITY: 'bg-red-500/10 text-red-600 dark:text-red-400 font-medium',
    PRODUCT: 'bg-neutral-200 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 font-medium',
  };

  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      const status = (d.lifecycle_status || 'ACTIVE').toUpperCase();
      if (filterTab === 'ACTIVE') return status === 'ACTIVE';
      if (filterTab === 'SUPERSEDED') return status === 'SUPERSEDED';
      if (filterTab === 'STRATEGY') return d.category === 'STRATEGY';
      if (filterTab === 'ENGINEERING') return d.category === 'ENGINEERING';
      return true;
    });
  }, [decisions, filterTab]);

  return (
    <div className="space-y-4 animate-fade-in pb-4">
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
              onClick={() => setSimulationOpen(true)}
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
      <div className="p-3.5 sm:p-4 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[6px] bg-neutral-100 dark:bg-white/10 text-black dark:text-white flex items-center justify-center shrink-0">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-semibold text-black dark:text-white block">
                Policy Contradiction Check
              </span>
              <span className="text-[11px] text-neutral-500 dark:text-neutral-400">
                Verifies proposals against ratified ADR decisions
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-neutral-500 dark:text-neutral-400">Sensitivity:</span>
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

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-0.5">
          <input
            type="text"
            value={testProposal}
            onChange={(e) => setTestProposal(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runContradictionCheck();
              }
            }}
            placeholder="Test a pending strategic proposal (e.g. 'Build bespoke SAML auth for Acme Corp')..."
            className="flex-1 px-3.5 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
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

        {/* Quick Test Pill Suggestions */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <span className="text-[10px] uppercase font-mono tracking-wider">Quick test:</span>
          {[
            'Build custom bespoke SAML auth for enterprise lead',
            'Spin up AWS S3 bucket for storing customer attachments',
            'Branch code into separate enterprise repo with custom fork',
          ].map((sample, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setTestProposal(sample);
                decisionsApi.checkContradiction(sample, sensitivity).then((res) => setContradictionResult(res));
              }}
              className="text-[11px] px-2 py-0.5 rounded-[5px] bg-black/4 dark:bg-white/6 text-neutral-600 dark:text-neutral-300 hover:text-black dark:hover:text-white hover:bg-black/8 dark:hover:bg-white/10 transition-colors truncate max-w-[280px]"
            >
              "{sample}"
            </button>
          ))}
        </div>

        {contradictionResult?.has_conflict && (
          <InlineNotice
            type="warning"
            title="Strategic Contradiction Detected"
            action={
              contradictionResult.conflicting_decision_id ? (
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
              ) : undefined
            }
          >
            {contradictionResult.explanation}
          </InlineNotice>
        )}
      </div>

      {/* Main Ledger Split or Empty State with Windowed Viewport */}
      {decisions.length === 0 ? (
        <EmptyState
          icon={<Scale className="w-5 h-5 text-[#8E8E93]" />}
          title="No strategic decisions recorded yet"
          description="Record architectural, product, or strategy decisions to establish immutable institutional memory and trigger automatic conflict detection."
          actionLabel="Record First Decision"
          onAction={() => setRecordDialogOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start h-[calc(100vh-210px)] min-h-[560px]">
          {/* Left Column: Decision Ledger List */}
          <div className="lg:col-span-5 flex flex-col h-full space-y-2.5">
            {/* Header controls: Filter tabs + Density toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-0.5">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'ACTIVE', 'SUPERSEDED', 'STRATEGY', 'ENGINEERING'] as FilterTab[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`text-[11px] px-2 py-0.5 rounded-[5px] font-medium transition-all ${
                        filterTab === tab
                          ? 'bg-black text-white dark:bg-white dark:text-black font-semibold'
                          : 'bg-black/4 text-neutral-600 dark:bg-white/6 dark:text-neutral-400 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <SlidersHorizontal className="w-3 h-3 text-neutral-400" />
                <button
                  onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
                  className="text-[11px] font-mono text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                </button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-1.5">
              {filteredDecisions.length === 0 ? (
                <div className="p-8 text-center text-xs text-neutral-400 rounded-[8px] border border-dashed border-black/10 dark:border-white/10">
                  No decisions found for current filter.
                </div>
              ) : (
                filteredDecisions.map((dec) => {
                  const isSelected = selectedDecision?.id === dec.id;
                  const isCompact = density === 'compact';
                  const isSuperseded = (dec.lifecycle_status || '').toUpperCase() === 'SUPERSEDED';

                  return (
                    <div
                      key={dec.id}
                      onClick={() => {
                        setSelectedDecision(dec);
                        onSelectDecision(dec.id);
                      }}
                      className={`group rounded-[8px] border cursor-pointer transition-all ${
                        isCompact ? 'p-2.5' : 'p-3'
                      } ${
                        isSelected
                          ? 'border-black dark:border-white bg-black/[0.04] dark:bg-white/[0.08] shadow-xs'
                          : 'border-black/8 dark:border-white/8 bg-white dark:bg-[#121316] hover:border-black/15 dark:hover:border-white/15'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            isSelected
                              ? 'text-black dark:text-white'
                              : 'text-neutral-700 dark:text-neutral-300'
                          }`}
                        >
                          {dec.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {dec.category && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-mono ${
                                categoryColors[dec.category] || categoryColors.STRATEGY
                              }`}
                            >
                              {dec.category}
                            </span>
                          )}
                          <StatusLabel
                            size="sm"
                            status={isSuperseded ? 'superseded' : 'success'}
                            label={dec.lifecycle_status || 'ACTIVE'}
                          />
                        </div>
                      </div>
                      <h4
                        className={`font-medium text-black dark:text-white leading-snug ${
                          isCompact ? 'text-[12px] truncate' : 'text-xs'
                        }`}
                      >
                        {dec.title}
                      </h4>
                      {!isCompact && (
                        <p className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2 mt-1 leading-snug">
                          {dec.chosen_option}
                        </p>
                      )}
                      {isSelected && (
                        <div className="mt-2 pt-1.5 border-t border-black/8 dark:border-white/8 flex items-center justify-between text-[11px] text-black dark:text-white font-medium">
                          <span className="flex items-center gap-1">
                            <span className="text-[11px]">Selected</span>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {new Date(
                              Number(dec.timestamp) < 10000000000
                                ? Number(dec.timestamp) * 1000
                                : Number(dec.timestamp)
                            ).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Decision Detail */}
          <div className="lg:col-span-7 h-full flex flex-col">
            {selectedDecision ? (
              <div className="h-full flex flex-col rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 space-y-4 flex-1 overflow-y-auto">
                  {/* Header */}
                  <div className="pb-3 border-b border-black/8 dark:border-white/8">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-neutral-500 dark:text-neutral-400">
                          {selectedDecision.id}
                        </span>
                        {selectedDecision.category && (
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded-[4px] font-mono ${
                              categoryColors[selectedDecision.category] || categoryColors.STRATEGY
                            }`}
                          >
                            {selectedDecision.category}
                          </span>
                        )}
                        <StatusLabel
                          size="sm"
                          status={
                            (selectedDecision.lifecycle_status || '').toUpperCase() === 'SUPERSEDED'
                              ? 'superseded'
                              : 'success'
                          }
                          label={selectedDecision.lifecycle_status || 'ACTIVE'}
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Edit3 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEdit(selectedDecision)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          icon={<Archive className="w-3.5 h-3.5" />}
                          onClick={() => setSupersedeDialogOpen(true)}
                        >
                          Supersede
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5" />}
                          onClick={() => setPurgeDialogOpen(true)}
                        >
                          Purge
                        </Button>
                      </div>
                    </div>
                    <h3 className="text-base sm:text-lg font-semibold tracking-tight text-black dark:text-white leading-snug">
                      {selectedDecision.title}
                    </h3>
                  </div>

                  {/* Context & Drivers */}
                  <div className="space-y-1.5">
                    <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                      Context & Drivers
                    </div>
                    <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
                      {selectedDecision.context || 'No specific context recorded.'}
                    </p>
                    {selectedDecision.drivers && selectedDecision.drivers.length > 0 && (
                      <ul className="space-y-1 pt-1 pl-4 list-disc text-xs text-neutral-600 dark:text-neutral-400">
                        {selectedDecision.drivers.map((d, idx) => (
                          <li key={idx}>
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Chosen Direction card */}
                  <div className="p-3.5 rounded-[8px] bg-neutral-50 dark:bg-[#18191D] border border-black/10 dark:border-white/10 border-l-3 border-l-black dark:border-l-white space-y-1">
                    <div className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                      Chosen Policy / Decision
                    </div>
                    <p className="text-xs text-black dark:text-white leading-relaxed font-medium">
                      {selectedDecision.chosen_option}
                    </p>
                  </div>

                  {/* Superseded banner if applicable */}
                  {(selectedDecision.lifecycle_status || '').toUpperCase() === 'SUPERSEDED' && (
                    <div className="p-3 rounded-[8px] bg-amber-500/10 border border-amber-500/20 flex items-center justify-between text-xs text-amber-700 dark:text-amber-400">
                      <span>This decision has been superseded and is maintained for historical provenance.</span>
                      {selectedDecision.superseded_by && (
                        <span className="font-mono font-bold">Ref: {selectedDecision.superseded_by}</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-2.5 border-t border-black/8 dark:border-white/8 flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-300" />
                      <span className="font-mono text-[10px]">docs/adr/ADR-{selectedDecision.id}.md</span>
                    </div>
                    <span className="font-mono text-[10px]">Clearance: {selectedDecision.clearance || 'ALL_TEAM'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 rounded-[10px] border border-black/10 dark:border-white/10 bg-white/50 dark:bg-[#121316]/50 text-xs text-neutral-400">
                Select a decision on the left to view comprehensive details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* What-If Simulation Drawer */}
      <Drawer
        isOpen={simulationOpen}
        onClose={() => setSimulationOpen(false)}
        title="Counterfactual What-If Simulation"
        subtitle="Cross-references live payroll burn ($74k/mo), cash reserves ($666k), and active graph commitments"
        width="max-w-md sm:max-w-xl"
      >
        <div className="space-y-4">
          <div className="p-3.5 rounded-[10px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] space-y-3">
            <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
              Scenario Parameters
            </div>
            <div>
              <label className="text-xs font-medium text-black dark:text-white block mb-1">
                Proposal Hypothesis
              </label>
              <input
                type="text"
                value={simScenarioPrompt}
                onChange={(e) => setSimScenarioPrompt(e.target.value)}
                placeholder="e.g. What if Acme Corp delays SAML SSO delivery by 30 days?"
                className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-0.5">
              <div>
                <label className="text-[11px] font-medium text-black dark:text-white block mb-1 font-mono">
                  Burn Δ: +${(simBurnDelta / 1000).toFixed(0)}k/mo
                </label>
                <input
                  type="range"
                  min={0}
                  max={50000}
                  step={5000}
                  value={simBurnDelta}
                  onChange={(e) => setSimBurnDelta(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-black dark:text-white block mb-1 font-mono">
                  Delay: {simTimelineShift}d
                </label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={simTimelineShift}
                  onChange={(e) => setSimTimelineShift(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-black dark:text-white block mb-1 font-mono">
                  Devs: {simDevsReallocated}
                </label>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={simDevsReallocated}
                  onChange={(e) => setSimDevsReallocated(Number(e.target.value))}
                  className="w-full accent-black dark:accent-white"
                />
              </div>
            </div>

            <Button
              variant="primary"
              size="sm"
              loading={simulating}
              onClick={handleRunSimulation}
              className="w-full mt-1"
            >
              Run Counterfactual Analysis
            </Button>
          </div>

          {simResult && (
            <div className="space-y-3.5 animate-slide-up">
              <div className="grid grid-cols-3 gap-2">
                <div className="p-3 rounded-[8px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316]">
                  <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Baseline
                  </div>
                  <div className="text-base font-bold text-black dark:text-white font-mono mt-0.5">
                    {simResult.baseline_runway_months} mo
                  </div>
                </div>
                <div className="p-3 rounded-[8px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316]">
                  <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Simulated
                  </div>
                  <div className="text-base font-bold text-red-600 dark:text-red-400 font-mono mt-0.5">
                    {simResult.simulated_runway_months} mo
                  </div>
                </div>
                <div className="p-3 rounded-[8px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316]">
                  <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                    Runway Δ
                  </div>
                  <div className="text-base font-bold text-amber-600 dark:text-amber-400 font-mono mt-0.5">
                    {simResult.runway_delta_months} mo
                  </div>
                </div>
              </div>

              {simResult.compromised_clients && simResult.compromised_clients.length > 0 && (
                <div className="p-3.5 rounded-[8px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] space-y-2">
                  <div className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider flex items-center justify-between">
                    <span>Compromised Client Commitments</span>
                    <span className="text-red-600 dark:text-red-400 font-mono font-medium">
                      {simResult.compromised_clients.length} at risk
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {simResult.compromised_clients.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-[6px] bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-semibold text-black dark:text-white block">{c.client}</span>
                          <span className="text-neutral-500 text-[11px]">{c.commitment}</span>
                        </div>
                        <span className="font-mono font-semibold text-red-600 dark:text-red-400 shrink-0 ml-2">
                          {c.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-3.5 rounded-[8px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] border-l-3 border-l-black dark:border-l-white space-y-1.5">
                <div className="text-[10px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                  Strategic Synthesis
                </div>
                <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed">
                  {simResult.strategic_narrative}
                </p>
              </div>

              {simResult.pre_populated_adr && (
                <div className="pt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    icon={<Sparkles className="w-3.5 h-3.5" />}
                    onClick={handleRatifyFromSimulation}
                    className="w-full"
                  >
                    Ratify as ADR Decision
                  </Button>
                </div>
              )}
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
            <Button variant="secondary" size="sm" onClick={() => setRecordDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveDecision}>
              Ratify Decision
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1">
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Adopt Event-Driven WebSocket Architecture"
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 appearance-none transition-all"
            >
              <option value="STRATEGY">Strategy</option>
              <option value="ENGINEERING">Engineering</option>
              <option value="SECURITY">Security</option>
              <option value="PRODUCT">Product</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Context & Drivers
            </label>
            <textarea
              rows={3}
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              placeholder="What trade-offs or constraints drove this decision?"
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 resize-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Chosen Direction
            </label>
            <textarea
              rows={2}
              value={newChoice}
              onChange={(e) => setNewChoice(e.target.value)}
              placeholder="The precise binding policy adopted..."
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 resize-none transition-all"
            />
          </div>
        </div>
      </Dialog>

      {/* Edit Decision Dialog */}
      <Dialog
        isOpen={editDialogOpen}
        onClose={() => setEditDialogOpen(false)}
        title={`Edit Decision ${selectedDecision?.id}`}
        description="Modify context, chosen policy, or lifecycle status."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSaveEdit}>
              Save Changes
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1">
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Lifecycle Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 appearance-none transition-all"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUPERSEDED">SUPERSEDED</option>
              <option value="REPEALED">REPEALED</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Context & Drivers
            </label>
            <textarea
              rows={3}
              value={editContext}
              onChange={(e) => setEditContext(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 resize-none transition-all"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Chosen Direction
            </label>
            <textarea
              rows={2}
              value={editChoice}
              onChange={(e) => setEditChoice(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 resize-none transition-all"
            />
          </div>
        </div>
      </Dialog>

      {/* Supersede Confirmation Dialog */}
      <Dialog
        isOpen={supersedeDialogOpen}
        onClose={() => setSupersedeDialogOpen(false)}
        title={`Supersede Decision ${selectedDecision?.id}`}
        description="Marking this decision as SUPERSEDED preserves historical provenance in Kùzu while removing it from active enforcement."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setSupersedeDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSoftSupersede}>
              Confirm Supersede
            </Button>
          </>
        }
      >
        <div className="space-y-3 py-1">
          <p className="text-xs text-neutral-800 dark:text-neutral-200">
            Decision <span className="font-mono font-bold text-black dark:text-white">{selectedDecision?.id}</span> (
            <em>{selectedDecision?.title}</em>) will be marked as superseded.
          </p>
          <div>
            <label className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider block mb-1">
              Superseded By (Optional Decision ID)
            </label>
            <input
              type="text"
              value={supersededByVal}
              onChange={(e) => setSupersededByVal(e.target.value)}
              placeholder="e.g. DEC-015"
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all font-mono"
            />
          </div>
        </div>
      </Dialog>

      {/* Hard Purge Confirmation Dialog */}
      <Dialog
        isOpen={purgeDialogOpen}
        onClose={() => setPurgeDialogOpen(false)}
        title={`Permanently Purge Decision ${selectedDecision?.id}?`}
        description="Warning: Hard purge permanently detaches and deletes this node from the Kùzu graph database."
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setPurgeDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleHardPurge}>
              Purge Node
            </Button>
          </>
        }
      >
        <div className="p-3 rounded-[8px] bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400 space-y-1">
          <p className="font-semibold">This action cannot be undone.</p>
          <p>
            The node <span className="font-mono">{selectedDecision?.id}</span> and its relationship
            edges will be removed from the graph store.
          </p>
        </div>
      </Dialog>
    </div>
  );
};
