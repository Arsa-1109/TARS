import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Search,
  Layers,
  Phone,
  Compass,
  MessageSquare,
  Scale,
  CheckSquare,
  Sliders,
  Mic,
  ArrowRight,
  Shield,
  X,
  Sparkles,
  FileText,
  Loader2,
} from 'lucide-react';
import { WorkspaceId } from '../../types/contracts';
import { commandPaletteApi, SearchResultGroup } from '../../services/commandPaletteApi';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateWorkspace: (ws: WorkspaceId) => void;
  onOpenActionHub: () => void;
  onOpenSettings: () => void;
  onOpenMemo: () => void;
  onOpenGenesis?: () => void;
  onOpenAuditLedger?: () => void;
  onOpenGovernance?: () => void;
  onSelectDecision?: (id: string) => void;
  onSelectDocument?: (id: string) => void;
}

interface PaletteActionItem {
  id: string;
  title: string;
  category: string;
  subtitle?: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ReactNode;
  action: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigateWorkspace,
  onOpenActionHub,
  onOpenSettings,
  onOpenMemo,
  onOpenGenesis,
  onOpenAuditLedger,
  onOpenGovernance,
  onSelectDecision,
  onSelectDocument,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [federatedGroups, setFederatedGroups] = useState<SearchResultGroup[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActiveIndex(0);
      setFederatedGroups([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Execute debounced federated search when query changes
  useEffect(() => {
    if (!isOpen) return;

    if (!query.trim()) {
      setFederatedGroups([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    let isCancelled = false;

    commandPaletteApi
      .searchFederated(query)
      .then((groups) => {
        if (!isCancelled) {
          setFederatedGroups(groups);
          setActiveIndex(0);
        }
      })
      .catch(() => {
        if (!isCancelled) setFederatedGroups([]);
      })
      .finally(() => {
        if (!isCancelled) setIsLoading(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [query, isOpen]);

  const quickActions: PaletteActionItem[] = [
    {
      id: 'genesis-wizard',
      title: 'TARS Genesis Onboarding Wizard',
      category: 'Genesis',
      subtitle: '5-Step Sovereign Setup & Company Flight Plan',
      icon: <Sparkles className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />,
      action: () => {
        if (onOpenGenesis) onOpenGenesis();
        else onOpenSettings();
        onClose();
      },
    },
    {
      id: 'knowledge',
      title: 'Knowledge Base',
      category: 'Workspace',
      subtitle: 'Institutional document lake & semantic search',
      icon: <Layers className="w-4 h-4" />,
      action: () => {
        onNavigateWorkspace('knowledge');
        onClose();
      },
    },
    {
      id: 'calls',
      title: 'Call Studio',
      category: 'Workspace',
      subtitle: 'Audio intelligence & customer commitment extraction',
      icon: <Phone className="w-4 h-4" />,
      action: () => {
        onNavigateWorkspace('calls');
        onClose();
      },
    },
    {
      id: 'decisions',
      title: 'Decision Registry',
      category: 'Workspace',
      subtitle: 'Living MADRs & What-If financial simulations',
      icon: <Scale className="w-4 h-4" />,
      action: () => {
        onNavigateWorkspace('decisions');
        onClose();
      },
    },
    {
      id: 'thinktank',
      title: 'Think Tank Discussions',
      category: 'Workspace',
      subtitle: 'Institutional memory co-pilot & strategy chat',
      icon: <MessageSquare className="w-4 h-4" />,
      action: () => {
        onNavigateWorkspace('thinktank');
        onClose();
      },
    },
    {
      id: 'onboarding',
      title: 'Onboarding Flight Plan',
      category: 'Workspace',
      subtitle: 'Role-based ramp-up guides & architectural primers',
      icon: <Compass className="w-4 h-4" />,
      action: () => {
        onNavigateWorkspace('onboarding');
        onClose();
      },
    },
    {
      id: 'action-hub',
      title: 'Open Action Hub',
      category: 'Task',
      subtitle: 'Track team commitments and extracted client action items',
      icon: <CheckSquare className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />,
      action: () => {
        onOpenActionHub();
        onClose();
      },
    },
    {
      id: 'memo',
      title: 'Record Voice Memo',
      category: 'Capture',
      subtitle: 'Instant offline audio transcription and task synthesis',
      icon: <Mic className="w-4 h-4 text-[#B25000] dark:text-[#FF9F0A]" />,
      action: () => {
        onOpenMemo();
        onClose();
      },
    },
    {
      id: 'audit-ledger',
      title: 'Audit Trail',
      category: 'Security',
      subtitle: 'View activity history and verify system records',
      icon: <Shield className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />,
      action: () => {
        if (onOpenAuditLedger) onOpenAuditLedger();
        onClose();
      },
    },
    {
      id: 'governance-policies',
      title: 'Review & Security Policies',
      category: 'Security',
      subtitle: 'Review pending facts and test access control policies',
      icon: <Scale className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />,
      action: () => {
        if (onOpenGovernance) onOpenGovernance();
        onClose();
      },
    },
    {
      id: 'settings',
      title: 'Company Setup',
      category: 'System',
      subtitle: 'Configure company profile, clearance levels & sovereign storage',
      icon: <Sliders className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93]" />,
      action: () => {
        onOpenSettings();
        onClose();
      },
    },
  ];

  // Map federated search results into palette action items
  const federatedActionItems = useMemo<Record<string, PaletteActionItem[]>>(() => {
    const map: Record<string, PaletteActionItem[]> = {};

    federatedGroups.forEach((group) => {
      const categoryName =
        group.category === 'Decisions'
          ? 'Decisions (Kùzu DB)'
          : group.category === 'Documents'
          ? 'Documents (Knowledge Lake)'
          : 'Action Items (SQLite)';

      map[categoryName] = group.items.map((item) => {
        let icon = <FileText className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />;
        if (group.category === 'Decisions') {
          icon = <Scale className="w-4 h-4 text-[#30D158]" />;
        } else if (group.category === 'Action Items') {
          icon = <CheckSquare className="w-4 h-4 text-[#FF9500]" />;
        }

        return {
          id: item.id,
          title: item.title,
          category: categoryName,
          subtitle: item.subtitle,
          badge: item.badge,
          badgeColor: item.badgeColor,
          icon,
          action: () => {
            if (item.targetWorkspace === 'decisions' && onSelectDecision && item.targetId) {
              onSelectDecision(item.targetId);
            } else if (item.targetWorkspace === 'knowledge' && onSelectDocument && item.targetId) {
              onSelectDocument(item.targetId);
            }
            if (item.targetWorkspace) {
              onNavigateWorkspace(item.targetWorkspace);
            }
            onClose();
          },
        };
      });
    });

    return map;
  }, [federatedGroups, onNavigateWorkspace, onClose, onSelectDecision, onSelectDocument]);

  // Filter local actions by query
  const filteredQuickActions = useMemo(() => {
    if (!query.trim()) return quickActions;
    const lower = query.toLowerCase();
    return quickActions.filter(
      (item) =>
        item.title.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(lower))
    );
  }, [query, quickActions]);

  // Build flattened list of all visible items for index-based keyboard navigation
  const flatItems = useMemo<PaletteActionItem[]>(() => {
    const list: PaletteActionItem[] = [];

    // Add federated items first if query is present
    Object.values(federatedActionItems).forEach((items) => {
      list.push(...items);
    });

    // Add matching quick actions
    list.push(...filteredQuickActions);

    return list;
  }, [federatedActionItems, filteredQuickActions]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
      if (e.key === 'ArrowDown' && isOpen) {
        e.preventDefault();
        if (flatItems.length > 0) {
          setActiveIndex((prev) => (prev + 1) % flatItems.length);
        }
      }
      if (e.key === 'ArrowUp' && isOpen) {
        e.preventDefault();
        if (flatItems.length > 0) {
          setActiveIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
        }
      }
      if (e.key === 'Enter' && isOpen && flatItems[activeIndex]) {
        e.preventDefault();
        flatItems[activeIndex].action();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeIndex, flatItems]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 animate-fade-in select-none">
      {/* Full screen scrim */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-[20px]"
        onClick={onClose}
      />

      {/* Spotlight card */}
      <div className="relative w-full max-w-[620px] z-10 animate-apple-in overflow-hidden rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] shadow-[0_24px_60px_rgba(0,0,0,0.22)]">
        {/* Search input header */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <Search className="w-4 h-4 text-[#86868B] dark:text-[#8E8E93] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search decisions, documents, action items, or commands..."
            className="flex-1 bg-transparent text-[15px] text-black dark:text-white placeholder:text-[#86868B] dark:placeholder:text-[#8E8E93] focus:outline-none font-normal"
          />

          {isLoading && (
            <Loader2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] animate-spin mr-2 shrink-0" />
          )}

          {query ? (
            <button
              onClick={() => setQuery('')}
              className="w-5 h-5 rounded-full bg-black/[0.06] dark:bg-white/[0.10] flex items-center justify-center text-[#86868B] hover:text-black dark:hover:text-white transition-colors shrink-0 ml-1"
            >
              <X className="w-3 h-3" />
            </button>
          ) : (
            <kbd className="hidden sm:flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded-[5px] bg-black/[0.04] dark:bg-white/[0.08] text-[#86868B] dark:text-[#8E8E93] shrink-0 ml-2">
              ESC
            </kbd>
          )}
        </div>

        {/* Results Container */}
        <div className="max-h-[380px] overflow-y-auto p-2 space-y-3">
          {flatItems.length === 0 ? (
            <div className="py-12 text-center space-y-1">
              <div className="text-[13px] font-medium text-black dark:text-white">
                No results found for "{query}"
              </div>
              <div className="text-[11px] text-[#8E8E93]">
                Try searching for a decision ID (DEC-002), policy topic, or client commitment.
              </div>
            </div>
          ) : (
            <>
              {/* 1. Render Federated Result Groups */}
              {Object.entries(federatedActionItems).map(([category, items]) => {
                if (items.length === 0) return null;
                return (
                  <div key={category} className="space-y-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#0071E3] dark:text-[#0A84FF] font-mono flex items-center justify-between">
                      <span>{category}</span>
                      <span className="text-[10px] text-[#8E8E93] font-normal">{items.length} hit{items.length > 1 ? 's' : ''}</span>
                    </div>
                    {items.map((item) => {
                      const idx = flatItems.indexOf(item);
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={`w-full px-3 py-2 rounded-[12px] text-left flex items-center justify-between transition-colors mb-0.5 ${
                            isActive
                              ? 'bg-black/[0.06] dark:bg-white/[0.08] ring-1 ring-black/[0.1] dark:ring-white/[0.1]'
                              : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-8 h-8 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0">
                              {item.icon}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-semibold text-black dark:text-white truncate">
                                  {item.title}
                                </span>
                                {item.badge && (
                                  <span
                                    className={`text-[9.5px] px-1.5 py-0.2 rounded font-mono font-bold ${
                                      item.badge === 'ACTIVE'
                                        ? 'bg-[#30D158]/10 text-[#30D158]'
                                        : item.badge === 'SUPERSEDED'
                                        ? 'bg-[#FF9F0A]/10 text-[#FF9F0A]'
                                        : item.badge === 'HIGH'
                                        ? 'bg-[#FF453A]/10 text-[#FF453A]'
                                        : 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]'
                                    }`}
                                  >
                                    {item.badge}
                                  </span>
                                )}
                              </div>
                              {item.subtitle && (
                                <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate max-w-md">
                                  {item.subtitle}
                                </p>
                              )}
                            </div>
                          </div>
                          <ArrowRight
                            className={`w-3.5 h-3.5 shrink-0 ml-2 transition-all ${
                              isActive
                                ? 'text-black dark:text-white translate-x-0.5'
                                : 'text-[#AEAEB2] opacity-40'
                            }`}
                          />
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* 2. Render Matching Quick Actions / Commands */}
              {filteredQuickActions.length > 0 && (
                <div className="space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#8E8E93] font-mono">
                    Commands & Workspaces
                  </div>
                  {filteredQuickActions.map((item) => {
                    const idx = flatItems.indexOf(item);
                    const isActive = idx === activeIndex;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setActiveIndex(idx)}
                        className={`w-full px-3 py-2 rounded-[12px] text-left flex items-center justify-between transition-colors mb-0.5 ${
                          isActive
                            ? 'bg-black/[0.06] dark:bg-white/[0.08] ring-1 ring-black/[0.1] dark:ring-white/[0.1]'
                            : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-[10px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center shrink-0 text-[#3C3C43] dark:text-[#EBEBF5]">
                            {item.icon}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[13px] font-medium text-black dark:text-white truncate block">
                              {item.title}
                            </span>
                            {item.subtitle && (
                              <p className="text-[11px] text-[#8E8E93] truncate">
                                {item.subtitle}
                              </p>
                            )}
                          </div>
                        </div>
                        <ArrowRight
                          className={`w-3.5 h-3.5 shrink-0 ml-2 transition-all ${
                            isActive
                              ? 'text-black dark:text-white translate-x-0.5'
                              : 'text-[#AEAEB2] opacity-40'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info ribbon */}
        <div className="px-4 py-2.5 border-t border-black/[0.07] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.02] flex items-center justify-between text-[11px] text-[#8E8E93] font-mono">
          <div className="flex items-center gap-1.5">
            <Shield className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" />
            <span>0.00 KB Egress · Sovereign Federated Index</span>
          </div>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
