import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { LandingPage } from './components/landing/LandingPage';
import { AuthModal } from './components/auth/AuthModal';
import { ClearanceGateModal } from './components/layout/ClearanceGateModal';
import { RoleOnboardingModal } from './components/layout/RoleOnboardingModal';
import { KnowledgeWorkspace } from './components/workspaces/KnowledgeWorkspace';
import { CallStudioWorkspace } from './components/workspaces/CallStudioWorkspace';
import { OnboardingWorkspace } from './components/workspaces/OnboardingWorkspace';
import { ThinkTankWorkspace } from './components/workspaces/ThinkTankWorkspace';
import { DecisionsWorkspace } from './components/workspaces/DecisionsWorkspace';
import { ArchitectureWorkspace } from './components/workspaces/ArchitectureWorkspace';
import { ActionHubDrawer } from './components/actions/ActionHubDrawer';
import { CitationDrawer } from './components/provenance/CitationDrawer';
import { CommandPalette } from './components/layout/CommandPalette';
import { SettingsModal } from './components/layout/SettingsModal';
import { VoiceMemoModal } from './components/layout/VoiceMemoModal';
import { GenesisOnboardingWizard } from './components/onboarding/GenesisOnboardingWizard';
import { CursorConfigModal } from './components/layout/CursorConfigModal';
import { useSessionStore, WORKSPACE_DOMAINS } from './state/useSessionStore';
import { useThemeStore } from './state/useThemeStore';
import { useNavigationStore } from './state/useNavigationStore';
import { ActionItemDTO, WorkspaceId, CompanyProfile } from './types/contracts';
import { tarsClient, useTarsInvalidation } from './services/tarsClient';
import { ErrorBoundary } from './components/primitives/ErrorBoundary';


