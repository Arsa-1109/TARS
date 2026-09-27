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
import { useSessionStore, WORKSPACE_DOMAINS } from './state/useSessionStore';
import { useThemeStore } from './state/useThemeStore';
import { useNavigationStore } from './state/useNavigationStore';
import { ActionItemDTO, WorkspaceId } from './types/contracts';
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

  const [actionItems, setActionItems] = useState<ActionItemDTO[]>([]);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceMemoOpen, setVoiceMemoOpen] = useState(false);

  useEffect(() => {
    api.getActionItems().then((items) => setActionItems(items));
  }, []);

  // Update landing view state if authentication status changes
  useEffect(() => {
    if (!isAuthenticated) {
      setShowLanding(true);
    }
  }, [isAuthenticated]);

  // Enforce domain containment: ensure current workspace is always within activeDomain's allowed workspaces
  useEffect(() => {
    const domainCfg = WORKSPACE_DOMAINS[activeDomain];
    if (domainCfg && !domainCfg.allowedWorkspaces.includes(workspace)) {
      setWorkspace(domainCfg.allowedWorkspaces[0]);
    }
  }, [activeDomain, workspace, setWorkspace]);

  // When domain changes, ensure current workspace is allowed in that domain
  const handleDomainChange = (domainId: typeof activeDomain) => {
    switchDomain(domainId);
    const domainCfg = WORKSPACE_DOMAINS[domainId];
    if (domainCfg && !domainCfg.allowedWorkspaces.includes(workspace)) {
      setWorkspace(domainCfg.allowedWorkspaces[0]);
    }
  };

  // Safe workspace selection with Clearance Gates (Workspace Isolation)
  const handleSelectWorkspace = (targetWs: WorkspaceId) => {
    const access = canAccessWorkspace(targetWs);
    if (!access.allowed) {
      setClearanceGateState({
        open: true,
        targetWorkspaceName: targetWs === 'decisions' ? 'Strategic Decision Registry' : targetWs,
        requiredClearance: 'EXECUTIVE_ONLY (Level 3)',
      });
      return;
    }
    const currentDomainCfg = WORKSPACE_DOMAINS[activeDomain];
    if (currentDomainCfg && !currentDomainCfg.allowedWorkspaces.includes(targetWs)) {
      const targetDomainEntry = Object.values(WORKSPACE_DOMAINS).find(
        (d) => d.allowedWorkspaces.includes(targetWs) && d.allowedRoles.includes(currentRole)
      );
      if (targetDomainEntry) {
        switchDomain(targetDomainEntry.id);
      }
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

  const handleMemoRecorded = async (title: string, durationSec: number) => {
    try {
      const newAction = await api.createActionItem({
        description: `Review recorded founder voice debrief (${durationSec}s)`,
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
      <>
        <LandingPage
          onOpenAuth={(mode = 'signin') => {
            setAuthModalMode(mode);
            setAuthModalOpen(true);
          }}
          onLaunchDemo={() => {
            login('FOUNDER');
            setShowLanding(false);
          }}
          theme={theme}
          onToggleTheme={toggleTheme}
        />

        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
          onLogin={(role) => {
            login(role);
            setShowLanding(false);
          }}
          initialMode={authModalMode}
        />
      </>
    );
  }

  return (
    <AppShell
      currentWorkspace={workspace}
      onSelectWorkspace={handleSelectWorkspace}
      openActionHubCount={openTasksCount}
      onToggleActionHub={() => setActionHubOpen(true)}
      onOpenCommandPalette={() => setCommandPaletteOpen(true)}
      onOpenSettings={() => setSettingsOpen(true)}
      onOpenVoiceMemo={() => setVoiceMemoOpen(true)}
      onOpenOnboarding={() => setRoleOnboardingOpen(true)}
      onGoToLanding={() => setShowLanding(true)}
      currentRole={currentRole}
      profile={profile}
      activeDomain={activeDomain}
      onSwitchRole={setRole}
      onLogout={() => {
        logout();
        setShowLanding(true);
      }}
      theme={theme}
      onToggleTheme={toggleTheme}
    >
      {/* Workspace Routing */}
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
        />
      )}

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
      />

      {/* Host Settings & Genesis Cold Start Modal */}
      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
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
    </AppShell>
  );
}

export default App;
