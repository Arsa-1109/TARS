import React, { useState, useRef, useEffect } from 'react';
import { WorkspaceId, UserRole, UserProfile, UserDTO } from '../../types/contracts';
import { WorkspaceDomain, WORKSPACE_DOMAINS, ROLE_WORKSPACES } from '../../state/useSessionStore';
import { SegmentedControl } from '../primitives/SegmentedControl';
import {
  Shield,
  CheckSquare,
  Moon,
  Sun,
  ChevronDown,
  Layers,
  Phone,
  Compass,
  MessageSquare,
  Scale,
  Cpu,
  Search,
  Sliders,
  Mic,
  LogOut,
  ExternalLink,
  User,
  Sparkles,
} from 'lucide-react';

interface TopBarProps {
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
}

export const TopBar: React.FC<TopBarProps> = ({
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
}) => {
  const [profileOpen, setProfileOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileOpen]);

  const allWorkspaceOptions: Record<WorkspaceId, { value: WorkspaceId; label: string; icon: React.ReactNode }> = {
    knowledge:    { value: 'knowledge',    label: 'Knowledge',    icon: <Layers className="w-3.5 h-3.5" /> },
    calls:        { value: 'calls',        label: 'Calls',        icon: <Phone className="w-3.5 h-3.5" /> },
    decisions:    { value: 'decisions',    label: 'Decisions',    icon: <Scale className="w-3.5 h-3.5" /> },
    architecture: { value: 'architecture', label: 'Architecture', icon: <Cpu className="w-3.5 h-3.5" /> },
    thinktank:    { value: 'thinktank',   label: 'Discussions',  icon: <MessageSquare className="w-3.5 h-3.5" /> },
    onboarding:   { value: 'onboarding',  label: 'Onboarding',   icon: <Compass className="w-3.5 h-3.5" /> },
  };

  const allowedWorkspaces = ROLE_WORKSPACES[currentRole] || ['knowledge', 'calls', 'decisions', 'architecture', 'thinktank', 'onboarding'];
  const filteredOptions = allowedWorkspaces
    .map((wsId) => allWorkspaceOptions[wsId])
    .filter(Boolean);

  const roleLabel = profile.role === 'FOUNDER' ? 'Founder & CEO' : `${profile.role} · ${profile.department}`;

  return (
    <header className="sticky top-0 z-30 h-[52px] flex items-center justify-between px-5 shrink-0 select-none transition-colors bg-white/80 dark:bg-black/80 backdrop-blur-2xl border-b border-black/[0.08] dark:border-white/[0.08]">

      {/* Leading: Clean Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onGoToLanding}
          className="flex items-center gap-2.5 group focus:outline-none"
          title="Return to Overview"
        >
          <img
            src="/tars-logo.jpg"
            alt="TARS Logo"
            className="w-7 h-7 rounded-[8px] object-cover shadow-sm transition-transform active:scale-95 border border-black/10 dark:border-white/10"
          />
          <span className="font-semibold text-[14px] tracking-tight text-black dark:text-white">
            TARS
          </span>
        </button>

        {companyName && (
          <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-black/[0.1] dark:border-white/[0.1]">
            <span className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] max-w-[130px] truncate" title={companyName}>
              {companyName}
            </span>
          </div>
        )}

        {onOpenGenesis && (
          <button
            onClick={onOpenGenesis}
            className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[10px] font-semibold text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/10 hover:bg-[#0071E3]/15 transition-colors border border-[#0071E3]/20"
            title="Launch Genesis Onboarding Wizard"
          >
            <Sparkles className="w-2.5 h-2.5" />
            <span>Genesis</span>
          </button>
        )}
      </div>


      {/* Center: Workspace nav */}
      <div className="flex items-center justify-center flex-1 px-2 sm:px-4 md:px-6 min-w-0 overflow-x-auto">
        <SegmentedControl
          size="sm"
          options={filteredOptions}
          value={currentWorkspace}
          onChange={onSelectWorkspace}
        />
      </div>

      {/* Trailing: Controls */}
      <div className="flex items-center gap-1.5 shrink-0">

        {/* Search / Command Palette */}
        <button
          onClick={onOpenCommandPalette}
          className="inline-flex items-center gap-2 px-2.5 h-8 rounded-[10px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-all text-xs font-medium"
          title="Search (⌘K)"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden xl:inline text-[11px]">Search...</span>
          <kbd className="hidden sm:inline text-[10px] font-mono px-1 py-px rounded-[4px] bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.10] text-[#6E6E73] dark:text-[#8E8E93]">
            ⌘K
          </kbd>
        </button>

        {/* Voice memo */}
        <button
          onClick={onOpenVoiceMemo}
          className="h-8 w-8 rounded-[10px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-all flex items-center justify-center"
          title="Record Voice Memo"
        >
          <Mic className="w-3.5 h-3.5" />
        </button>

        {/* Action items */}
        <button
          onClick={onToggleActionHub}
          className="relative inline-flex items-center gap-1.5 px-2.5 h-8 rounded-[10px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] text-[#3C3C43] dark:text-[#EBEBF5] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-all text-xs font-medium"
          title="Action Hub"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-[12px]">Tasks</span>
          {openActionHubCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center tabular-nums">
              {openActionHubCount}
            </span>
          )}
        </button>

        {/* Company Setup direct button */}
        <button
          onClick={onOpenSettings}
          className="h-8 w-8 rounded-[10px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-all flex items-center justify-center"
          title="Company Setup & Preferences"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>

        {/* Profile dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setProfileOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 px-2 h-8 rounded-[10px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-all"
          >
            <div className="w-5 h-5 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-[10px] font-bold">
              {profile.name.charAt(0)}
            </div>
            <span className="text-[12px] font-semibold text-black dark:text-white hidden sm:inline">
              {profile.name.split(' ')[0]}
            </span>
            <ChevronDown className={`w-3 h-3 text-[#8E8E93] transition-transform duration-200 ${profileOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* Profile dropdown panel */}
          {profileOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-60 z-50 animate-apple-in">
              <div className="rounded-[18px] overflow-hidden border border-black/[0.10] dark:border-white/[0.14] bg-white dark:bg-[#1C1C1E] shadow-[0_16px_44px_rgba(0,0,0,0.18)] dark:shadow-[0_16px_44px_rgba(0,0,0,0.72)]">

                {/* User card */}
                <div className="p-3.5 border-b border-black/[0.07] dark:border-white/[0.07]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center text-sm font-bold shrink-0">
                      {profile.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-black dark:text-white truncate leading-tight">
                        {profile.name}
                      </div>
                      <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate mt-0.5">
                        {roleLabel}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                    <span>Clearance</span>
                    <span className="font-medium text-[#3C3C43] dark:text-[#EBEBF5]">
                      {profile.clearance === 'EXECUTIVE_ONLY' ? 'Executive (Level 3)' : 'Team (Level 2)'}
                    </span>
                  </div>
                </div>


                {/* Menu items */}
                <div className="p-1.5 space-y-0.5">
                  {onOpenGenesis && (
                    <button
                      onClick={() => { onOpenGenesis(); setProfileOpen(false); }}
                      className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-[8px] bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF] flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-[12px] font-medium text-black dark:text-white flex items-center gap-1.5">
                          <span>Genesis Wizard</span>
                          <span className="text-[9px] font-mono px-1 rounded bg-[#0071E3]/15 text-[#0071E3] dark:text-[#0A84FF]">Setup</span>
                        </div>
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Company identity & seed</div>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={() => { onOpenOnboarding(); setProfileOpen(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0 text-[#3C3C43] dark:text-[#EBEBF5]">
                      <Compass className="w-3.5 h-3.5" />
                    </div>

                    <div>
                      <div className="text-[12px] font-medium text-black dark:text-white">Onboarding Guide</div>
                      <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">14-day flight plan</div>
                    </div>
                  </button>

                  <button
                    onClick={() => { onOpenSettings(); setProfileOpen(false); }}
                    className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-[10px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors"
                  >
                    <div className="w-7 h-7 rounded-[8px] bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center shrink-0 text-[#3C3C43] dark:text-[#EBEBF5]">
                      <Sliders className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-black dark:text-white">Company Setup</div>
                      <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">Genesis & configuration</div>
                    </div>
                  </button>
                </div>

                {/* Divider */}
                <div className="mx-3 border-t border-black/[0.07] dark:border-white/[0.07]" />

                {/* Footer actions */}
                <div className="p-1.5 space-y-0.5">
                  <button
                    onClick={() => { onGoToLanding(); setProfileOpen(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-[10px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors text-[12px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Product Overview</span>
                  </button>

                  <button
                    onClick={() => { onLogout(); setProfileOpen(false); }}
                    className="w-full text-left flex items-center gap-2 px-3 py-2 rounded-[10px] hover:bg-[#FF453A]/[0.08] dark:hover:bg-[#FF453A]/[0.10] transition-colors text-[12px] text-[#C0392B] dark:text-[#FF453A]"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={onToggleTheme}
          className="h-8 w-8 rounded-[10px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.03] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.10] transition-all flex items-center justify-center"
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
        </button>
      </div>
    </header>
  );
};
