import React, { useState, useEffect } from 'react';
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
import { api } from './services/client';


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

  useEffect(() => {
    if (!isAuthenticated) return;
    const targetComp = profile?.company_name || profile?.company_id || undefined;
    api.getActionItems().then((items) => setActionItems(items));
    api.getCompanyProfile(targetComp).then((prof) => {
      if (prof && prof.company_name) {
        setCompanyProfile(prof);
      } else {
        // If company_profile is unbloomed or empty for this company, check genesis completion
        const companyKey = profile?.company_name
          ? `tars_genesis_completed_${profile.company_name.toLowerCase().trim().replace(/\s+/g, '_')}`
          : 'tars_genesis_completed';
        const completed = localStorage.getItem(companyKey);
        if (!completed) {
          setGenesisWizardOpen(true);
        }
      }
    });
  }, [isAuthenticated, profile?.company_name, profile?.company_id]);

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
      const updated = await api.updateActionStatus(id, newStatus);
      setActionItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      console.error(err);
    }
  };

  const handlePromoteCommitment = async (commitmentText: string, callId: string, timestamp: string) => {
    try {
      const newItem = await api.createActionItem({
        description: commitmentText,
        owner: profile.name,
        deadline: Date.now() + 5 * 86400000,
        status: 'OPEN',
        source_type: 'CALL',
        source_id: callId,
        source_offset: timestamp,
      });
      setActionItems((prev) => [newItem, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateTask = async (task: Omit<ActionItemDTO, 'id'>) => {
    try {
      const newItem = await api.createActionItem(task);
      setActionItems((prev) => [newItem, ...prev]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleMemoRecorded = async (title: string, durationSec: number, transcript?: string) => {
    try {
      const desc = transcript && transcript.trim().length > 0
        ? `Voice Memo (${durationSec}s): "${transcript.slice(0, 120)}${transcript.length > 120 ? '...' : ''}"`
        : `Review recorded founder voice debrief (${durationSec}s)`;

      const newAction = await api.createActionItem({
        description: desc,
        owner: profile.name,
        deadline: Date.now() + 1 * 86400000,
        status: 'OPEN',
        source_type: 'CALL',
        source_id: 'Mobile /memo Debrief',
        source_offset: 'Just now',
      });
      setActionItems((prev) => [newAction, ...prev]);
    } catch (err) {
      console.error(err);
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
            login('FOUNDER');
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
    <div
      className={`transition-opacity duration-200 ease-in-out ${appVisible ? 'opacity-100' : 'opacity-0'}`}
      style={{ willChange: 'opacity' }}
    >
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
      {/* Workspace Routing with Apple subtle fade transition */}
      <div key={workspace} className="animate-fade-in">
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

      {/* Global Unified Action Hub Drawer */}
      <ActionHubDrawer
        isOpen={actionHubOpen}
        onClose={() => setActionHubOpen(false)}
        actionItems={actionItems}
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
          setCompanyProfile(newProfile);
          setGenesisWizardOpen(false);
          // Refresh tasks with freshly configured role-based flight-plans
          api.getActionItems().then((items) => setActionItems(items));
        }}
      />
    </AppShell>
    </div>
  );
}


export default App;
