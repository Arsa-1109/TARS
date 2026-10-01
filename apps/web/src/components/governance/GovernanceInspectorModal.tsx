import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  UnverifiedFactDTO,
  PolicyRule,
  PolicyDecision,
  UserProfile,
} from '../../types/contracts';
import { api } from '../../services/client';
import {
  Scale,
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  Shield,
  X,
  Info,
} from 'lucide-react';
import { SegmentedControl } from '../primitives/SegmentedControl';

interface GovernanceInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile | null;
  onFactConfirmed?: () => void;
}

type GovernanceTab = 'facts' | 'policies' | 'simulator';

export const GovernanceInspectorModal: React.FC<GovernanceInspectorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onFactConfirmed,
}) => {
  const [activeTab, setActiveTab] = useState<GovernanceTab>('facts');

  // Tab 1: Unverified Facts
  const [facts, setFacts] = useState<UnverifiedFactDTO[]>([]);
  const [isLoadingFacts, setIsLoadingFacts] = useState(false);
  const [processingFactId, setProcessingFactId] = useState<string | null>(null);

  // Tab 2: Policy Rules
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [isLoadingPolicies, setIsLoadingPolicies] = useState(false);

  // Tab 3: Policy Simulator Sandbox
  const [simActionType, setSimActionType] = useState<string>('DEPLOY_CODE');
  const [simRole, setSimRole] = useState<string>(currentUser?.role || 'ENGINEER');
  const [simClearance, setSimClearance] = useState<string>(currentUser?.clearance || 'ALL_TEAM');
  const [simDecision, setSimDecision] = useState<PolicyDecision | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadFacts = async () => {
    setIsLoadingFacts(true);
    try {
      const data = await api.getUnverifiedFacts();
      setFacts(data);
    } catch (err) {
      console.error('Failed to load unverified facts:', err);
    } finally {
      setIsLoadingFacts(false);
    }
  };

  const loadPolicies = async () => {
    setIsLoadingPolicies(true);
    try {
      const data = await api.getPolicies();
      setPolicies(data);
    } catch (err) {
      console.error('Failed to load policies:', err);
    } finally {
      setIsLoadingPolicies(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFacts();
      loadPolicies();
    }
  }, [isOpen]);

  const handleFactTransition = async (fact: UnverifiedFactDTO, newState: 'CONFIRMED' | 'REJECTED') => {
    setProcessingFactId(fact.entity_id);
    try {
      await api.transitionFactConfidence({
        entity_type: fact.entity_type,
        entity_id: fact.entity_id,
        new_state: newState,
        actor: currentUser?.name || 'Alex Vance (CEO)',
        reason: `Operator decision from Review & Security Policies (${newState})`,
      });
      setFacts((prev) => prev.filter((f) => f.entity_id !== fact.entity_id));
      if (onFactConfirmed) onFactConfirmed();
    } catch (err) {
      console.error('Fact transition error:', err);
    } finally {
      setProcessingFactId(null);
    }
  };

  const handleSimulatePolicy = async () => {
    setIsSimulating(true);
    try {
      const decision = await api.evaluatePolicy({
        action_type: simActionType,
        role: simRole,
        clearance: simClearance,
      });
      setSimDecision(decision);
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-apple-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.12] dark:border-white/[0.15] shadow-[0_24px_64px_rgba(0,0,0,0.24)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.72)] overflow-hidden flex flex-col animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.08] dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
              <Scale className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold text-black dark:text-white tracking-tight">
                  Review & Security Policies
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]">
                  Access Control
                </span>
              </div>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                Review extracted facts and verify access control policies
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 shrink-0 bg-black/[0.015] dark:bg-white/[0.015]">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'facts', label: 'Pending Facts', badge: facts.length },
              { value: 'policies', label: 'Security Policies', badge: policies.length },
              { value: 'simulator', label: 'Policy Simulator' },
            ]}
            value={activeTab}
            onChange={(v) => setActiveTab(v as GovernanceTab)}
          />

          {activeTab === 'facts' && (
            <button
              onClick={loadFacts}
              className="inline-flex items-center gap-1.5 text-[11px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isLoadingFacts ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* TAB 1: PENDING FACTS */}
          {activeTab === 'facts' && (
            <div className="space-y-3">
              <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] flex items-start gap-2.5 text-[12px] text-[#3C3C43] dark:text-[#D1D1D6] mb-4">
                <Info className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0 mt-0.5" />
                <div>
                  Facts extracted from recordings and documents require human review before becoming verified company knowledge.
                </div>
              </div>

              {facts.length === 0 ? (
                <div className="py-16 text-center text-[#8E8E93] text-[13px]">
                  All company facts have been verified. No pending items in queue.
                </div>
              ) : (
                facts.map((fact) => (
                  <div
                    key={fact.entity_id}
                    className="p-4 rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] space-y-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-[#6E6E73] dark:text-[#8E8E93] px-1.5 py-0.5 rounded-[4px] bg-black/[0.04] dark:bg-white/[0.06]">
                          {fact.entity_type}
                        </span>
                        <span className="font-mono text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                          {fact.entity_id}
                        </span>
                        <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.06] text-[#3C3C43] dark:text-[#EBEBF5]">
                          Needs Review
                        </span>
                      </div>

                      <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                        {new Date(fact.timestamp).toLocaleDateString()}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-[13px] font-semibold text-black dark:text-white">
                        {fact.title}
                      </h4>
                      <p className="text-[12px] text-[#3C3C43] dark:text-[#D1D1D6] mt-1 leading-relaxed">
                        {fact.content_preview}
                      </p>
                      <div className="text-[11px] text-[#8E8E93] mt-2">
                        Source: <span className="font-medium text-[#6E6E73] dark:text-[#8E8E93]">{fact.source}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/[0.05] dark:border-white/[0.05]">
                      <button
                        onClick={() => handleFactTransition(fact, 'REJECTED')}
                        disabled={processingFactId === fact.entity_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#D70015] dark:hover:text-[#FF453A] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Dismiss</span>
                      </button>

                      <button
                        onClick={() => handleFactTransition(fact, 'CONFIRMED')}
                        disabled={processingFactId === fact.entity_id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-medium text-white bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-90 active:scale-95 transition-all shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Confirm Fact</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: ACTIVE POLICIES */}
          {activeTab === 'policies' && (
            <div className="space-y-3">
              {policies.map((p) => (
                <div
                  key={p.id}
                  className="p-4 rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] space-y-2.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[12px] text-[#6E6E73] dark:text-[#8E8E93] px-1.5 py-0.5 rounded-[4px] bg-black/[0.04] dark:bg-white/[0.06]">
                        {p.id}
                      </span>
                      <span className="text-[13px] font-semibold text-black dark:text-white">
                        {p.action_type}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93]">
                        {p.max_risk} Risk
                      </span>
                    </div>

                    <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                      Clearance: <strong className="text-black dark:text-white">{p.required_clearance}</strong>
                    </span>
                  </div>

                  <p className="text-[12px] text-[#3C3C43] dark:text-[#D1D1D6] leading-relaxed">
                    {p.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-black/[0.05] dark:border-white/[0.05] text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                    <div>
                      Roles:{' '}
                      <span className="font-medium text-black dark:text-white">
                        {p.allowed_roles.join(', ')}
                      </span>
                    </div>
                    <div>·</div>
                    <div>
                      Sign-off:{' '}
                      <span className="font-medium text-black dark:text-white">
                        {p.requires_human ? 'Manual Approval' : 'Automatic'}
                      </span>
                    </div>
                    <div>·</div>
                    <div>
                      Tools:{' '}
                      <span className="text-black dark:text-white">
                        {p.allowed_tools.join(', ') || 'All'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: POLICY SIMULATOR */}
          {activeTab === 'simulator' && (
            <div className="space-y-4 max-w-xl mx-auto">
              <div className="p-4 rounded-[14px] border border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] space-y-4">
                <div>
                  <h3 className="text-black dark:text-white font-semibold text-[14px]">
                    Access Policy Simulator
                  </h3>
                  <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                    Test an action against a role and clearance level to preview permission decisions.
                  </p>
                </div>

                <div className="space-y-3 text-[12px]">
                  <div>
                    <label className="block text-[#6E6E73] dark:text-[#8E8E93] mb-1 font-medium">
                      Action Type
                    </label>
                    <select
                      value={simActionType}
                      onChange={(e) => setSimActionType(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none"
                    >
                      <option value="DEPLOY_CODE">DEPLOY_CODE (Software Release)</option>
                      <option value="CAP_TABLE_MUTATION">CAP_TABLE_MUTATION (Equity/Shares)</option>
                      <option value="RECORD_DECISION">RECORD_DECISION (Living MADR)</option>
                      <option value="CREATE_USER">CREATE_USER (RBAC Mutation)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#6E6E73] dark:text-[#8E8E93] mb-1 font-medium">
                      Role
                    </label>
                    <select
                      value={simRole}
                      onChange={(e) => setSimRole(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none"
                    >
                      <option value="FOUNDER">FOUNDER (Alex Vance)</option>
                      <option value="ENGINEER">ENGINEER (Dr. Elena Rostova)</option>
                      <option value="PRODUCT">PRODUCT (Marcus Chen)</option>
                      <option value="SALES">SALES (Sarah Jenkins)</option>
                      <option value="NEW_HIRE">NEW_HIRE (Chloe Dubois)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#6E6E73] dark:text-[#8E8E93] mb-1 font-medium">
                      Clearance Level
                    </label>
                    <select
                      value={simClearance}
                      onChange={(e) => setSimClearance(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none"
                    >
                      <option value="ALL_TEAM">ALL_TEAM (General Team Clearance)</option>
                      <option value="EXECUTIVE_ONLY">EXECUTIVE_ONLY (Level 3 Founder Clearance)</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={handleSimulatePolicy}
                  disabled={isSimulating}
                  className="w-full py-2.5 rounded-[10px] bg-[#0071E3] dark:bg-[#0A84FF] text-white font-medium text-[13px] hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Test Policy</span>
                </button>
              </div>

              {/* Simulation Result */}
              {simDecision && (
                <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.1] bg-white dark:bg-[#1C1C1E]">
                  <div className="flex items-center gap-2">
                    {simDecision.is_allowed ? (
                      <CheckCircle2 className="w-4 h-4 text-[#34C759] dark:text-[#30D158]" />
                    ) : (
                      <XCircle className="w-4 h-4 text-[#D70015] dark:text-[#FF453A]" />
                    )}
                    <span className="text-[13px] font-semibold text-black dark:text-white">
                      {simDecision.is_allowed ? 'Action Permitted' : 'Access Restricted'}
                    </span>
                  </div>

                  <div className="mt-2 text-[12px] space-y-1 text-[#3C3C43] dark:text-[#D1D1D6]">
                    <div>
                      Manual Approval Required:{' '}
                      <strong className="text-black dark:text-white">{simDecision.requires_human ? 'Yes' : 'No'}</strong>
                    </div>
                    {simDecision.matching_policy_id && (
                      <div>
                        Matching Policy:{' '}
                        <span className="font-mono text-black dark:text-white">{simDecision.matching_policy_id}</span>
                      </div>
                    )}
                    {simDecision.denial_reasons.length > 0 && (
                      <div className="mt-2 text-[#D70015] dark:text-[#FF453A] space-y-1">
                        <strong className="block text-[11px] font-semibold">Restriction Reasons:</strong>
                        <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                          {simDecision.denial_reasons.map((r, i) => (
                            <li key={i}>{r}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-black/[0.08] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.015] shrink-0 text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
            <span>Security policies enforced locally</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[10px] bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-black/90 dark:hover:bg-white/90 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
