import React from 'react';
import { WorkspaceId, UserRole } from '../../types/contracts';
import { ROLE_WORKSPACES } from '../../state/useSessionStore';
import { Layers, Phone, MessageSquare, Scale, Cpu, Compass, MoreHorizontal } from 'lucide-react';

interface MobileTabBarProps {
  currentWorkspace: WorkspaceId;
  onSelectWorkspace: (ws: WorkspaceId) => void;
  onOpenMore: () => void;
  moreActive?: boolean;
  currentRole: UserRole;
}

export const MobileTabBar: React.FC<MobileTabBarProps> = ({
  currentWorkspace,
  onSelectWorkspace,
  onOpenMore,
  moreActive = false,
  currentRole,
}) => {
  const allTabs: { id: WorkspaceId; label: string; icon: React.ReactNode }[] = [
    { id: 'knowledge',    label: 'Knowledge', icon: <Layers className="w-5 h-5" /> },
    { id: 'calls',        label: 'Calls',     icon: <Phone className="w-5 h-5" /> },
    { id: 'thinktank',    label: 'Discuss',   icon: <MessageSquare className="w-5 h-5" /> },
    { id: 'decisions',    label: 'Decisions', icon: <Scale className="w-5 h-5" /> },
    { id: 'architecture', label: 'Arch',      icon: <Cpu className="w-5 h-5" /> },
    { id: 'onboarding',   label: 'Flight',    icon: <Compass className="w-5 h-5" /> },
  ];

  const allowed = ROLE_WORKSPACES[currentRole] || ['knowledge', 'thinktank', 'onboarding'];
  // Keep up to 4 primary tabs for the user's role on the bottom bar, plus the More tab
  const tabs = allTabs.filter((t) => allowed.includes(t.id)).slice(0, 4);

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 safe-bottom select-none bg-white/90 dark:bg-[#1C1C1E]/92 backdrop-saturate-180 backdrop-blur-[20px] border-t border-black/[0.08] dark:border-white/[0.10]"
      role="navigation"
      aria-label="Mobile Navigation"
    >
      <div className="grid grid-cols-5 h-14 items-center px-1">
        {tabs.map((tab) => {
          const isActive = currentWorkspace === tab.id && !moreActive;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectWorkspace(tab.id)}
              className="flex flex-col items-center justify-center h-full min-h-[44px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.92] focus-visible:outline-none gap-0.5"
            >
              <div className={[
                'w-8 h-8 rounded-[10px] flex items-center justify-center transition-all duration-200',
                isActive
                  ? 'bg-black/[0.07] dark:bg-white/[0.10] scale-105'
                  : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
              ].join(' ')}>
                <span className={isActive ? 'text-black dark:text-white' : 'text-[#8E8E93]'}>
                  {tab.icon}
                </span>
              </div>
              <span className={[
                'text-[10px] tracking-tight leading-none transition-colors',
                isActive ? 'text-black dark:text-white font-semibold' : 'text-[#8E8E93]',
              ].join(' ')}>
                {tab.label}
              </span>
            </button>
          );
        })}

        {/* More Tab */}
        <button
          onClick={onOpenMore}
          className="flex flex-col items-center justify-center h-full min-h-[44px] transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-[0.92] focus-visible:outline-none gap-0.5"
        >
          <div className={[
            'w-8 h-8 rounded-[10px] flex items-center justify-center transition-all',
            moreActive || ['onboarding', 'architecture'].includes(currentWorkspace)
              ? 'bg-black/[0.07] dark:bg-white/[0.10]'
              : '',
          ].join(' ')}>
            <MoreHorizontal className={[
              'w-5 h-5',
              moreActive || ['onboarding', 'architecture'].includes(currentWorkspace)
                ? 'text-black dark:text-white'
                : 'text-[#8E8E93]',
            ].join(' ')} />
          </div>
          <span className={[
            'text-[10px] tracking-tight leading-none',
            moreActive ? 'text-black dark:text-white font-semibold' : 'text-[#8E8E93]',
          ].join(' ')}>
            More
          </span>
        </button>
      </div>
    </nav>
  );
};
