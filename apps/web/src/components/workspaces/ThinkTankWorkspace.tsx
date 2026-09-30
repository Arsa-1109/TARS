import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { api } from '../../services/client';
import { DecisionItem, SearchCitation, ActionItemDTO } from '../../types/contracts';
import { chatApi, ThinkTankChannelDTO, ThinkTankMessageDTO } from '../../services/chatApi';
import { ingestionApi, IngestedDocument } from '../../services/ingestionApi';
import {
  MessageSquare,
  Send,
  Sparkles,
  GitBranch,
  Layers,
  FileText,
  Hash,
  AlertTriangle,
  Plus,
  Trash2,
  Edit2,
  Eraser,
  Check,
  X,
  Paperclip,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Search,
  SlidersHorizontal,
  Download,
  MoreVertical,
  Users,
  CheckSquare,
  Square,
  ThumbsUp,
  Link as LinkIcon,
} from 'lucide-react';

interface ThinkTankWorkspaceProps {
  onNavigateDecision: (decId: string) => void;
}

type ViewMode = 'document' | 'split' | 'canvas';

function formatMessageTime(isoString?: string): string {
  if (!isoString) return 'Just now';
  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    const asNum = Number(isoString);
    if (!isNaN(asNum) && asNum > 1000000000) {
      return formatMessageTime(new Date(asNum * 1000).toISOString());
    }
    return isoString;
  }
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (date.toDateString() === now.toDateString()) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// Default seeded channels if backend returns empty
const DEFAULT_CHANNELS: ThinkTankChannelDTO[] = [
  { id: 'general', name: 'general', topic: 'Company wide strategy & alignment' },
  { id: 'strategy', name: 'strategy', topic: 'Business strategy and market analysis' },
  { id: 'architecture', name: 'architecture', topic: 'System design and technical decisions' },
  { id: 'product', name: 'product', topic: 'Product discussions and feedback' },
  { id: 'research', name: 'research', topic: 'Research papers and insights' },
  { id: 'clients', name: 'clients', topic: 'Client specific discussions' },
  { id: 'hiring', name: 'hiring', topic: 'Talent, interviews and team' },
  { id: 'random', name: 'random', topic: 'Non-work banter and watercooler' },
];

// Fallback seed messages for general channel matching reference screenshot
const SEED_MESSAGES: ThinkTankMessageDTO[] = [
  {
    id: 'msg-seed-1',
    channel_id: 'general',
    sender: 'TARS',
    sender_role: 'ASSISTANT',
    sender_type: 'AI',
    text: 'Welcome to Think Tank. Use this workspace to debate strategic changes, roadmap adjustments, and architectural shifts. TARS monitors threads in real-time to alert on policy contradictions and client commitments.',
    provenance: 'TARS Institutional Kernel',
    is_ai: true,
    created_at: '2026-09-30T10:50:00Z',
  },
  {
    id: 'msg-seed-2',
    channel_id: 'general',
    sender: 'Ayan (Founder)',
    sender_role: 'FOUNDER',
    sender_type: 'USER',
    text: 'We should discuss the new enterprise deployment requirements from Acme. The call yesterday highlighted strict data sovereignty needs. This might impact our current multi-region architecture.',
    is_ai: false,
    created_at: '2026-09-30T11:12:00Z',
  },
  {
    id: 'msg-seed-3',
    channel_id: 'general',
    sender: 'John (VP Engineering)',
    sender_role: 'ENGINEER',
    sender_type: 'USER',
    text: "Agree. We'll need to evaluate an on-premise option or a dedicated VPC deployment. I'm creating a doc with the technical constraints we discussed.",
    is_ai: false,
    created_at: '2026-09-30T11:28:00Z',
  },
];

// Fallback lake documents
const FALLBACK_DOCUMENTS: IngestedDocument[] = [
  { id: 'doc-1', title: 'Acme_Deployment_Requirements.pdf', page_count: 12, created_at: 'Sep 30, 2026' },
  { id: 'doc-2', title: 'Security_Compliance_Guide.pdf', page_count: 28, created_at: 'Sep 24, 2026' },
  { id: 'doc-3', title: 'Architecture_Options.puml', page_count: 1, created_at: 'Sep 30, 2026' },
  { id: 'doc-4', title: 'demo_runway_q4.xlsx', page_count: 4, created_at: 'Sep 22, 2026' },
  { id: 'doc-5', title: 'MSA_Draft_AcmeCorp.docx', page_count: 18, created_at: 'Sep 20, 2026' },
];

