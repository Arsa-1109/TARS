import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Layers,
  Phone,
  Compass,
  MessageSquare,
  Scale,
  Cpu,
  CheckSquare,
  Sliders,
  Mic,
  ArrowRight,
  Shield,
  X,
} from 'lucide-react';
import { WorkspaceId } from '../../types/contracts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateWorkspace: (ws: WorkspaceId) => void;
  onOpenActionHub: () => void;
  onOpenSettings: () => void;
  onOpenMemo: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateWorkspace,
  onOpenActionHub,
  onOpenSettings,
  onOpenMemo,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
      if (e.key === 'ArrowDown' && isOpen) {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % filtered.length);
      }
      if (e.key === 'ArrowUp' && isOpen) {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
      }
      if (e.key === 'Enter' && isOpen && filtered[activeIndex]) {
        filtered[activeIndex].action();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeIndex]);

  const quickActions = [
    { id: 'knowledge',    title: 'Knowledge Base',           category: 'Workspace', icon: <Layers className="w-4 h-4" />,       action: () => { onNavigateWorkspace('knowledge');    onClose(); } },
    { id: 'calls',        title: 'Call Studio',              category: 'Workspace', icon: <Phone className="w-4 h-4" />,        action: () => { onNavigateWorkspace('calls');        onClose(); } },
    { id: 'decisions',    title: 'Decision Registry',        category: 'Workspace', icon: <Scale className="w-4 h-4" />,        action: () => { onNavigateWorkspace('decisions');    onClose(); } },
    { id: 'architecture', title: 'Architecture Cortex',      category: 'Workspace', icon: <Cpu className="w-4 h-4" />,          action: () => { onNavigateWorkspace('architecture'); onClose(); } },
    { id: 'thinktank',    title: 'Think Tank Discussions',   category: 'Workspace', icon: <MessageSquare className="w-4 h-4" />, action: () => { onNavigateWorkspace('thinktank');   onClose(); } },
    { id: 'onboarding',   title: 'Onboarding Flight Plan',   category: 'Workspace', icon: <Compass className="w-4 h-4" />,      action: () => { onNavigateWorkspace('onboarding');  onClose(); } },
    { id: 'action-hub',  title: 'Open Action Hub',          category: 'Task',      icon: <CheckSquare className="w-4 h-4 text-[#1D8348] dark:text-[#30D158]" />, action: () => { onOpenActionHub(); onClose(); } },
    { id: 'memo',         title: 'Record Voice Memo',        category: 'Capture',   icon: <Mic className="w-4 h-4 text-[#B25000] dark:text-[#FF9F0A]" />,         action: () => { onOpenMemo();       onClose(); } },
    { id: 'settings',     title: 'Company Setup',            category: 'System',    icon: <Sliders className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93]" />,     action: () => { onOpenSettings();   onClose(); } },
  ];

  const filtered = quickActions.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 animate-fade-in">
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[4px]"
        onClick={onClose}
      />

      {/* Spotlight card */}
      <div className="relative w-full max-w-[540px] z-10 animate-apple-in overflow-hidden rounded-[22px] border border-black/[0.10] dark:border-white/[0.14] bg-white dark:bg-[#1C1C1E] shadow-[0_24px_60px_rgba(0,0,0,0.24),0_4px_12px_rgba(0,0,0,0.10)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.80)]">

        {/* Specular highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 dark:via-white/20 to-transparent pointer-events-none" />

        {/* Search input */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/[0.08] dark:border-white/[0.09]">
          <Search className="w-5 h-5 text-[#6E6E73] dark:text-[#8E8E93] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Search workspaces, commands, or documents..."
            className="flex-1 bg-transparent text-[15px] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
          />
          {query ? (
            <button
              onClick={() => setQuery('')}
              className="w-5 h-5 rounded-full bg-[#8E8E93]/30 flex items-center justify-center text-[#6E6E73] hover:bg-[#8E8E93]/50 transition-colors shrink-0 ml-2"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="hidden sm:flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-[5px] bg-black/[0.06] dark:bg-white/[0.08] border border-black/[0.08] dark:border-white/[0.10] text-[#8E8E93] shrink-0 ml-2">
              ESC
            </kbd>
          )}
        </div>

        {/* Results */}
        <div className="max-h-72 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#8E8E93]">
              No results for "{query}"
            </div>
          ) : (
            <>
              {/* Group by category */}
              {['Workspace', 'Task', 'Capture', 'System'].map((cat) => {
                const items = filtered.filter((i) => i.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] font-mono">
                      {cat}
                    </div>
                    {items.map((item) => {
                      const idx = filtered.indexOf(item);
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={[
                            'w-full px-3 py-2.5 rounded-[12px] text-left flex items-center justify-between transition-colors mb-0.5',
                            isActive
                              ? 'bg-black/[0.05] dark:bg-white/[0.07]'
                              : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-[10px] bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center shrink-0 text-[#3C3C43] dark:text-[#EBEBF5]">
                              {item.icon}
                            </div>
                            <span className="text-[13px] font-medium text-black dark:text-white truncate">
                              {item.title}
                            </span>
                          </div>
                          <ArrowRight className={`w-3.5 h-3.5 shrink-0 ml-2 transition-all ${isActive ? 'text-black dark:text-white translate-x-0.5' : 'text-[#AEAEB2]'}`} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-black/[0.07] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-[#8E8E93] font-mono">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-[#1D8348] dark:text-[#30D158]" />
            <span>0.00 KB Egress · Air-Gapped</span>
          </div>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
          </div>
        </div>
      </div>
    </div>
  );
};
