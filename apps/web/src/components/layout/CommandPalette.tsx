import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  Sparkles,
  FileText,
  Loader2,
} from 'lucide-react';
import { WorkspaceId } from '../../types/contracts';
import { api } from '../../services/client';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateWorkspace: (ws: WorkspaceId) => void;
  onOpenActionHub: () => void;
  onOpenSettings: () => void;
  onOpenMemo: () => void;
  onOpenGenesis?: () => void;
  onSelectDecision?: (id: string) => void;
  onSelectDocument?: (id: string) => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: string;
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
  onSelectDecision,
  onSelectDocument,
}) => {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchResults, setSearchResults] = useState<PaletteItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSearchResults([]);
      setIsSearching(false);
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Debounced search for Decisions (Kùzu) and Documents (SQLite) (Bug 2)
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed || trimmed.length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const res = await api.search({
          query: trimmed,
          clearance: 'ALL_TEAM',
        });
        const items: PaletteItem[] = [];
        if (res && res.citations) {
          res.citations.forEach((c) => {
            const isDecision =
              (c.section_heading && c.section_heading.toLowerCase().includes('decision')) ||
              c.doc_title.toLowerCase().startsWith('decision:') ||
              c.doc_id.startsWith('ADR-') ||
              c.doc_id.startsWith('BDR-');

            if (isDecision) {
              const cleanTitle = c.doc_title.replace(/^Decision:\s*/i, '');
              const cleanId = c.doc_id.replace(/^Decision:\s*/i, '');
              items.push({
                id: `decision-${cleanId}`,
                title: cleanTitle,
                subtitle: c.snippet.length > 90 ? `${c.snippet.slice(0, 90)}...` : c.snippet,
                category: 'Decisions (ADR)',
                icon: <Scale className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />,
                action: () => {
                  if (onSelectDecision) onSelectDecision(cleanId);
                  onNavigateWorkspace('decisions');
                  onClose();
                },
              });
            } else {
              items.push({
                id: `doc-${c.chunk_id || c.doc_id}`,
                title: c.doc_title,
                subtitle: c.snippet.length > 90 ? `${c.snippet.slice(0, 90)}...` : c.snippet,
                category: 'Knowledge Documents',
                icon: <FileText className="w-4 h-4 text-[#34C759]" />,
                action: () => {
                  if (onSelectDocument) onSelectDocument(c.doc_id);
                  onNavigateWorkspace('knowledge');
                  onClose();
                },
              });
            }
          });
        }
        setSearchResults(items);
      } catch (err) {
        console.warn('CommandPalette search query warning:', err);
      } finally {
        setIsSearching(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query, onSelectDecision, onSelectDocument, onNavigateWorkspace, onClose]);

  const quickActions: PaletteItem[] = [
    { id: 'genesis-wizard', title: 'TARS Genesis Onboarding Wizard', category: 'Genesis',   icon: <Sparkles className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />, action: () => { if (onOpenGenesis) onOpenGenesis(); else onOpenSettings(); onClose(); } },
    { id: 'knowledge',    title: 'Knowledge Base',           category: 'Workspace', icon: <Layers className="w-4 h-4" />,       action: () => { onNavigateWorkspace('knowledge');    onClose(); } },
    { id: 'calls',        title: 'Call Studio',              category: 'Workspace', icon: <Phone className="w-4 h-4" />,        action: () => { onNavigateWorkspace('calls');        onClose(); } },
    { id: 'decisions',    title: 'Decision Registry',        category: 'Workspace', icon: <Scale className="w-4 h-4" />,        action: () => { onNavigateWorkspace('decisions');    onClose(); } },
    { id: 'architecture', title: 'Architecture Cortex',      category: 'Workspace', icon: <Cpu className="w-4 h-4" />,          action: () => { onNavigateWorkspace('architecture'); onClose(); } },
    { id: 'thinktank',    title: 'Think Tank Discussions',   category: 'Workspace', icon: <MessageSquare className="w-4 h-4" />, action: () => { onNavigateWorkspace('thinktank');   onClose(); } },
    { id: 'onboarding',   title: 'Onboarding Flight Plan',   category: 'Workspace', icon: <Compass className="w-4 h-4" />,      action: () => { onNavigateWorkspace('onboarding');  onClose(); } },
    { id: 'action-hub',   title: 'Open Action Hub',          category: 'Task',      icon: <CheckSquare className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />, action: () => { onOpenActionHub(); onClose(); } },
    { id: 'memo',         title: 'Record Voice Memo',        category: 'Capture',   icon: <Mic className="w-4 h-4 text-[#B25000] dark:text-[#FF9F0A]" />,         action: () => { onOpenMemo();       onClose(); } },
    { id: 'settings',     title: 'Company Setup',            category: 'System',    icon: <Sliders className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93]" />,     action: () => { onOpenSettings();   onClose(); } },
  ];

  const filteredQuickActions = quickActions.filter((item) =>
    item.title.toLowerCase().includes(query.toLowerCase()) ||
    item.category.toLowerCase().includes(query.toLowerCase())
  );

  const allFiltered: PaletteItem[] = [...searchResults, ...filteredQuickActions];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
      }
      if (e.key === 'Escape' && isOpen) onClose();
      if (e.key === 'ArrowDown' && isOpen && allFiltered.length > 0) {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % allFiltered.length);
      }
      if (e.key === 'ArrowUp' && isOpen && allFiltered.length > 0) {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + allFiltered.length) % allFiltered.length);
      }
      if (e.key === 'Enter' && isOpen && allFiltered[activeIndex]) {
        allFiltered[activeIndex].action();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, activeIndex, allFiltered]);

  if (!isOpen) return null;

  const categories = [
    'Decisions (ADR)',
    'Knowledge Documents',
    'Genesis',
    'Workspace',
    'Task',
    'Capture',
    'System',
  ];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 animate-fade-in select-none">
      {/* Full screen scrim */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/80 backdrop-blur-[20px]"
        onClick={onClose}
      />

      {/* Spotlight card */}
      <div className="relative w-full max-w-[580px] z-10 animate-apple-in overflow-hidden rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] shadow-[0_24px_60px_rgba(0,0,0,0.22)]">

        {/* Search input */}
        <div className="flex items-center px-4 py-3.5 border-b border-black/[0.06] dark:border-white/[0.08]">
          <Search className="w-4 h-4 text-[#86868B] dark:text-[#8E8E93] shrink-0 mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
            placeholder="Spotlight Search across ADRs, documents, workspaces..."
            className="flex-1 bg-transparent text-[15px] text-black dark:text-white placeholder:text-[#86868B] dark:placeholder:text-[#8E8E93] focus:outline-none font-normal"
          />
          {isSearching && (
            <Loader2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] animate-spin shrink-0 mr-2" />
          )}
          {query ? (
            <button
              onClick={() => { setQuery(''); setSearchResults([]); }}
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

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {allFiltered.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#8E8E93]">
              {isSearching ? 'Searching institutional memory...' : `No results for "${query}"`}
            </div>
          ) : (
            <>
              {categories.map((cat) => {
                const items = allFiltered.filter((i) => i.category === cat);
                if (items.length === 0) return null;
                return (
                  <div key={cat}>
                    <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#8E8E93] font-mono">
                      {cat}
                    </div>
                    {items.map((item) => {
                      const idx = allFiltered.indexOf(item);
                      const isActive = idx === activeIndex;
                      return (
                        <button
                          key={item.id}
                          onClick={item.action}
                          onMouseEnter={() => setActiveIndex(idx)}
                          className={[
                            'w-full px-3 py-2 rounded-[12px] text-left flex items-center justify-between transition-colors mb-0.5',
                            isActive
                              ? 'bg-black/[0.05] dark:bg-white/[0.07]'
                              : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]',
                          ].join(' ')}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <div className="w-8 h-8 rounded-[10px] bg-black/[0.05] dark:bg-white/[0.07] flex items-center justify-center shrink-0 text-[#3C3C43] dark:text-[#EBEBF5]">
                              {item.icon}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className="text-[13px] font-medium text-black dark:text-white truncate block">
                                {item.title}
                              </span>
                              {item.subtitle && (
                                <span className="text-[11px] text-[#8E8E93] truncate block mt-0.5 font-normal">
                                  {item.subtitle}
                                </span>
                              )}
                            </div>
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
            <Shield className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" />
            <span>0.00 KB Egress · Air-Gapped Kùzu Graph</span>
          </div>
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Open</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
