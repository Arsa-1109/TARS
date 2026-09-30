import React, { useState } from 'react';
import { WorkspaceId, UserRole, UserProfile } from '../../types/contracts';
import { WorkspaceDomain, ROLE_WORKSPACES } from '../../state/useSessionStore';
import { TopBar } from './TopBar';
import { MobileTabBar } from './MobileTabBar';
import { Sheet } from '../primitives/Sheet';
import {
  Moon,
  Sun,
  Shield,
  Sliders,
  Mic,
  LogOut,
} from 'lucide-react';

interface AppShellProps {
  currentWorkspace: WorkspaceId;
  onSelectWorkspace: (ws: WorkspaceId) => void;
  openActionHubCount: number;
  onToggleActionHub: () => void;
  onOpenCommandPalette: () => void;
  onOpenSettings: () => void;
  onOpenVoiceMemo: () => void;
  onOpenOnboarding: () => void;
  onGoToLanding: () => void;
  onOpenGenesis?: () => void;
  companyName?: string;
  currentRole: UserRole;
  profile: UserProfile;
  activeDomain: WorkspaceDomain;
  onSwitchRole?: (role: UserRole) => void;
  onSelectRole?: (role: UserRole) => void;
  onSelectUser?: (user: UserProfile) => void;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentWorkspace,
  onSelectWorkspace,
  openActionHubCount,
  onToggleActionHub,
  onOpenCommandPalette,
  onOpenSettings,
  onOpenVoiceMemo,
  onOpenOnboarding,
  onGoToLanding,
  onOpenGenesis,
  companyName,
  currentRole,
  profile,
  activeDomain,
  onSwitchRole,
  onSelectRole,
  onSelectUser,
  onLogout,
  theme,
  onToggleTheme,
  children,
}) => {
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-[#F7F7F8] dark:bg-[#090A0D] text-black dark:text-white antialiased font-sans">
      {/* Top Application Bar */}
      <TopBar
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        openActionHubCount={openActionHubCount}
        onToggleActionHub={onToggleActionHub}
        onOpenCommandPalette={onOpenCommandPalette}
        onOpenSettings={onOpenSettings}
        onOpenVoiceMemo={onOpenVoiceMemo}
        onOpenOnboarding={onOpenOnboarding}
        onGoToLanding={onGoToLanding}
        onOpenGenesis={onOpenGenesis}
        companyName={companyName}
        currentRole={currentRole}
        profile={profile}
        activeDomain={activeDomain}
        onSwitchRole={onSwitchRole}
        onSelectRole={onSelectRole}
        onSelectUser={onSelectUser}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
      />


      {/* Main Viewport */}
      <main className={`flex-1 w-full min-h-0 ${
        currentWorkspace === 'knowledge' || currentWorkspace === 'calls' || currentWorkspace === 'thinktank'
          ? 'h-[calc(100vh-48px)] overflow-hidden flex flex-col'
          : 'h-[calc(100vh-48px)] overflow-y-auto'
      }`}>
        <div className={`w-full mx-auto ${
          currentWorkspace === 'knowledge' || currentWorkspace === 'calls' || currentWorkspace === 'thinktank'
            ? 'h-full flex flex-col flex-1 min-h-0 overflow-hidden max-w-[1600px] px-3 sm:px-5 lg:px-6 py-2.5 pb-20 md:pb-3'
            : 'max-w-[1600px] px-3 sm:px-5 lg:px-6 py-3 pb-20 md:pb-6'
        }`}>
          {children}
        </div>
      </main>

      {/* Mobile Tab Bar */}
      <MobileTabBar
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        onOpenMore={() => setMoreSheetOpen(true)}
        moreActive={moreSheetOpen}
        currentRole={currentRole}
      />

      {/* Mobile "More" Sheet */}
      <Sheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Controls"
        subtitle="Quick tools and operator settings"
      >
        <div className="space-y-4">
          {/* Workspaces & Quick tools */}
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
              Permitted Workspaces
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {(ROLE_WORKSPACES[currentRole] || []).map((wsId) => {
                const labels: Record<WorkspaceId, { label: string; icon: string }> = {
                  knowledge:    { label: 'Knowledge Base', icon: '📚' },
                  calls:        { label: 'Client Calls',   icon: '📞' },
                  decisions:    { label: 'Decisions',      icon: '⚖️' },
                  architecture: { label: 'Architecture',   icon: '🏛️' },
                  thinktank:    { label: 'Discussions',    icon: '💬' },
                  onboarding:   { label: 'Flight Plan',    icon: '🧭' },
                };
                const info = labels[wsId];
                if (!info) return null;
                const isCurrent = currentWorkspace === wsId;
                return (
                  <button
                    key={wsId}
                    onClick={() => {
                      setMoreSheetOpen(false);
                      onSelectWorkspace(wsId);
                    }}
                    className={`p-3 rounded-[14px] border text-left flex items-center gap-2.5 transition-colors ${
                      isCurrent
                        ? 'border-black/20 dark:border-white/20 bg-black/5 dark:bg-white/10 font-semibold'
                        : 'border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E]'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-black/5 dark:bg-white/10 flex items-center justify-center shrink-0">
                      <span className="text-xs">{info.icon}</span>
                    </div>
                    <span className="text-[13px] text-black dark:text-white truncate">{info.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
              Quick Tools
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => { setMoreSheetOpen(false); onOpenVoiceMemo(); }}
                className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex items-center gap-2.5 text-left"
              >
                <div className="w-8 h-8 rounded-[10px] bg-[#FF9500]/[0.12] flex items-center justify-center">
                  <Mic className="w-4 h-4 text-[#B25000] dark:text-[#FF9F0A]" />
                </div>
                <span className="text-[13px] font-medium text-black dark:text-white">Voice Memo</span>
              </button>

              <button
                onClick={() => { setMoreSheetOpen(false); onOpenSettings(); }}
                className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex items-center gap-2.5 text-left"
              >
                <div className="w-8 h-8 rounded-[10px] bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-black dark:text-white" />
                </div>
                <span className="text-[13px] font-medium text-black dark:text-white">Setup</span>
              </button>
            </div>
          </div>

          {/* Operator card */}
          <div>
            <div className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wider mb-2">
              Operator
            </div>
            <div className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-bold">
                  {profile.name.charAt(0)}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-black dark:text-white">{profile.name}</div>
                  <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                    {profile.role === 'FOUNDER' ? 'Founder & CEO' : profile.role}
                  </div>
                </div>
              </div>
              <button
                onClick={() => { setMoreSheetOpen(false); onLogout(); }}
                className="px-3 py-1.5 text-[12px] font-medium rounded-[8px] text-[#C0392B] dark:text-[#FF453A] bg-[#FF3B30]/[0.08] hover:bg-[#FF3B30]/[0.12] transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>

          {/* Footer controls */}
          <div className="pt-2 flex items-center justify-between border-t border-black/[0.07] dark:border-white/[0.07]">
            <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
              <Shield className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
              <span className="font-mono">0.00 KB Egress</span>
            </div>
            <button
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] text-[12px] font-medium text-black dark:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04] transition-colors"
            >
              {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
              <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
            </button>
          </div>
        </div>
      </Sheet>
    </div>
  );
};
