import React, { useState } from 'react';
import { WorkspaceId, UserRole, UserProfile } from '../../types/contracts';
import { WorkspaceDomain } from '../../state/useSessionStore';
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
  currentRole: UserRole;
  profile: UserProfile;
  activeDomain: WorkspaceDomain;
  onLogout: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onSwitchRole?: (role: UserRole) => void;
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
  currentRole,
  profile,
  activeDomain,
  onLogout,
  theme,
  onToggleTheme,
  onSwitchRole,
  children,
}) => {
  const [moreSheetOpen, setMoreSheetOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7] dark:bg-black text-black dark:text-white antialiased font-sans">
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
        currentRole={currentRole}
        profile={profile}
        activeDomain={activeDomain}
        onLogout={onLogout}
        theme={theme}
        onToggleTheme={onToggleTheme}
        onSwitchRole={onSwitchRole}
      />

      {/* Main Viewport */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-24 md:pb-10">
        {children}
      </main>

      {/* Mobile Tab Bar */}
      <MobileTabBar
        currentWorkspace={currentWorkspace}
        onSelectWorkspace={onSelectWorkspace}
        onOpenMore={() => setMoreSheetOpen(true)}
        moreActive={moreSheetOpen}
      />

      {/* Mobile "More" Sheet */}
      <Sheet
        isOpen={moreSheetOpen}
        onClose={() => setMoreSheetOpen(false)}
        title="Controls"
        subtitle="Quick tools and operator settings"
      >
        <div className="space-y-4">
          {/* Quick tools */}
          <div>
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
                <div className="w-8 h-8 rounded-[10px] bg-[#0071E3]/[0.10] dark:bg-[#0A84FF]/[0.12] flex items-center justify-center">
                  <Sliders className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
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
              <Shield className="w-3.5 h-3.5 text-[#1D8348] dark:text-[#30D158]" />
              <span className="font-mono">0.00 KB Egress</span>
            </div>
            <button
              onClick={onToggleTheme}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] border border-black/[0.09] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] text-[12px] font-medium text-black dark:text-white"
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
