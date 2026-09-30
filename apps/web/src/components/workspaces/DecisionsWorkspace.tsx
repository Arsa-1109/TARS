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
  StrategicRecommendation,
} from '../../types/contracts';
import { decisionsApi } from '../../services/decisionsApi';
import { realtimeBus } from '../../services/realtime';
import {
  Scale,
  Play,
  Plus,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  GitCommit,
  Trash2,
  Archive,
  Edit3,
  SlidersHorizontal,
  DollarSign,
  AlertOctagon,
  Sparkles,
  Zap,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Compass,
  FilePlus2,
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

  // Strategic Growth Radar State
  const [recommendations, setRecommendations] = useState<StrategicRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [generatingRecs, setGeneratingRecs] = useState(false);
  const [radarExpanded, setRadarExpanded] = useState(true);
  const [recFilterTab, setRecFilterTab] = useState<string>('ALL');
  const [radarNotice, setRadarNotice] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setLoadingRecs(true);
    try {
      const data = await decisionsApi.getRecommendations();
      setRecommendations(data);
    } catch (err) {
      console.warn('Failed to load recommendations:', err);
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleGenerateRecommendations = async () => {
    setGeneratingRecs(true);
    setRadarNotice(null);
    try {
      const data = await decisionsApi.generateRecommendations();
      setRecommendations(data);
      setRadarNotice('Fresh strategic suggestions synthesized by local Qwen 3 model from institutional memory.');
      setTimeout(() => setRadarNotice(null), 6000);
    } catch (err) {
      console.error('Failed to generate suggestions:', err);
    } finally {
      setGeneratingRecs(false);
    }
  };

  const handleDismissRec = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
    await decisionsApi.dismissRecommendation(id);
  };

  const handlePromoteToDecision = (rec: StrategicRecommendation) => {
    setNewTitle(rec.title);
    let cat: 'STRATEGY' | 'ENGINEERING' | 'SECURITY' | 'PRODUCT' = 'STRATEGY';
    if (rec.category === 'ARCHITECTURE' || rec.category === 'ENGINEERING') cat = 'ENGINEERING';
    else if (rec.category === 'SECURITY') cat = 'SECURITY';
    else if (rec.category === 'VELOCITY' || rec.category === 'PRODUCT') cat = 'PRODUCT';
    setNewCategory(cat);

    const contextContent = `${rec.rationale}\n\nEstimated Impact: ${rec.estimated_impact}\nSupporting Citations: ${(rec.supporting_citations || []).join(', ')}`;
    setNewContext(contextContent);
    setNewChoice((rec.actionable_steps || []).join('\n'));
    setRecordDialogOpen(true);
  };

  const handleSimulateRec = (rec: StrategicRecommendation) => {
    setSimScenarioPrompt(rec.sim_prompt || `What if we implement: ${rec.title}?`);
    setSimBurnDelta(rec.sim_burn_delta ?? -5000);
    setSimTimelineShift(rec.sim_timeline_shift ?? 14);
    setSimulationOpen(true);
  };

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
    fetchRecommendations();
    const unsub = realtimeBus.subscribe((evt) => {
      if (evt.event === 'DECISION_MUTATION') {
        fetchDecisions();
        fetchRecommendations();
      }
    });
    return unsub;
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
    STRATEGY: 'bg-[#0071E3]/[0.10] text-[#0071E3] dark:bg-[#0A84FF]/[0.12] dark:text-[#0A84FF]',
    ENGINEERING: 'bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white',
    SECURITY: 'bg-[#FF3B30]/[0.08] text-[#C0392B] dark:bg-[#FF453A]/[0.10] dark:text-[#FF453A]',
    PRODUCT: 'bg-[#FF9500]/[0.10] text-[#B25000] dark:bg-[#FF9F0A]/[0.12] dark:text-[#FF9F0A]',
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

  const recCategoryBadges: Record<string, { bg: string; text: string; border: string }> = {
    REVENUE: {
      bg: 'bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.12]',
      text: 'text-[#0071E3] dark:text-[#0A84FF]',
      border: 'border-[#0071E3]/20 dark:border-[#0A84FF]/25',
    },
    RUNWAY: {
      bg: 'bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12]',
      text: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-500/20 dark:border-emerald-500/25',
    },
    VELOCITY: {
      bg: 'bg-purple-500/[0.08] dark:bg-purple-500/[0.12]',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-500/20 dark:border-purple-500/25',
    },
    ARCHITECTURE: {
      bg: 'bg-amber-500/[0.08] dark:bg-amber-500/[0.12]',
      text: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-500/20 dark:border-amber-500/25',
    },
    SECURITY: {
      bg: 'bg-rose-500/[0.08] dark:bg-rose-500/[0.12]',
      text: 'text-rose-600 dark:text-rose-400',
      border: 'border-rose-500/20 dark:border-rose-500/25',
    },
    STRATEGY: {
      bg: 'bg-sky-500/[0.08] dark:bg-sky-500/[0.12]',
      text: 'text-sky-600 dark:text-sky-400',
      border: 'border-sky-500/20 dark:border-sky-500/25',
    },
  };

  const filteredRecommendations = useMemo(() => {
    return recommendations.filter((r) => {
      if (recFilterTab === 'ALL') return true;
      return (r.category || '').toUpperCase() === recFilterTab;
    });
  }, [recommendations, recFilterTab]);

  return (
    <div className="space-y-5 animate-fade-in pb-4">
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

      {/* Strategic Growth Radar & Autonomous ML Suggestions */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-sm overflow-hidden transition-all">
        {/* Radar Header */}
        <div className="p-4 sm:p-5 border-b border-black/[0.05] dark:border-white/[0.05] flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0071E3]/20 via-[#0A84FF]/20 to-purple-500/20 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0 border border-[#0071E3]/20 shadow-inner">
              <Sparkles className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-bold text-black dark:text-white tracking-tight">
                  Strategic Growth Radar
                </span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Qwen 3 (Local ML Connected)
                </span>
              </div>
              <span className="text-[11px] text-[#86868B] dark:text-[#8E8E93] block">
                Autonomous optimization vectors synthesized from sovereign company memory, financial runway ($666k / -$74k burn), and active ADR invariants.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-auto">
            <Button
              variant="secondary"
              size="sm"
              loading={generatingRecs}
              icon={<Sparkles className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />}
              onClick={handleGenerateRecommendations}
            >
              Analyze Opportunities
            </Button>
            <button
              type="button"
              onClick={() => setRadarExpanded(!radarExpanded)}
              className="p-1.5 rounded-lg text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
              title={radarExpanded ? "Collapse Radar" : "Expand Radar"}
            >
              {radarExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Radar Body */}
        {radarExpanded && (
          <div className="p-4 sm:p-5 space-y-4">
            {/* Notice banner if freshly generated */}
            {radarNotice && (
              <div className="flex items-center justify-between text-[12px] px-3.5 py-2 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{radarNotice}</span>
                </div>
                <button
                  onClick={() => setRadarNotice(null)}
                  className="text-emerald-600 dark:text-emerald-400 hover:opacity-75"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Category Filter Bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {['ALL', 'REVENUE', 'RUNWAY', 'VELOCITY', 'ARCHITECTURE', 'SECURITY'].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setRecFilterTab(cat)}
                    className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full font-semibold transition-all ${
                      recFilterTab === cat
                        ? 'bg-black text-white dark:bg-white dark:text-black shadow-xs'
                        : 'bg-black/[0.04] text-[#6E6E73] dark:bg-white/[0.06] dark:text-[#8E8E93] hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <span className="text-[11px] font-mono text-[#8E8E93] shrink-0">
                {filteredRecommendations.length} Vector{filteredRecommendations.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Suggestions Cards Grid */}
            {loadingRecs && recommendations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8E8E93] flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-[#0071E3]" />
                <span>Synthesizing company strategic vectors...</span>
              </div>
            ) : filteredRecommendations.length === 0 ? (
              <div className="py-8 text-center text-xs text-[#8E8E93] rounded-[16px] border border-dashed border-black/[0.08] dark:border-white/[0.08]">
                No recommendations in this category. Click &quot;Analyze Opportunities&quot; to discover new growth vectors.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3.5">
                {filteredRecommendations.map((rec) => {
                  const badgeStyle = recCategoryBadges[rec.category.toUpperCase()] || recCategoryBadges.STRATEGY;
                  const isHigh = (rec.priority || '').toUpperCase() === 'HIGH';

                  return (
                    <div
                      key={rec.id}
                      className="group flex flex-col justify-between rounded-[16px] border border-black/[0.07] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] p-4 transition-all duration-200 hover:shadow-md hover:border-black/[0.14] dark:hover:border-white/[0.14] space-y-3"
                    >
                      <div className="space-y-2.5">
                        {/* Top Meta Row */}
                        <div className="flex items-start justify-between gap-1.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`text-[9.5px] font-mono font-bold px-2 py-0.5 rounded-full border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
                            >
                              {rec.category}
                            </span>
                            <span
                              className={`text-[9.5px] font-mono font-semibold px-1.5 py-0.5 rounded-md ${
                                isHigh
                                  ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                              }`}
                            >
                              {rec.priority}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDismissRec(rec.id, e)}
                            className="text-[#8E8E93] hover:text-[#FF3B30] p-1 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                            title="Dismiss suggestion"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Title */}
                        <h4 className="text-[13px] font-bold text-black dark:text-white leading-snug">
                          {rec.title}
                        </h4>

                        {/* Estimated Impact Pill */}
                        <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/[0.08] dark:bg-emerald-500/[0.12] border border-emerald-500/20 px-2 py-0.5 rounded-md">
                          <TrendingUp className="w-3 h-3 shrink-0" />
                          <span className="truncate">{rec.estimated_impact}</span>
                        </div>

                        {/* Rationale */}
                        <p className="text-[11.5px] text-[#4A4A4F] dark:text-[#A1A1A6] leading-relaxed line-clamp-3">
                          {rec.rationale}
                        </p>

                        {/* Actionable Steps */}
                        {rec.actionable_steps && rec.actionable_steps.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E8E93]">
                              Action Vectors:
                            </span>
                            <ul className="space-y-1">
                              {rec.actionable_steps.slice(0, 3).map((step, sIdx) => (
                                <li
                                  key={sIdx}
                                  className="flex items-start gap-1.5 text-[11px] text-[#333] dark:text-[#C7C7CC] leading-tight"
                                >
                                  <span className="text-[#0071E3] dark:text-[#0A84FF] mt-0.5 font-bold">›</span>
                                  <span>{step}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Supporting Citations */}
                        {rec.supporting_citations && rec.supporting_citations.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 pt-1">
                            {rec.supporting_citations.map((cite, cIdx) => (
                              <span
                                key={cIdx}
                                className="text-[9.5px] font-mono bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] px-1.5 py-0.5 rounded"
                              >
                                {cite}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Card Action Buttons */}
                      <div className="pt-2 border-t border-black/[0.05] dark:border-white/[0.05] flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePromoteToDecision(rec)}
                          className="flex-1 flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 px-2 rounded-lg bg-black/[0.05] dark:bg-white/[0.07] text-black dark:text-white hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                          title="Draft this recommendation as an Architectural Decision Record"
                        >
                          <FilePlus2 className="w-3 h-3" />
                          <span>Draft ADR</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSimulateRec(rec)}
                          className="flex items-center justify-center gap-1 text-[11px] font-medium py-1.5 px-2.5 rounded-lg bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3] hover:text-white dark:hover:bg-[#0A84FF] dark:hover:text-white transition-colors"
                          title="Run counterfactual runway and delivery simulation on this scenario"
                        >
                          <Play className="w-3 h-3" />
                          <span>Simulate</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Contradiction Detection Surface */}
      <div className="p-4 sm:p-5 rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FF9500]/10 text-[#FF9500] flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <span className="text-[13px] font-semibold text-black dark:text-white block">
                Policy Contradiction Check
              </span>
              <span className="text-[11px] text-[#86868B] dark:text-[#8E8E93]">
                Verifies proposals against ratified ADR decisions
              </span>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                runContradictionCheck();
              }
            }}
            placeholder="Test a pending strategic proposal (e.g. 'Build bespoke SAML auth for Acme Corp')..."
            className="flex-1 px-4 py-2.5 text-[13px] rounded-full border border-black/[0.08] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white transition-all"
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
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#8E8E93]">
          <span className="text-[11px]">Quick test:</span>
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
              className="text-[11px] px-2.5 py-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] text-[#3C3C43] dark:text-[#EBEBF5] hover:bg-black/[0.08] dark:hover:bg-white/[0.12] transition-colors truncate max-w-[280px]"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start h-[calc(100vh-210px)] min-h-[580px]">
          {/* Left Column: Decision Ledger List */}
          <div className="lg:col-span-5 flex flex-col h-full space-y-3">
            {/* Header controls: Filter tabs + Density toggle */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
                {(['ALL', 'ACTIVE', 'SUPERSEDED', 'STRATEGY', 'ENGINEERING'] as FilterTab[]).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`text-[11px] px-2.5 py-1 rounded-full font-semibold transition-all ${
                        filterTab === tab
                          ? 'bg-black text-white dark:bg-white dark:text-black'
                          : 'bg-black/[0.04] text-[#6E6E73] dark:bg-white/[0.06] dark:text-[#8E8E93] hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  )
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                <SlidersHorizontal className="w-3.5 h-3.5 text-[#8E8E93]" />
                <button
                  onClick={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}
                  className="text-[11px] font-mono text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors"
                >
                  {density === 'comfortable' ? 'Comfortable' : 'Compact'}
                </button>
              </div>
            </div>

            {/* Scrollable list */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {filteredDecisions.length === 0 ? (
                <div className="p-8 text-center text-xs text-[#8E8E93] rounded-[16px] border border-dashed border-black/[0.08] dark:border-white/[0.08]">
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
                      className={`group rounded-[16px] border cursor-pointer transition-all duration-200 ${
                        isCompact ? 'p-2.5' : 'p-4'
                      } ${
                        isSelected
                          ? 'border-[#0071E3]/40 dark:border-[#0A84FF]/40 bg-white dark:bg-[#1C1C1E] shadow-sm ring-1 ring-[#0071E3]/20 dark:ring-[#0A84FF]/20'
                          : 'border-black/[0.07] dark:border-white/[0.07] bg-white/70 dark:bg-[#1C1C1E]/60 hover:bg-white dark:hover:bg-[#1C1C1E] hover:border-black/[0.14] dark:hover:border-white/[0.14] hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span
                          className={`font-mono text-[11px] font-bold ${
                            isSelected
                              ? 'text-[#0071E3] dark:text-[#0A84FF]'
                              : 'text-black dark:text-white'
                          }`}
                        >
                          {dec.id}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {dec.category && (
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
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
                        className={`font-semibold text-black dark:text-white leading-snug ${
                          isCompact ? 'text-[12px] truncate' : 'text-[13px]'
                        }`}
                      >
                        {dec.title}
                      </h4>
                      {!isCompact && (
                        <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] line-clamp-2 mt-1 leading-snug">
                          {dec.chosen_option}
                        </p>
                      )}
                      {isSelected && (
                        <div className="mt-2 pt-2 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#0071E3] dark:text-[#0A84FF] font-medium">
                          <span className="flex items-center gap-1">
                            <span>Selected</span>
                            <CheckCircle2 className="w-3 h-3" />
                          </span>
                          <span className="text-[10px] font-mono text-[#8E8E93]">
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
              <div className="h-full flex flex-col rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] shadow-sm overflow-hidden">
                {/* Accent top bar */}
                <div className="h-0.5 bg-gradient-to-r from-[#0071E3] via-[#0A84FF] to-transparent shrink-0" />

                <div className="p-5 sm:p-6 space-y-5 flex-1 overflow-y-auto">
                  {/* Header */}
                  <div className="pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
                    <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[12px] font-bold text-[#8E8E93]">
                          {selectedDecision.id}
                        </span>
                        {selectedDecision.category && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${
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
                      <div className="flex items-center gap-2">
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
                          variant="ghost"
                          size="sm"
                          icon={<Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />}
                          onClick={() => setPurgeDialogOpen(true)}
                        >
                          Purge
                        </Button>
                      </div>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold tracking-tight text-black dark:text-white leading-snug">
                      {selectedDecision.title}
                    </h3>
                  </div>

                  {/* Context & Drivers */}
                  <div className="space-y-2">
                    <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider">
                      Context & Drivers
                    </div>
                    <p className="text-[13px] text-[#1D1D1F] dark:text-[#EBEBF5] leading-relaxed">
                      {selectedDecision.context || 'No specific context recorded.'}
                    </p>
                    {selectedDecision.drivers && selectedDecision.drivers.length > 0 && (
                      <ul className="space-y-1 pt-1 pl-4 list-disc">
                        {selectedDecision.drivers.map((d, idx) => (
                          <li key={idx} className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                            {d}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {/* Chosen Direction — accent card */}
                  <div className="p-4 rounded-[14px] bg-[#0071E3]/[0.05] dark:bg-[#0A84FF]/[0.06] border border-[#0071E3]/[0.15] dark:border-[#0A84FF]/[0.15] border-l-4 border-l-[#0071E3] dark:border-l-[#0A84FF] space-y-1.5">
                    <div className="text-[11px] font-bold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider">
                      Chosen Policy / Decision
                    </div>
                    <p className="text-[13px] text-black dark:text-white leading-relaxed font-medium">
                      {selectedDecision.chosen_option}
                    </p>
                  </div>

                  {/* Superseded banner if applicable */}
                  {(selectedDecision.lifecycle_status || '').toUpperCase() === 'SUPERSEDED' && (
                    <div className="p-3.5 rounded-[12px] bg-[#FF9500]/[0.08] dark:bg-[#FF9F0A]/[0.10] border border-[#FF9500]/20 flex items-center justify-between text-xs text-[#B25000] dark:text-[#FF9F0A]">
                      <span>This decision has been superseded and is maintained for historical provenance.</span>
                      {selectedDecision.superseded_by && (
                        <span className="font-mono font-bold">Ref: {selectedDecision.superseded_by}</span>
                      )}
                    </div>
                  )}

                  {/* Footer */}
                  <div className="pt-3 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-[#8E8E93]">
                    <div className="flex items-center gap-1.5">
                      <GitCommit className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                      <span className="font-mono">docs/adr/ADR-{selectedDecision.id}.md</span>
                    </div>
                    <span className="font-mono">Clearance: {selectedDecision.clearance || 'ALL_TEAM'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-8 rounded-[20px] border border-black/[0.08] dark:border-white/[0.10] bg-white/50 dark:bg-[#1C1C1E]/50 text-xs text-[#8E8E93]">
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
        <div className="space-y-5">
          <div className="p-4 rounded-[16px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-3">
            <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
              Scenario Parameters
            </div>
            <div>
              <label className="text-[12px] font-semibold text-black dark:text-white block mb-1">
                Proposal Hypothesis
              </label>
              <input
                type="text"
                value={simScenarioPrompt}
                onChange={(e) => setSimScenarioPrompt(e.target.value)}
                placeholder="e.g. What if Acme Corp delays SAML SSO delivery by 30 days?"
                className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div>
                <label className="text-[11px] font-semibold text-black dark:text-white block mb-1">
                  Burn Δ: +${(simBurnDelta / 1000).toFixed(0)}k/mo
                </label>
                <input
                  type="range"
                  min={0}
                  max={50000}
                  step={5000}
                  value={simBurnDelta}
                  onChange={(e) => setSimBurnDelta(Number(e.target.value))}
                  className="w-full accent-[#0071E3]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-black dark:text-white block mb-1">
                  Delay: {simTimelineShift}d
                </label>
                <input
                  type="range"
                  min={0}
                  max={90}
                  step={5}
                  value={simTimelineShift}
                  onChange={(e) => setSimTimelineShift(Number(e.target.value))}
                  className="w-full accent-[#0071E3]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-black dark:text-white block mb-1">
                  Devs: {simDevsReallocated}
                </label>
                <input
                  type="range"
                  min={0}
                  max={6}
                  value={simDevsReallocated}
                  onChange={(e) => setSimDevsReallocated(Number(e.target.value))}
                  className="w-full accent-[#0071E3]"
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
            <div className="space-y-4 animate-slide-up">
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E]">
                  <div className="text-[10px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                    Baseline
                  </div>
                  <div className="text-lg font-bold text-black dark:text-white font-mono mt-0.5">
                    {simResult.baseline_runway_months} mo
                  </div>
                </div>
                <div className="p-3 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E]">
                  <div className="text-[10px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                    Simulated
                  </div>
                  <div className="text-lg font-bold text-[#C0392B] dark:text-[#FF453A] font-mono mt-0.5">
                    {simResult.simulated_runway_months} mo
                  </div>
                </div>
                <div className="p-3 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E]">
                  <div className="text-[10px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                    Runway Δ
                  </div>
                  <div className="text-lg font-bold text-[#B25000] dark:text-[#FF9F0A] font-mono mt-0.5">
                    {simResult.runway_delta_months} mo
                  </div>
                </div>
              </div>

              {simResult.compromised_clients && simResult.compromised_clients.length > 0 && (
                <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] space-y-2">
                  <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider flex items-center justify-between">
                    <span>Compromised Client Commitments</span>
                    <span className="text-[#FF3B30] font-mono">
                      {simResult.compromised_clients.length} at risk
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {simResult.compromised_clients.map((c, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-[10px] bg-[#FF3B30]/[0.05] dark:bg-[#FF453A]/[0.08] border border-[#FF3B30]/15 flex items-center justify-between text-xs"
                      >
                        <div>
                          <span className="font-bold text-black dark:text-white block">{c.client}</span>
                          <span className="text-[#8E8E93] text-[11px]">{c.commitment}</span>
                        </div>
                        <span className="font-mono font-bold text-[#FF3B30] shrink-0 ml-2">
                          {c.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 border-l-4 border-l-black dark:border-l-white space-y-2">
                <div className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider">
                  Strategic Synthesis
                </div>
                <p className="text-[13px] text-[#1D1D1F] dark:text-[#EBEBF5] leading-relaxed">
                  {simResult.strategic_narrative}
                </p>
              </div>

              {simResult.pre_populated_adr && (
                <div className="pt-2">
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
        <div className="space-y-3.5 py-1">
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Title
            </label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Adopt Event-Driven WebSocket Architecture"
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Category
            </label>
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
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Context & Drivers
            </label>
            <textarea
              rows={3}
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              placeholder="What trade-offs or constraints drove this decision?"
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 resize-none transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Chosen Direction
            </label>
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
        <div className="space-y-3.5 py-1">
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Title
            </label>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Lifecycle Status
            </label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 appearance-none transition-all"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="SUPERSEDED">SUPERSEDED</option>
              <option value="REPEALED">REPEALED</option>
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Context & Drivers
            </label>
            <textarea
              rows={3}
              value={editContext}
              onChange={(e) => setEditContext(e.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 resize-none transition-all"
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Chosen Direction
            </label>
            <textarea
              rows={2}
              value={editChoice}
              onChange={(e) => setEditChoice(e.target.value)}
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 resize-none transition-all"
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
          <p className="text-[13px] text-black dark:text-white">
            Decision <span className="font-mono font-bold">{selectedDecision?.id}</span> (
            <em>{selectedDecision?.title}</em>) will be marked as superseded.
          </p>
          <div>
            <label className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider block mb-1">
              Superseded By (Optional Decision ID)
            </label>
            <input
              type="text"
              value={supersededByVal}
              onChange={(e) => setSupersededByVal(e.target.value)}
              placeholder="e.g. DEC-015"
              className="w-full px-3.5 py-2.5 text-[13px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 transition-all font-mono"
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
        <div className="p-3 rounded-[12px] bg-[#FF3B30]/[0.08] dark:bg-[#FF453A]/[0.10] border border-[#FF3B30]/20 text-xs text-[#C0392B] dark:text-[#FF453A] space-y-1">
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