export function App() {
  const {
    isAuthenticated,
    login,
    logout,
    profile,
    currentRole,
    setRole,
    activeDomain,
    switchDomain,
    availableRoles,
    availableDomains,
    canAccessWorkspace,
    setOnboardingCompleted,
  } = useSessionStore();

  const { theme, toggleTheme } = useThemeStore();
  const {
    workspace,
    setWorkspace,
    actionHubOpen,
    setActionHubOpen,
    citationState,
    openCitation,
    closeCitation,
    activeCallId,
    setActiveCallId,
    activeDecisionId,
    setActiveDecisionId,
    activeFindingId,
    setActiveFindingId,
    navigateToSource,
  } = useNavigationStore();

  const [showLanding, setShowLanding] = useState(!isAuthenticated);
  const [appVisible, setAppVisible] = useState(isAuthenticated);
  const [landingVisible, setLandingVisible] = useState(!isAuthenticated);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'signin' | 'signup'>('signin');
  const [roleOnboardingOpen, setRoleOnboardingOpen] = useState(false);
  const [clearanceGateState, setClearanceGateState] = useState<{
    open: boolean;
    targetWorkspaceName: string;
    requiredClearance: string;
  }>({
    open: false,
    targetWorkspaceName: '',
    requiredClearance: 'EXECUTIVE_ONLY',
  });

  const transitionToApp = () => {
    // Apple-style: brief dissolve before revealing the workspace shell
    setLandingVisible(false);
    setTimeout(() => {
      setShowLanding(false);
      setAppVisible(true);
    }, 240);
  };

  const transitionToLanding = () => {
    setAppVisible(false);
    setTimeout(() => {
      setShowLanding(true);
      setLandingVisible(true);
    }, 240);
  };

  const [actionItems, setActionItems] = useState<ActionItemDTO[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceMemoOpen, setVoiceMemoOpen] = useState(false);
  const [genesisWizardOpen, setGenesisWizardOpen] = useState(false);
  const [cursorModalOpen, setCursorModalOpen] = useState(false);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [appNotice, setAppNotice] = useState<{ type: 'error' | 'warning'; message: string } | null>(null);

  const fetchActionItems = useCallback(async () => {
    try {
      const items = await tarsClient.actions.getItems();
      setActionItems(items);
    } catch (err: any) {
      setAppNotice({ type: 'error', message: err?.message || 'Failed to sync Action Hub tasks.' });
    }
  }, []);

  useTarsInvalidation('actions:updated', () => {
    fetchActionItems();
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    const targetComp = profile?.company_name || profile?.company_id || undefined;
    fetchActionItems();
    tarsClient.company.getProfile(targetComp).then((prof) => {
      if (prof && prof.company_name) {
        if (profile?.company_name && prof.company_name.toLowerCase().trim() !== profile.company_name.toLowerCase().trim()) {
          setCompanyProfile(null);
          return;
        }
        setCompanyProfile(prof);
      } else {
        setCompanyProfile(null);
        // If company_profile is unbloomed or empty for this company, check genesis completion
        const companyKey = profile?.company_name
          ? `tars_genesis_completed_${profile.company_name.toLowerCase().trim().replace(/\s+/g, '_')}`
          : 'tars_genesis_completed';
        const completed = localStorage.getItem(companyKey);
        if (!completed) {
          setGenesisWizardOpen(true);
        }
      }
    }).catch((err: any) => {
      setAppNotice({ type: 'warning', message: err?.message || 'Unable to verify company profile with backend.' });
    });
  }, [isAuthenticated, profile?.company_name, profile?.company_id, fetchActionItems]);

  // Synchronise company identity with logged-in user profile
  useEffect(() => {
    if (profile?.company_name) {
      setCompanyProfile((prev) => {
        if (prev?.company_name === profile.company_name) return prev;
        return {
          id: profile.company_id || prev?.id || `CMP-${Date.now()}`,
          company_name: profile.company_name!,
          industry: prev?.industry || 'B2B SaaS',
          stage: prev?.stage || 'Seed',
          team_size: prev?.team_size || '1–5',
          one_liner: prev?.one_liner || `${profile.company_name} sovereign intelligence workspace.`,
          enterprise_policy: prev?.enterprise_policy || 'REJECT_CUSTOM_FORKS',
          pricing_model: prev?.pricing_model || 'USAGE_BASED',
          tars_tone: prev?.tars_tone || 'CONCISE_EXECUTIVE',
        };
      });
    }
  }, [profile?.company_name, profile?.company_id]);



  // Update landing view state if authentication status changes
  useEffect(() => {
    if (!isAuthenticated) {
      transitionToLanding();
    }
  }, [isAuthenticated]);

  // When domain changes, update active domain
  const handleDomainChange = (domainId: typeof activeDomain) => {
    switchDomain(domainId);
  };

  // Safe workspace selection with Clearance Gates (Workspace Isolation)
  const handleSelectWorkspace = (targetWs: WorkspaceId) => {
    const access = canAccessWorkspace(targetWs);
    if (!access.allowed) {
      const names: Record<WorkspaceId, string> = {
        decisions: 'Strategic Decision Registry & Simulation',
        architecture: 'Tech & Architecture Cortex',
        calls: 'Client Call Intelligence Studio',
        knowledge: 'Universal Knowledge Base',
        thinktank: 'Collaborative Think Tank',
        onboarding: 'Role Onboarding Flight Plan',
      };
      const clearanceReq: Record<WorkspaceId, string> = {
        decisions: 'EXECUTIVE_ONLY (Level 3 Clearance)',
        architecture: 'TECHNICAL_ENGINEERING (Level 2 Clearance)',
        calls: 'COMMERCIAL_PRODUCT (Level 2 Clearance)',
        knowledge: 'ALL_TEAM',
        thinktank: 'ALL_TEAM',
        onboarding: 'ALL_TEAM',
      };
      setClearanceGateState({
        open: true,
        targetWorkspaceName: names[targetWs] || targetWs,
        requiredClearance: clearanceReq[targetWs] || 'Restricted Role Clearance',
      });
      return;
    }
    setWorkspace(targetWs);
  };

  const handleStatusChange = async (id: string, newStatus: ActionItemDTO['status']) => {
    try {
      const updated = await tarsClient.actions.updateStatus(id, newStatus);
      setActionItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err: any) {
      setAppNotice({ type: 'error', message: err?.message || 'Failed to update task status.' });
    }
  };

  const handlePromoteCommitment = async (commitmentText: string, callId: string, timestamp: string) => {
    try {
      const newItem = await tarsClient.actions.createItem({
        description: commitmentText,
        owner: profile.name,
        deadline: Date.now() + 5 * 86400000,
        status: 'OPEN',
        source_type: 'CALL',
        source_id: callId,
        source_offset: timestamp,
      });
      setActionItems((prev) => [newItem, ...prev]);
    } catch (err: any) {
      setAppNotice({ type: 'error', message: err?.message || 'Failed to promote commitment to Action Hub.' });
    }
  };

  const handleCreateTask = async (task: Omit<ActionItemDTO, 'id'>) => {
    try {
      const newItem = await tarsClient.actions.createItem(task);
      setActionItems((prev) => [newItem, ...prev]);
    } catch (err: any) {
      setAppNotice({ type: 'error', message: err?.message || 'Failed to create Action Hub task.' });
    }
  };

  const handleMemoRecorded = async (title: string, durationSec: number, transcript?: string) => {
    try {
      const desc = transcript && transcript.trim().length > 0
        ? `Voice Memo (${durationSec}s): "${transcript.slice(0, 120)}${transcript.length > 120 ? '...' : ''}"`
        : `Review recorded founder voice debrief (${durationSec}s)`;

      const newAction = await tarsClient.actions.createItem({
        description: desc,
        owner: profile.name,
        deadline: Date.now() + 1 * 86400000,
        status: 'OPEN',
        source_type: 'CALL',
        source_id: 'Mobile /memo Debrief',
        source_offset: 'Just now',
      });
      setActionItems((prev) => [newAction, ...prev]);
    } catch (err: any) {
      setAppNotice({ type: 'error', message: err?.message || 'Failed to save voice memo action item.' });
    }
  };

  const openTasksCount = actionItems.filter((i) => i.status !== 'DONE').length;

  // Render Landing Page if requested or unauthenticated
  if (showLanding) {
    return (
      <div
        className={`transition-opacity duration-240 ease-in-out ${landingVisible ? 'opacity-100' : 'opacity-0'}`}
        style={{ willChange: 'opacity' }}
      >
        <LandingPage
          onOpenAuth={(mode = 'signin') => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onLaunchDemo={() => {
            login('FOUNDER', true);
            setWorkspace('knowledge');
            transitionToApp();
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLogin={(roleOrProfile, isNewUser) => {
            login(roleOrProfile);
            setWorkspace('knowledge');
            transitionToApp();
            if (isNewUser) {
              const compName = typeof roleOrProfile === 'object' && roleOrProfile.company_name
                ? roleOrProfile.company_name
                : null;
              const companyKey = compName
                ? `tars_genesis_completed_${compName.toLowerCase().trim().replace(/\s+/g, '_')}`
                : null;
              if (companyKey) {
                localStorage.removeItem(companyKey);
              }
              localStorage.removeItem('tars_genesis_completed');
              if (compName) {
                setCompanyProfile({
                  id: (typeof roleOrProfile === 'object' && roleOrProfile.company_id) || `CMP-${Date.now()}`,
                  company_name: compName,
                  industry: 'B2B SaaS',
                  stage: 'Seed',
                  team_size: '1–5',
                  runway_months: 18,
                  one_liner: `${compName} sovereign intelligence workspace.`,
                  enterprise_policy: 'REJECT_CUSTOM_FORKS',
                  pricing_model: 'USAGE_BASED',
                  tars_tone: 'CONCISE_EXECUTIVE',
                });
              }
              setActionItems([]);
              setGenesisWizardOpen(true);
            }
          }}
          initialMode={authModalMode}
        />
      </div>
    );
  }

  return (
    <ErrorBoundary scopeName="TarsAppRoot" resetKey={isAuthenticated ? 'auth' : 'anon'}>
    <div
      className={`h-screen overflow-hidden transition-opacity duration-200 ease-in-out ${appVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ willChange: 'opacity' }}
    >
      {appNotice && (
        <div
          role="alert"
          className="fixed top-14 right-4 z-50 max-w-sm px-3.5 py-2.5 rounded-[12px] border border-amber-500/30 bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur shadow-lg flex items-center justify-between gap-3 text-xs"
        >
          <span className={appNotice.type === 'error' ? 'text-[#FF453A] font-medium' : 'text-amber-600 dark:text-amber-400 font-medium'}>
            {appNotice.message}
          </span>
          <button
            type="button"
            onClick={() => setAppNotice(null)}
            className="text-[#8E8E93] hover:text-black dark:hover:text-white font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}
    <AppShell
      currentWorkspace={workspace}
      onSelectWorkspace={handleSelectWorkspace}
      openActionHubCount={openTasksCount}
      onToggleActionHub={() => setActionHubOpen(true)}
      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenVoiceMemo={() => setVoiceMemoOpen(true)}
      onOpenOnboarding={() => setRoleOnboardingOpen(true)}
      onGoToLanding={() => transitionToLanding()}
      onOpenGenesis={() => setGenesisWizardOpen(true)}
      companyName={companyProfile?.company_name || profile.company_name}
      currentRole={currentRole}
      profile={profile}
      activeDomain={activeDomain}
      onSwitchRole={setRole}
      onSelectRole={setRole}
      onSelectUser={(u) => {
        login(u);
      }}
      onLogout={() => {
        logout();
        transitionToLanding();
      }}
      theme={theme}
      onToggleTheme={toggleTheme}

    >
      {/* Workspace Routing with Apple subtle fade transition & ErrorBoundary */}
      <ErrorBoundary scopeName={workspace} resetKey={workspace}>
      <div key={workspace} className={`animate-fade-in ${workspace === 'knowledge' ? 'h-full flex flex-col flex-1 min-h-0 overflow-hidden' : ''}`}>
        {workspace === 'knowledge' && (
          <KnowledgeWorkspace
            onOpenCitation={openCitation}
            userRole={currentRole}
            clearance={profile.clearance}
          />
        )}

        {workspace === 'calls' && (
          <CallStudioWorkspace
            activeCallId={activeCallId}
            onSelectCall={setActiveCallId}
            onPromoteAction={handlePromoteCommitment}
          />
        )}

        {workspace === 'onboarding' && (
          <OnboardingWorkspace
            userRole={currentRole}
            companyProfile={companyProfile}
            onOpenGenesis={() => setGenesisWizardOpen(true)}
            onOpenCitation={(title, snippet) =>
              openCitation({
                doc_id: 'DOC-FOUNDING',
                doc_title: title,
                page_number: 1,
                snippet,
              })
            }
          />
        )}

        {workspace === 'thinktank' && (
          <ThinkTankWorkspace
            currentUserName={profile?.name || 'User'}
            currentUserRole={currentRole || 'FOUNDER'}
            onNavigateDecision={(decId) => {
              setActiveDecisionId(decId);
              setWorkspace('decisions');
            }}
          />
        )}

        {workspace === 'decisions' && (
          <DecisionsWorkspace
            activeDecisionId={activeDecisionId}
            onSelectDecision={setActiveDecisionId}
          />
        )}

        {workspace === 'architecture' && (
          <ArchitectureWorkspace
            activeFindingId={activeFindingId}
            onSelectFinding={setActiveFindingId}
            onOpenCursorConfig={() => setCursorModalOpen(true)}
          />
        )}
      </div>
      </ErrorBoundary>

      {/* Global Unified Action Hub Drawer */}
      <ActionHubDrawer
        isOpen={actionHubOpen}
        onClose={() => setActionHubOpen(false)}
        actionItems={actionItems}
        currentUser={profile}
        onStatusChange={handleStatusChange}
        onNavigateSource={navigateToSource}
        onAddItem={handleCreateTask}
      />

      {/* Global Citation / Provenance Drawer */}
      <CitationDrawer
        isOpen={citationState.open}
        onClose={closeCitation}
        citation={citationState.citation}
      />

      {/* Global Command Palette (⌘K) */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigateWorkspace={handleSelectWorkspace}
        onOpenActionHub={() => setActionHubOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenMemo={() => setVoiceMemoOpen(true)}
        onOpenGenesis={() => setGenesisWizardOpen(true)}
        onSelectDecision={setActiveDecisionId}
        onSelectDocument={(id) => navigateToSource(id, 'DOC')}
      />

      {/* Host Settings & Genesis Cold Start Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onOpenGenesis={() => setGenesisWizardOpen(true)}
      />

      {/* 1-Click Cursor MCP Configuration Exporter Modal */}
      <CursorConfigModal
        isOpen={cursorModalOpen}
        onClose={() => setCursorModalOpen(false)}
      />

      {/* Mobile Voice Memo (/memo) Modal */}
      <VoiceMemoModal
        isOpen={voiceMemoOpen}
        onClose={() => setVoiceMemoOpen(false)}
        onMemoRecorded={handleMemoRecorded}
      />

      {/* Role-Adaptive Onboarding Modal (Shifted to Profile Options) */}
      <RoleOnboardingModal
        isOpen={roleOnboardingOpen}
        onClose={() => setRoleOnboardingOpen(false)}
        initialRole={currentRole}
        onOpenCitation={(title, snippet) =>
          openCitation({
            doc_id: 'DOC-FOUNDING',
            doc_title: title,
            page_number: 1,
            snippet,
          })
        }
      />

      {/* Sovereign Clearance Gate Modal */}
      <ClearanceGateModal
        isOpen={clearanceGateState.open}
        onClose={() => setClearanceGateState((prev) => ({ ...prev, open: false }))}
        requiredClearance={clearanceGateState.requiredClearance}
        targetWorkspaceName={clearanceGateState.targetWorkspaceName}
        currentProfile={profile}
        onSwitchToFounder={() => {
          setRole('FOUNDER');
          setWorkspace('decisions');
        }}
      />

      {/* TARS Genesis Onboarding Wizard (5-Step Sovereign Setup) */}
      <GenesisOnboardingWizard
        isOpen={genesisWizardOpen}
        onClose={() => setGenesisWizardOpen(false)}
        initialProfile={companyProfile}
        onComplete={(newProfile) => {
          const compName = newProfile?.company_name || profile?.company_name;
          const key = compName
            ? `tars_genesis_completed_${compName.toLowerCase().trim().replace(/\s+/g, '_')}`
            : 'tars_genesis_completed';
          localStorage.setItem(key, 'true');
          localStorage.setItem('tars_genesis_completed', 'true');
          const companyKey = `tars_company_onboarded_${newProfile.id || newProfile.company_name || 'default'}`;
          localStorage.setItem(companyKey, 'true');
          setOnboardingCompleted(true);
          setCompanyProfile(newProfile);
          setGenesisWizardOpen(false);
          // Persist user onboarding status to SQLite
          tarsClient.company.createUser({
            name: profile?.name || '',
            email: profile?.email || '',
            role: 'FOUNDER',
            department: 'Executive',
            clearance: 'EXECUTIVE_ONLY',
            company_name: newProfile.company_name || profile?.company_name || '',
            company_id: newProfile.id || profile?.company_id || undefined,
          }).catch((err: any) => {
            setAppNotice({ type: 'warning', message: err?.message || 'Unable to sync founder account record.' });
          });

          // Refresh tasks with freshly configured role-based flight-plans
          fetchActionItems();
        }}
      />
    </AppShell>
    </div>
    </ErrorBoundary>
  );
}


export default App;