export const ThinkTankWorkspace: React.FC<ThinkTankWorkspaceProps> = ({
  onNavigateDecision,
}) => {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItemDTO[]>([]);
  const [documents, setDocuments] = useState<IngestedDocument[]>([]);
  const [channels, setChannels] = useState<ThinkTankChannelDTO[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<ThinkTankMessageDTO[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Search and filter state
  const [channelSearch, setChannelSearch] = useState('');
  const [channelFilterTab, setChannelFilterTab] = useState<'all' | 'pinned' | 'recent'>('all');
  const [contextCollapsed, setContextCollapsed] = useState(false);
  const [mobileColumn, setMobileColumn] = useState<'channels' | 'discussion' | 'context'>('discussion');

  // Interactive Reactions Map (for thumbs up, etc.)
  const [reactions, setReactions] = useState<Record<string, { thumbs: number; replies: number; userLiked?: boolean }>>({
    'msg-seed-2': { thumbs: 3, replies: 2 },
  });

  // Edit Message inline state
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Clear Channel Modal state
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  // Create Channel Modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');

  // Auto-scroll ref
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load Decisions, Action Items, and Documents for Context Panel & Canvas
  useEffect(() => {
    api.getDecisions().then((d) => setDecisions(d)).catch(() => {});
    api.getActionItems().then((a) => setActionItems(a)).catch(() => {});
    ingestionApi.getLakeDocuments().then((docs) => {
      if (docs && docs.length > 0) setDocuments(docs);
      else setDocuments(FALLBACK_DOCUMENTS);
    }).catch(() => {
      setDocuments(FALLBACK_DOCUMENTS);
    });
  }, []);

  // Fetch Channels from live API
  const refreshChannels = async () => {
    try {
      const liveChannels = await chatApi.getChannels();
      if (liveChannels && liveChannels.length > 0) {
        setChannels(liveChannels);
        if (!liveChannels.find((c) => c.id === activeChannelId)) {
          setActiveChannelId(liveChannels[0].id);
        }
      } else {
        setChannels(DEFAULT_CHANNELS);
      }
    } catch (err) {
      console.warn('Failed to load Think Tank channels, using defaults:', err);
      setChannels(DEFAULT_CHANNELS);
    }
  };

  useEffect(() => {
    refreshChannels();
  }, []);

  // Fetch Messages when activeChannelId changes
  const refreshMessages = async (channelId: string) => {
    try {
      const msgs = await chatApi.getMessages(channelId);
      if (msgs && msgs.length > 0) {
        setMessages(msgs);
      } else if (channelId === 'general') {
        setMessages(SEED_MESSAGES);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.warn(`Failed to load messages for channel ${channelId}:`, err);
      if (channelId === 'general') {
        setMessages(SEED_MESSAGES);
      } else {
        setMessages([]);
      }
    }
  };

  useEffect(() => {
    if (activeChannelId) {
      refreshMessages(activeChannelId);
    }
  }, [activeChannelId]);

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const currentChannel = channels.find((c) => c.id === activeChannelId) || {
    id: activeChannelId || 'general',
    name: activeChannelId || 'general',
    topic: 'Company strategic alignment & cross-functional topics',
  };

  // Create Channel Handler
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const cleanName = newChannelName.trim().replace(/^#/, '');
      const newCh = await chatApi.createChannel(cleanName, newChannelTopic.trim());
      setChannels((prev) => [...prev, newCh]);
      setActiveChannelId(newCh.id);
      setCreateDialogOpen(false);
      setNewChannelName('');
      setNewChannelTopic('');
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  // Send Message Handler
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;
    const userPrompt = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      // 1. Check for explicit /teach slash command
      if (userPrompt.startsWith('/teach ')) {
        const fact = userPrompt.replace(/^\/teach\s+/i, '').trim();
        if (fact) {
          const userMsg = await chatApi.sendMessage({
            channel_id: activeChannelId,
            sender: 'You',
            sender_role: 'ENGINEER',
            text: userPrompt,
            is_ai: false,
          });
          setMessages((prev) => [...prev, userMsg]);

          await chatApi.teachTars({
            content: fact,
            title: `Fact: ${fact.slice(0, 36)}...`,
            category: 'POLICY',
            clearance: 'ALL_TEAM',
            user_name: 'You',
            user_role: 'ENGINEER',
          });

          const aiReply = await chatApi.sendMessage({
            channel_id: activeChannelId,
            sender: 'TARS',
            sender_role: 'ASSISTANT',
            sender_type: 'AI',
            text: `Institutional memory successfully updated: "${fact}" recorded and indexed. Accessible in future searches.`,
            provenance: 'TARS Continuous Memory Engine',
            is_ai: true,
          });
          setMessages((prev) => [...prev, aiReply]);
          setIsSending(false);
          return;
        }
      }

      // 2. Standard user message persistence
      const userMsg = await chatApi.sendMessage({
        channel_id: activeChannelId,
        sender: 'You',
        sender_role: 'ENGINEER',
        text: userPrompt,
        is_ai: false,
      });
      setMessages((prev) => [...prev, userMsg]);

      // 3. Real-time TARS evaluation
      const cleanQuery = userPrompt.replace(/@TARS/gi, '').trim() || userPrompt;
      const conflictRes = await api.checkContradiction(cleanQuery);

      let aiText = '';
      let provenance = '';

      if (conflictRes.has_conflict) {
        aiText = `⚠️ Contradiction Detected: ${conflictRes.explanation}`;
        provenance = conflictRes.conflicting_decision_id
          ? `Decision ${conflictRes.conflicting_decision_id} · Local Institutional Graph`
          : 'Institutional Invariant Rule';
      } else {
        const ragRes = await api.search({ query: cleanQuery });
        aiText = ragRes.answer;
        if (ragRes.citations && ragRes.citations.length > 0) {
          provenance = ragRes.citations
            .map((c: SearchCitation) => c.doc_title || c.doc_id)
            .slice(0, 3)
            .join(' · ');
        } else {
          provenance = 'TARS Institutional Cortex Engine';
        }
      }

      // 4. Persist TARS response
      const aiMsg = await chatApi.sendMessage({
        channel_id: activeChannelId,
        sender: 'TARS',
        sender_role: 'ASSISTANT',
        sender_type: 'AI',
        text: aiText,
        provenance: provenance || undefined,
        is_ai: true,
      });
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Think Tank message sending error:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Edit Message Handlers
  const handleStartEdit = (msg: ThinkTankMessageDTO) => {
    setEditingMessageId(msg.id);
    setEditingText(msg.text);
  };

  const handleSaveEdit = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      const updated = await chatApi.updateMessage(msgId, editingText.trim());
      setMessages((prev) => prev.map((m) => (m.id === msgId ? updated : m)));
      setEditingMessageId(null);
      setEditingText('');
    } catch (err) {
      console.error('Failed to update message:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  // Delete Message Handler
  const handleDeleteMessage = async (msgId: string) => {
    try {
      await chatApi.deleteMessage(msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error('Failed to delete message:', err);
    }
  };

  // Clear Channel Handler
  const handleClearChannel = async () => {
    try {
      await chatApi.clearChannel(activeChannelId);
      setMessages([]);
      setClearDialogOpen(false);
    } catch (err) {
      console.error('Failed to clear channel:', err);
    }
  };

  // Toggle reaction like
  const handleToggleReaction = (msgId: string) => {
    setReactions((prev) => {
      const current = prev[msgId] || { thumbs: 0, replies: 0 };
      const userLiked = !current.userLiked;
      return {
        ...prev,
        [msgId]: {
          ...current,
          thumbs: userLiked ? current.thumbs + 1 : Math.max(0, current.thumbs - 1),
          userLiked,
        },
      };
    });
  };

  // Filtered channels
  const filteredChannels = channels.filter((ch) => {
    const q = channelSearch.toLowerCase();
    const matchesQ = !q || ch.name.toLowerCase().includes(q) || (ch.topic && ch.topic.toLowerCase().includes(q));
    if (!matchesQ) return false;
    if (channelFilterTab === 'pinned') {
      return ch.id === 'general' || ch.id === 'architecture';
    }
    return true;
  });

  // Canvas nodes derived from recorded decisions
  const canvasNodes = decisions.slice(0, 4).map((d, idx) => ({
    id: d.id,
    title: d.title.length > 24 ? d.title.slice(0, 23) + '...' : d.title,
    type: d.category || 'DECISION',
    x: 40 + (idx % 2) * 260,
    y: 80 + Math.floor(idx / 2) * 140,
    detail: d.context || d.chosen_option || 'Institutional decision record',
    isConflict: d.lifecycle_status === 'SUPERSEDED',
  }));

  // Initial avatar letter
  const getAvatarLetter = (sender: string) => {
    const clean = sender.replace(/\(.*\)/, '').trim();
    return clean.charAt(0).toUpperCase() || 'U';
  };

  // Decision status badge helper
  const getDecisionStatusBadge = (status?: string) => {
    switch (status?.toUpperCase()) {
      case 'ACTIVE':
      case 'APPROVED':
        return { label: 'APPROVED', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
      case 'SUPERSEDED':
        return { label: 'SUPERSEDED', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
      default:
        return { label: 'UNDER DISCUSSION', className: 'bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-300 border-black/10 dark:border-white/10' };
    }
  };

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2">
      {/* Compact Page Header */}
      <PageHeader
        eyebrow="Workspace 4"
        title="Collaborative Think Tank"
        description="Focused asynchronous topic discussions with persistent institutional context injection and an optional relationship canvas."
        className="pb-2.5 mb-1"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-500 dark:text-neutral-400 hidden sm:inline">Canvas Mode:</span>
            <div className="flex items-center rounded-[6px] border border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-[#18191D] p-0.5">
              {[
                { value: 'document', label: 'Discussion' },
                { value: 'split', label: 'Split View' },
                { value: 'canvas', label: 'Diagram' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setViewMode(opt.value as ViewMode)}
                  className={`px-2 py-0.5 rounded-[4px] text-xs font-medium transition-all ${
                    viewMode === opt.value
                      ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        }
      />

      {/* Mobile Column Switcher (visible only on small screens < md) */}
      <div className="md:hidden flex items-center gap-1 p-1 bg-neutral-100 dark:bg-[#18191D] rounded-[8px] border border-black/10 dark:border-white/10 shrink-0">
        <button
          onClick={() => setMobileColumn('channels')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
            mobileColumn === 'channels'
              ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
              : 'text-neutral-500'
          }`}
        >
          Channels
        </button>
        <button
          onClick={() => setMobileColumn('discussion')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
            mobileColumn === 'discussion'
              ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
              : 'text-neutral-500'
          }`}
        >
          Discussion
        </button>
        <button
          onClick={() => setMobileColumn('context')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
            mobileColumn === 'context'
              ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
              : 'text-neutral-500'
          }`}
        >
          Context
        </button>
      </div>

      {/* Main Think Tank 3-Column Layout */}
      <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
        {/* ============================================================== */}
        {/* COLUMN 1: TOPIC CHANNELS SIDEBAR (Left ~25% / 3 cols)          */}
        {/* ============================================================== */}
        <div
          className={`col-span-12 md:col-span-3 lg:col-span-3 h-full flex flex-col min-h-0 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] overflow-hidden ${
            viewMode === 'canvas' ? 'hidden' : mobileColumn !== 'channels' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header: Title & Create Channel */}
          <div className="p-3 pb-2.5 border-b border-black/8 dark:border-white/8 space-y-2.5 shrink-0">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider font-mono">
                Topic Channels
              </span>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="w-5 h-5 rounded-[4px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300 flex items-center justify-center transition-colors"
                title="Create New Discussion Channel"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Search channels input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                placeholder="Search channels..."
                className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-[6px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
              />
            </div>

            {/* Filter chips: All, Pinned, Recent */}
            <div className="flex items-center gap-1">
              {(['all', 'pinned', 'recent'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setChannelFilterTab(tab)}
                  className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all ${
                    channelFilterTab === tab
                      ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {tab === 'all'
                    ? `All (${channels.length})`
                    : tab === 'pinned'
                    ? 'Pinned (2)'
                    : 'Recent'}
                </button>
              ))}
            </div>
          </div>

          {/* Scrollable Channels List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
            {filteredChannels.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-400">
                No channels matching "{channelSearch}"
              </div>
            ) : (
              filteredChannels.map((ch) => {
                const isActive = activeChannelId === ch.id;
                const cleanName = ch.name.replace(/^#/, '');

                return (
                  <button
                    key={ch.id}
                    onClick={() => {
                      setActiveChannelId(ch.id);
                      setMobileColumn('discussion');
                    }}
                    className={`w-full text-left p-2.5 rounded-[8px] border transition-all flex items-start gap-2.5 ${
                      isActive
                        ? 'border-black/20 dark:border-white/20 bg-black/[0.04] dark:bg-white/[0.08] shadow-xs'
                        : 'border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                    }`}
                  >
                    <span className="font-mono text-neutral-400 font-semibold text-sm leading-none mt-0.5">
                      #
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-black dark:text-white truncate">
                        {cleanName}
                      </div>
                      <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                        {ch.topic || 'Deliberation & topic alignment'}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 2: DISCUSSION THREAD (Center ~50% / 6 cols)              */}
        {/* ============================================================== */}
        <div
          className={`h-full flex flex-col min-h-0 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] overflow-hidden ${
            viewMode === 'canvas'
              ? 'hidden'
              : viewMode === 'split'
              ? 'col-span-12 md:col-span-6 lg:col-span-5'
              : 'col-span-12 md:col-span-6 lg:col-span-6'
          } ${mobileColumn !== 'discussion' ? 'hidden md:flex' : 'flex'}`}
        >
          {/* Channel Header */}
          <div className="p-3.5 border-b border-black/8 dark:border-white/8 flex items-center justify-between gap-3 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-neutral-400 font-bold text-sm">#</span>
                <h3 className="text-sm sm:text-base font-bold text-black dark:text-white tracking-tight truncate">
                  {currentChannel.name.replace(/^#/, '')}
                </h3>
              </div>
              <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                {currentChannel.topic || 'Company strategic alignment & cross-functional topics'}
              </p>
            </div>

            {/* Header Right: Members Stack, Search, Eraser */}
            <div className="flex items-center gap-3 shrink-0">
              {/* Members Avatar Stack */}
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                <Users className="w-3.5 h-3.5" />
                <span className="text-[11px]">12 members</span>
                <div className="flex items-center -space-x-1.5 ml-1">
                  {['A', 'J', 'S', 'R'].map((initial, i) => (
                    <div
                      key={i}
                      className="w-5 h-5 rounded-full bg-neutral-200 dark:bg-[#2C2C2E] border-2 border-white dark:border-[#121316] flex items-center justify-center text-[9px] font-bold text-black dark:text-white"
                    >
                      {initial}
                    </div>
                  ))}
                  <div className="w-5 h-5 rounded-full bg-neutral-100 dark:bg-[#18191D] border-2 border-white dark:border-[#121316] flex items-center justify-center text-[8px] font-mono text-neutral-500">
                    +8
                  </div>
                </div>
              </div>

              {/* Clear channel history button */}
              <button
                onClick={() => setClearDialogOpen(true)}
                className="p-1.5 rounded-[6px] text-neutral-400 hover:text-red-600 hover:bg-red-500/10 transition-colors"
                title="Clear Channel History"
              >
                <Eraser className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Message Stream */}
          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-neutral-400 mb-2">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold text-black dark:text-white">No Messages Yet</h4>
                <p className="text-xs text-neutral-500 max-w-sm mt-1">
                  Start the discussion in #{currentChannel.name.replace(/^#/, '')} or type{' '}
                  <code className="font-mono text-black dark:text-white">/teach</code> to record new policy.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const reactionState = reactions[msg.id];
                const letter = getAvatarLetter(msg.sender);

                return (
                  <div key={msg.id} className="group flex items-start gap-3">
                    {/* Avatar */}
                    {msg.is_ai ? (
                      <div className="w-7 h-7 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 shadow-xs">
                        T
                      </div>
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-[#2C2C2E] text-black dark:text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                        {letter}
                      </div>
                    )}

                    {/* Message Body & Meta */}
                    <div className="flex-1 min-w-0 space-y-1">
                      {/* Name & Timestamp */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-black dark:text-white">
                            {msg.sender}
                          </span>
                          {msg.is_ai && (
                            <span className="text-[9px] font-mono px-1 py-0.2 rounded-[4px] bg-black/5 dark:bg-white/10 text-neutral-500 dark:text-neutral-400 uppercase font-semibold">
                              APP
                            </span>
                          )}
                          <span className="text-[10px] font-mono text-neutral-400 ml-1">
                            {formatMessageTime(msg.created_at)}
                          </span>
                        </div>

                        {/* Hover Actions: Edit / Delete */}
                        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                          {!msg.is_ai && editingMessageId !== msg.id && (
                            <button
                              onClick={() => handleStartEdit(msg)}
                              className="p-1 rounded-[4px] hover:bg-black/5 dark:hover:bg-white/10 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                              title="Edit Message"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteMessage(msg.id)}
                            className="p-1 rounded-[4px] hover:bg-red-500/10 text-neutral-400 hover:text-red-600 transition-colors"
                            title="Delete Message"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Text content or edit input */}
                      {editingMessageId === msg.id ? (
                        <div className="pt-1 space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full p-2 text-xs rounded-[6px] border border-black/10 dark:border-white/15 bg-white dark:bg-[#121316] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                            rows={2}
                            autoFocus
                          />
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 text-[11px] rounded-[4px] bg-black/5 dark:bg-white/10 hover:bg-black/10 text-neutral-600 dark:text-neutral-400 transition-colors"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleSaveEdit(msg.id)}
                              className="px-2.5 py-1 text-[11px] rounded-[4px] bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 flex items-center gap-1 transition-colors font-medium"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed font-sans whitespace-pre-wrap">
                          {msg.text}
                        </p>
                      )}

                      {/* Evidence Grounding Bar for AI messages */}
                      {msg.provenance && (
                        <div className="pt-1.5 mt-1 border-t border-black/6 dark:border-white/8 text-[10px] font-mono text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5">
                          <span className="font-semibold text-black dark:text-white">Evidence Grounding:</span>
                          <span className="underline decoration-black/20 dark:decoration-white/20 underline-offset-2">
                            {msg.provenance}
                          </span>
                        </div>
                      )}

                      {/* Document Attachment Card (rendered for msg-seed-3 or file references) */}
                      {(msg.id === 'msg-seed-3' || msg.text.includes('.pdf') || msg.text.includes('Acme_Deployment_Requirements')) && (
                        <div className="mt-2 p-2.5 rounded-[8px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] flex items-center justify-between gap-3 max-w-md">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-[6px] bg-black/5 dark:bg-white/5 border border-black/5 dark:border-white/5 flex items-center justify-center shrink-0 text-neutral-500 dark:text-neutral-400">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-black dark:text-white truncate">
                                Acme_Deployment_Requirements.pdf
                              </div>
                              <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                                12 pages · Sep 30, 11:27 AM
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              className="p-1.5 rounded-[6px] text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                              title="Download Attachment"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              className="p-1.5 rounded-[6px] text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Reaction / Interaction Row */}
                      {!msg.is_ai && (
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => handleToggleReaction(msg.id)}
                            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono border transition-all ${
                              reactionState?.userLiked
                                ? 'bg-black/10 dark:bg-white/15 border-black/20 dark:border-white/20 text-black dark:text-white'
                                : 'border-black/5 dark:border-white/5 hover:border-black/15 text-neutral-500 hover:text-black dark:hover:text-white'
                            }`}
                          >
                            <ThumbsUp className="w-2.5 h-2.5" />
                            <span>{reactionState?.thumbs || 0}</span>
                          </button>
                          {reactionState?.replies ? (
                            <button
                              type="button"
                              className="flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] text-[10px] font-mono border border-black/5 dark:border-white/5 text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                            >
                              <MessageSquare className="w-2.5 h-2.5" />
                              <span>{reactionState.replies}</span>
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="p-1 text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
                          >
                            <LinkIcon className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Composer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 border-t border-black/8 dark:border-white/8 flex items-center gap-2 shrink-0 bg-neutral-50/50 dark:bg-[#16171B]/50"
          >
            <button
              type="button"
              className="p-2 rounded-[6px] text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              title="Attach File"
            >
              <Paperclip className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Discuss topic, @TARS for context, or /teach Our payment provider is Stripe..."
              disabled={isSending}
              className="flex-1 px-3 py-1.5 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isSending}
              className="px-4 py-1.5 rounded-full text-xs font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity disabled:opacity-40 flex items-center gap-1.5 shadow-xs"
            >
              <Send className="w-3 h-3 fill-current" />
              <span>Send</span>
            </button>
          </form>
        </div>

        {/* ============================================================== */}
        {/* COLUMN 3: CONTEXT & INTELLIGENCE (Right ~25% / 3 cols)         */}
        {/* ============================================================== */}
        <div
          className={`col-span-12 md:col-span-3 lg:col-span-3 h-full flex flex-col min-h-0 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] overflow-hidden ${
            viewMode === 'canvas' ? 'hidden' : viewMode === 'split' ? 'hidden' : mobileColumn !== 'context' ? 'hidden md:flex' : 'flex'
          }`}
        >
          {/* Header */}
          <div className="p-3 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
              <h3 className="text-sm font-semibold text-black dark:text-white tracking-tight">
                Context & Intelligence
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setContextCollapsed(!contextCollapsed)}
              className="p-1 rounded-[4px] text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
            >
              {contextCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>

          {/* Structured Context Content */}
          {!contextCollapsed && (
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
              {/* 1. Related Decisions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                  <span>Related Decisions ({decisions.length || 3})</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (decisions[0]) onNavigateDecision(decisions[0].id);
                    }}
                    className="text-[11px] text-neutral-400 hover:text-black dark:hover:text-white font-normal flex items-center gap-0.5"
                  >
                    View all <ChevronRight className="w-3 h-3" />
                  </button>
                </div>

                <div className="space-y-1.5">
                  {(decisions.length > 0 ? decisions.slice(0, 3) : [
                    { id: 'DR-42', title: 'Data Residency Policy', lifecycle_status: 'ACTIVE', timestamp: Date.now() - 18 * 86400000 },
                    { id: 'DR-38', title: 'Multi-Region Architecture', lifecycle_status: 'UNDER DISCUSSION', timestamp: Date.now() - 34 * 86400000 },
                    { id: 'DR-35', title: 'On-Prem Deployment Option', lifecycle_status: 'UNDER DISCUSSION', timestamp: Date.now() - 52 * 86400000 },
                  ]).map((dec) => {
                    const badge = getDecisionStatusBadge(dec.lifecycle_status);
                    return (
                      <div
                        key={dec.id}
                        onClick={() => onNavigateDecision(dec.id)}
                        className="p-2 rounded-[6px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] hover:border-black/15 dark:hover:border-white/15 transition-all cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                          <div className="min-w-0">
                            <div className="text-xs font-semibold text-black dark:text-white truncate">
                              {dec.id} {dec.title}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                              {new Date(dec.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <span className={`text-[9px] px-1.5 py-0.2 rounded-[4px] font-mono font-medium shrink-0 border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 2. Related Documents */}
              <div className="pt-3 border-t border-black/8 dark:border-white/8 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                  <span>Related Documents ({documents.length || 5})</span>
                  <span className="text-[11px] text-neutral-400 font-normal flex items-center gap-0.5">
                    View all <ChevronRight className="w-3 h-3" />
                  </span>
                </div>

                <div className="space-y-1.5">
                  {documents.slice(0, 3).map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      className="p-2 rounded-[6px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] flex items-center gap-2"
                    >
                      <FileText className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-semibold text-black dark:text-white truncate">
                          {doc.title || doc.filename || 'Document'}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {doc.page_count || 12} pages · {doc.created_at || 'Sep 30, 2026'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Active Commitments */}
              <div className="pt-3 border-t border-black/8 dark:border-white/8 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                  <span>Active Commitments ({actionItems.length || 2})</span>
                  <ChevronRight className="w-3 h-3 text-neutral-400" />
                </div>

                <div className="space-y-1.5">
                  {(actionItems.length > 0 ? actionItems.slice(0, 2) : [
                    { id: 'act-1', title: 'Evaluate on-prem deployment option', owner: 'Rohan', deadline: 'Due Oct 7, 2026' },
                    { id: 'act-2', title: 'Prepare product feature list for Q1', owner: 'Sarah', deadline: 'Due Oct 5, 2026' },
                  ]).map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="p-2 rounded-[6px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] flex items-start gap-2"
                    >
                      <Square className="w-3.5 h-3.5 text-neutral-400 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-black dark:text-white leading-snug">
                          {item.title}
                        </div>
                        <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                          {item.owner} · {typeof item.deadline === 'number' ? new Date(item.deadline).toLocaleDateString() : item.deadline}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============================================================== */}
        {/* OPTIONAL CANVAS MODE: Topology Diagram (Split or Full)        */}
        {/* ============================================================== */}
        {(viewMode === 'split' || viewMode === 'canvas') && (
          <div
            className={`h-full flex flex-col min-h-0 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] overflow-hidden ${
              viewMode === 'split' ? 'col-span-12 md:col-span-6 lg:col-span-4' : 'col-span-12'
            }`}
          >
            <div className="p-3 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0">
              <div>
                <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <GitBranch className="w-3.5 h-3.5 text-black dark:text-white" />
                  <span>Decision & Commitment Topology</span>
                </h4>
                <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                  Analytical relationship view (Institutional topology)
                </p>
              </div>
            </div>

            {/* Interactive SVG Relationship Canvas */}
            <div className="flex-1 min-h-0 bg-neutral-50 dark:bg-[#18191D] relative overflow-hidden flex items-center justify-center p-4">
              <svg className="w-full h-full" viewBox="0 0 700 360">
                {canvasNodes.length > 1 && (
                  <line
                    x1="200"
                    y1="115"
                    x2="300"
                    y2="115"
                    stroke="rgba(128,128,128,0.3)"
                    strokeWidth="1.5"
                    strokeDasharray="4 4"
                  />
                )}
                {canvasNodes.map((n) => {
                  const isSelected = selectedNode === n.id;
                  return (
                    <g
                      key={n.id}
                      transform={`translate(${n.x}, ${n.y})`}
                      onClick={() => setSelectedNode(n.id)}
                      className="cursor-pointer"
                    >
                      <rect
                        width="160"
                        height="75"
                        rx="8"
                        className={isSelected ? 'fill-white dark:fill-[#222327]' : 'fill-white dark:fill-[#18191D]'}
                        stroke={isSelected ? 'currentColor' : n.isConflict ? '#D97706' : 'rgba(128,128,128,0.25)'}
                        strokeWidth={isSelected ? '1.5' : '1'}
                      />
                      <text x="12" y="22" fill="#8E8E93" fontSize="9" fontWeight="bold">
                        {n.type.toUpperCase()}
                      </text>
                      <text x="12" y="40" fill="currentColor" className="text-black dark:text-white" fontSize="11" fontWeight="bold">
                        {n.title}
                      </text>
                      <text x="12" y="58" fill="#8E8E93" fontSize="9.5">
                        {n.detail.slice(0, 24)}...
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Selected Node Details Footer */}
            {selectedNode && (
              <div className="p-3 border-t border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] text-xs flex items-center justify-between shrink-0">
                <div>
                  <span className="font-semibold text-black dark:text-white">
                    {canvasNodes.find((n) => n.id === selectedNode)?.title || selectedNode}
                  </span>
                  <span className="text-neutral-500 dark:text-neutral-400 ml-2">
                    {canvasNodes.find((n) => n.id === selectedNode)?.detail}
                  </span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onNavigateDecision(selectedNode)}
                >
                  Open Decision
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Clear Channel Confirmation Dialog */}
      <Dialog
        isOpen={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        title="Clear Discussion Channel"
        description={`Are you sure you want to clear all message history in #${currentChannel.name.replace(/^#/, '')}? This action cannot be undone.`}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setClearDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearChannel}
            >
              Clear Messages
            </Button>
          </div>
        }
      >
        <p className="text-xs text-neutral-500 dark:text-neutral-400">
          All discussions and AI syntheses in this channel will be purged from the active database.
        </p>
      </Dialog>

      {/* Create New Channel Dialog */}
      <Dialog
        isOpen={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        title="Create Discussion Channel"
        description="Establish a focused asynchronous deliberation channel monitored by TARS institutional memory."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateChannel}
              disabled={!newChannelName.trim()}
            >
              Create Channel
            </Button>
          </div>
        }
      >
        <form onSubmit={handleCreateChannel} className="space-y-3">
          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1 uppercase tracking-wider font-mono">
              Channel Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3 text-neutral-400 font-mono text-xs">#</span>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value.replace(/^#/, ''))}
                placeholder="e.g. enterprise-security"
                required
                autoFocus
                className="w-full pl-7 pr-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1 uppercase tracking-wider font-mono">
              Discussion Topic & Purpose
            </label>
            <textarea
              value={newChannelTopic}
              onChange={(e) => setNewChannelTopic(e.target.value)}
              placeholder="Describe the trade-off, proposal, or context being explored..."
              rows={3}
              className="w-full px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all resize-none"
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};
