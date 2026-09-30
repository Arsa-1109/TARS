import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { EmptyState } from '../primitives/EmptyState';
import { api } from '../../services/client';
import { DecisionItem, SearchCitation } from '../../types/contracts';
import { chatApi, ThinkTankChannelDTO, ThinkTankMessageDTO } from '../../services/chatApi';
import { realtimeBus } from '../../services/realtime';
import {
  MessageSquare,
  Send,
  Sparkles,
  GitBranch,
  Layers,
  FileText,
  User,
  Hash,
  AlertTriangle,
  ExternalLink,
  Plus,
  Trash2,
  Edit2,
  Eraser,
  Check,
  X
} from 'lucide-react';

interface ThinkTankWorkspaceProps {
  onNavigateDecision: (decId: string) => void;
  currentUserName?: string;
  currentUserRole?: string;
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

export const ThinkTankWorkspace: React.FC<ThinkTankWorkspaceProps> = ({
  onNavigateDecision,
  currentUserName = 'Alex Vance',
  currentUserRole = 'FOUNDER',
}) => {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);
  const [channels, setChannels] = useState<ThinkTankChannelDTO[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string>('general');
  const [messages, setMessages] = useState<ThinkTankMessageDTO[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

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

  // Load Decisions for Canvas
  useEffect(() => {
    api.getDecisions().then((d) => setDecisions(d)).catch(() => {});
  }, []);

  // Fetch Channels from live API
  const refreshChannels = async () => {
    try {
      const liveChannels = await chatApi.getChannels();
      setChannels(liveChannels);
      if (liveChannels.length > 0 && !liveChannels.find((c) => c.id === activeChannelId)) {
        setActiveChannelId(liveChannels[0].id);
      }
    } catch (err) {
      console.error('Failed to load Think Tank channels:', err);
    }
  };

  useEffect(() => {
    refreshChannels();
  }, []);

  // Fetch Messages when activeChannelId changes
  const refreshMessages = async (channelId: string) => {
    try {
      const msgs = await chatApi.getMessages(channelId);
      setMessages(msgs);
    } catch (err) {
      console.error(`Failed to load messages for channel ${channelId}:`, err);
    }
  };

  useEffect(() => {
    if (activeChannelId) {
      refreshMessages(activeChannelId);
    }
    const unsub = realtimeBus.subscribe((evt) => {
      if (evt.event === 'THINKTANK_MESSAGE') {
        if (activeChannelId) {
          refreshMessages(activeChannelId);
        }
        refreshChannels();
      }
    });
    return unsub;
  }, [activeChannelId]);

  // Auto-scroll whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const currentChannel = channels.find((c) => c.id === activeChannelId) || {
    id: activeChannelId || 'general',
    name: `#${activeChannelId || 'general'}`,
    topic: 'Company strategic alignment & cross-functional topics'
  };

  // Create Channel Handler
  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const newCh = await chatApi.createChannel(newChannelName.trim(), newChannelTopic.trim());
      setChannels((prev) => [...prev, newCh]);
      setActiveChannelId(newCh.id);
      setCreateDialogOpen(false);
      setNewChannelName('');
      setNewChannelTopic('');
    } catch (err) {
      console.error('Failed to create channel:', err);
    }
  };

  // Send Message Handler (with /teach command support & real-time Cortex SLM evaluation)
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isSending) return;
    const userPrompt = inputMessage.trim();
    setInputMessage('');
    setIsSending(true);

    try {
      const activeSender = currentUserName || 'Team Member';
      const activeRole = currentUserRole || 'ENGINEER';

      // 1. Check for explicit /teach slash command
      if (userPrompt.startsWith('/teach ')) {
        const fact = userPrompt.replace(/^\/teach\s+/i, '').trim();
        if (fact) {
          // Send user message to thread
          const userMsg = await chatApi.sendMessage({
            channel_id: activeChannelId,
            sender: activeSender,
            sender_name: activeSender,
            sender_role: activeRole,
            text: userPrompt,
            is_ai: false
          });
          setMessages((prev) => [...prev, userMsg]);

          // Call backend /teach endpoint to persist institutional memory and ratify decision in Workspace 5
          const teachRes = await chatApi.teachTars({
            content: fact,
            title: `Fact: ${fact.slice(0, 36)}...`,
            category: 'POLICY',
            clearance: 'ALL_TEAM',
            user_name: activeSender,
            user_role: activeRole
          });

          // Send confirmation assistant message with ratified Decision ID
          const aiReply = await chatApi.sendMessage({
            channel_id: activeChannelId,
            sender: 'TARS (@TARS)',
            sender_role: 'ASSISTANT',
            sender_type: 'AI',
            text: teachRes?.message || `Institutional memory successfully updated: "${fact}" recorded and ratified as Decision [${teachRes?.decision_id || 'DEC'}] in Workspace 5 Strategic Decision Registry. Accessible in future searches.`,
            provenance: 'TARS Continuous Memory & Cortex Engine',
            is_ai: true
          });
          setMessages((prev) => [...prev, aiReply]);
          setIsSending(false);
          return;
        }
      }

      // 2. Standard user message persistence with real user identity
      const userMsg = await chatApi.sendMessage({
        channel_id: activeChannelId,
        sender: activeSender,
        sender_name: activeSender,
        sender_role: activeRole,
        text: userPrompt,
        is_ai: false
      });
      setMessages((prev) => [...prev, userMsg]);

      // 3. Real-time TARS evaluation via live backend Cortex & SLM
      const hasMention = /@tars\b/i.test(userPrompt);
      const cleanQuery = userPrompt.replace(/@TARS/gi, '').trim() || userPrompt;

      // Check for institutional decision contradictions
      const conflictRes = await api.checkContradiction(cleanQuery);

      // Gate: Only respond if explicit @TARS tag OR contradiction detected!
      if (!hasMention && !conflictRes.has_conflict) {
        setIsSending(false);
        return;
      }

      let aiText = '';
      let provenance = '';

      if (conflictRes.has_conflict) {
        aiText = `⚠️ Contradiction Detected: ${conflictRes.explanation}`;
        provenance = conflictRes.conflicting_decision_id
          ? `Decision ${conflictRes.conflicting_decision_id} · Local Institutional Graph`
          : 'Institutional Invariant Rule';
      } else if (hasMention) {
        // Query knowledge base with local SLM
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

      // 4. Persist TARS response to SQLite
      const aiMsg = await chatApi.sendMessage({
        channel_id: activeChannelId,
        sender: 'TARS (@TARS)',
        sender_role: 'ASSISTANT',
        sender_type: 'AI',
        text: aiText,
        provenance: provenance || undefined,
        is_ai: true
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

  // Structured diagram entities derived dynamically from recorded decisions
  const canvasNodes = decisions.slice(0, 4).map((d, idx) => ({
    id: d.id,
    title: d.title.length > 24 ? d.title.slice(0, 23) + '...' : d.title,
    type: d.category || 'DECISION',
    x: 40 + (idx % 2) * 260,
    y: 80 + Math.floor(idx / 2) * 140,
    detail: d.context || d.chosen_option || 'Institutional decision record',
    isConflict: d.lifecycle_status === 'SUPERSEDED',
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace 4"
        title="Collaborative Think Tank"
        description="Focused asynchronous topic discussions with persistent institutional context injection and an optional relationship canvas."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#6E6E73] dark:text-[#8E8E93] hidden sm:inline">Canvas Mode:</span>
            <SegmentedControl
              size="sm"
              options={[
                { value: 'document', label: 'Discussion' },
                { value: 'split', label: 'Split View' },
                { value: 'canvas', label: 'Diagram' },
              ]}
              value={viewMode}
              onChange={(v) => setViewMode(v as ViewMode)}
            />
          </div>
        }
      />

      {/* Main Think Tank Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Topic Channels (3 cols on desktop) */}
        <div className={`lg:col-span-3 space-y-3 ${viewMode === 'canvas' ? 'hidden lg:block' : ''}`}>
          <Surface className="p-3.5 space-y-2">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                Topic Channels
              </span>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="w-5 h-5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] hover:bg-black/[0.12] dark:hover:bg-white/[0.16] text-[#3C3C43] dark:text-[#EBEBF5] flex items-center justify-center transition-colors"
                title="Create New Discussion Channel"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
            <div className="space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-[10px] text-xs flex items-center gap-2 transition-all ${
                    activeChannelId === ch.id
                      ? 'bg-black/[0.06] dark:bg-white/[0.10] font-semibold text-black dark:text-white border border-black/[0.08] dark:border-white/[0.12]'
                      : 'text-[#6E6E73] dark:text-[#8E8E93] hover:bg-black/[0.03] dark:hover:bg-white/[0.05] hover:text-black dark:hover:text-white'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0 text-[#8E8E93]" />
                  <span className="truncate">{ch.name.replace('#', '')}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] px-2 text-[11px] text-[#6E6E73] dark:text-[#8E8E93] space-y-1">
              <div>
                Type <code className="text-black dark:text-white font-mono font-semibold">@TARS</code> to query historical context.
              </div>
              <div>
                Type <code className="text-[#0071E3] dark:text-[#0A84FF] font-mono font-semibold">/teach &lt;decision&gt;</code> to ratify decisions directly into Workspace 5.
              </div>
            </div>
          </Surface>
        </div>

        {/* Center Column: Message Thread & Composer (9 cols in document mode, 5 in split mode) */}
        <div
          className={`space-y-4 ${
            viewMode === 'document'
              ? 'lg:col-span-9'
              : viewMode === 'split'
              ? 'lg:col-span-5'
              : 'hidden'
          }`}
        >
          <Surface className="p-4 sm:p-5 flex flex-col h-[600px] shadow-subtle">
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3 mb-3">
              <div className="min-w-0 pr-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-black dark:text-white truncate">
                    {currentChannel.name}
                  </h3>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-black/[0.05] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#8E8E93] font-mono shrink-0">
                    Logged in as: <strong className="text-black dark:text-white font-medium">{currentUserName}</strong> ({currentUserRole})
                  </span>
                </div>
                <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] truncate mt-0.5">
                  {currentChannel.topic}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Eraser className="w-3.5 h-3.5 text-[#8E8E93]" />}
                onClick={() => setClearDialogOpen(true)}
                title="Clear Channel History"
                className="text-xs shrink-0 text-[#8E8E93] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
              >
                Clear Channel
              </Button>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <div className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-[#8E8E93] mb-2">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-black dark:text-white">No Messages Yet</h4>
                  <p className="text-xs text-[#8E8E93] max-w-sm mt-1">
                    Start the discussion in {currentChannel.name} or type <code className="font-mono text-black dark:text-white">/teach</code> to teach TARS new facts.
                  </p>
                </div>
              ) : (
                messages.map((msg) => {
                  const isAi = !!msg.is_ai;
                  const isOwn = !isAi && Boolean(
                    (currentUserName && msg.sender.trim().toLowerCase() === currentUserName.trim().toLowerCase()) ||
                    msg.sender === 'You'
                  );
                  const isContradiction = isAi && (msg.text.includes('Contradiction') || msg.text.startsWith('⚠️'));

                  let displayName = msg.sender;
                  if (isAi) {
                    displayName = isContradiction ? 'TARS Policy Sentinel' : 'TARS (@TARS)';
                  } else if (isOwn) {
                    displayName = 'You';
                  } else {
                    const roleSuffix = msg.sender_role && !msg.sender.includes('(') ? ` (${msg.sender_role})` : '';
                    displayName = `${msg.sender}${roleSuffix}`;
                  }

                  return (
                    <div
                      key={msg.id}
                      className={`group relative p-3.5 rounded-[14px] text-xs leading-relaxed space-y-1.5 transition-all ${
                        isContradiction
                          ? 'bg-amber-500/[0.08] dark:bg-amber-500/[0.12] border border-amber-500/30 text-black dark:text-white'
                          : isAi
                          ? 'bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.12] dark:border-white/[0.16] text-black dark:text-white'
                          : isOwn
                          ? 'bg-[#0071E3]/[0.05] dark:bg-[#0071E3]/[0.10] border border-[#0071E3]/20 text-black dark:text-white'
                          : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                        <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                          {isContradiction ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          ) : isAi ? (
                            <Sparkles className="w-3.5 h-3.5 text-black dark:text-white shrink-0" />
                          ) : (
                            <User className="w-3.5 h-3.5 text-[#8E8E93] shrink-0" />
                          )}
                          <span>{displayName}</span>
                          {isOwn && currentUserRole && (
                            <span className="text-[10px] text-[#8E8E93] font-normal font-mono">({currentUserRole})</span>
                          )}
                          {msg.is_edited && (
                            <span className="text-[10px] text-[#8E8E93] font-normal italic">(edited)</span>
                          )}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[#8E8E93]">{formatMessageTime(msg.created_at)}</span>
                          {/* Hover Actions: Edit / Delete */}
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            {isOwn && editingMessageId !== msg.id && (
                              <button
                                onClick={() => handleStartEdit(msg)}
                                className="p-1 rounded hover:bg-black/[0.08] dark:hover:bg-white/[0.12] text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors"
                                title="Edit Message"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                            {(isOwn || currentUserRole === 'FOUNDER') && (
                              <button
                                onClick={() => handleDeleteMessage(msg.id)}
                                className="p-1 rounded hover:bg-[#FF3B30]/15 text-[#8E8E93] hover:text-[#FF3B30] transition-colors"
                                title="Delete Message"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                    {/* Message Body or Edit Field */}
                    {editingMessageId === msg.id ? (
                      <div className="pt-1 space-y-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full p-2 text-xs sm:text-sm rounded-[8px] border border-black/[0.15] dark:border-white/[0.20] bg-white dark:bg-[#1C1C1E] text-black dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0071E3]"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-1 text-[11px] rounded bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.10] text-[#6E6E73] dark:text-[#8E8E93] transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => handleSaveEdit(msg.id)}
                            className="px-2 py-1 text-[11px] rounded bg-[#0071E3] hover:bg-[#0077ED] text-white flex items-center gap-1 transition-colors"
                          >
                            <Check className="w-3 h-3" /> Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-black dark:text-[#EBEBF5] font-sans leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}

                    {msg.provenance && (
                      <div className="pt-2 mt-1 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-black dark:text-white font-medium flex items-center gap-1.5">
                        <span>Evidence Grounding:</span>
                        <span className="underline decoration-black/40 dark:decoration-white/40 underline-offset-2">
                          {msg.provenance}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
              )}
              {/* Invisible anchor for smooth auto-scroll */}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Composer */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] flex items-center gap-2 mt-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Discuss topic, @TARS for context, or '/teach <policy or decision>'..."
                disabled={isSending}
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white transition-all disabled:opacity-50"
              />
              <Button
                type="submit"
                variant="primary"
                size="sm"
                icon={<Send className="w-3.5 h-3.5" />}
                disabled={!inputMessage.trim() || isSending}
              >
                {isSending ? 'Sending...' : 'Send'}
              </Button>
            </form>
          </Surface>
        </div>

        {/* Right / Full Column: Optional Relationship Canvas (SVG diagram) */}
        {(viewMode === 'split' || viewMode === 'canvas') && (
          <div
            className={`space-y-4 ${
              viewMode === 'split' ? 'lg:col-span-4' : 'lg:col-span-9'
            }`}
          >
            <Surface className="p-4 sm:p-5 flex flex-col h-[600px] shadow-subtle">
              <div className="flex items-center justify-between border-b border-black/[0.08] dark:border-white/[0.08] pb-3 mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                    <span>Decision & Commitment Topology</span>
                  </h4>
                  <p className="text-[11px] text-[#8E8E93]">
                    Analytical relationship view (Never decorative, zero particle effects)
                  </p>
                </div>
              </div>

              {/* Interactive SVG Relationship Canvas */}
              {canvasNodes.length === 0 ? (
                <div className="flex-1 rounded-[16px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/50 dark:bg-[#1C1C1E] flex flex-col items-center justify-center p-8 text-center space-y-2">
                  <div className="w-10 h-10 rounded-full bg-black/[0.05] dark:bg-white/[0.08] flex items-center justify-center text-[#8E8E93] mb-1">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-semibold text-black dark:text-white">No Decision Nodes Mapped</h4>
                  <p className="text-xs text-[#8E8E93] max-w-sm">
                    Record company decisions in Workspace 3 to visualize institutional topology, trade-offs, and invariants here.
                  </p>
                </div>
              ) : (
                <div className="flex-1 rounded-[16px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/50 dark:bg-[#1C1C1E] relative overflow-hidden flex items-center justify-center p-4">
                  <svg className="w-full h-full" viewBox="0 0 700 360">
                    {/* Render Connecting Edges if multiple nodes */}
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

                    {/* Render Analytical Nodes */}
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
                            rx="12"
                            className={isSelected ? 'fill-white dark:fill-[#242428]' : 'fill-white dark:fill-[#141416]'}
                            stroke={
                              isSelected
                                ? '#0071E3'
                                : n.isConflict
                                ? '#E5A000'
                                : 'rgba(128,128,128,0.25)'
                            }
                            strokeWidth={isSelected ? '2' : '1'}
                          />
                          <text
                            x="12"
                            y="22"
                            fill="#8E8E93"
                            fontSize="9"
                            fontWeight="bold"
                          >
                            {n.type.toUpperCase()}
                          </text>
                          <text
                            x="12"
                            y="40"
                            fill="currentColor"
                            className="text-black dark:text-white"
                            fontSize="11"
                            fontWeight="bold"
                          >
                            {n.title}
                          </text>
                          <text
                            x="12"
                            y="58"
                            fill="#8E8E93"
                            fontSize="9.5"
                          >
                            {n.detail.slice(0, 24)}...
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              )}

              {/* Selected Node Details Footer */}
              {selectedNode && (
                <div className="mt-3 p-3.5 rounded-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-black dark:text-white">
                      {canvasNodes.find((n) => n.id === selectedNode)?.title || selectedNode}
                    </span>
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] ml-2">
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
            </Surface>
          </div>
        )}
      </div>

      {/* Clear Channel Confirmation Dialog */}
      <Dialog
        isOpen={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        title="Clear Discussion Channel"
        description={`Are you sure you want to clear all message history in ${currentChannel.name}? This action cannot be undone.`}
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
        <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93]">
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
        <form onSubmit={handleCreateChannel} className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] mb-1.5 uppercase tracking-wide">
              Channel Name
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-[#8E8E93] font-mono text-sm">#</span>
              <input
                type="text"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value.replace(/^#/, ''))}
                placeholder="e.g. enterprise-security"
                required
                autoFocus
                className="w-full pl-8 pr-3.5 py-2.5 text-xs sm:text-sm rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 dark:focus:ring-[#0A84FF]/20 focus:border-[#0071E3] dark:focus:border-[#0A84FF] transition-all font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] mb-1.5 uppercase tracking-wide">
              Discussion Topic & Purpose
            </label>
            <textarea
              value={newChannelTopic}
              onChange={(e) => setNewChannelTopic(e.target.value)}
              placeholder="Describe the trade-off, proposal, or context being explored..."
              rows={3}
              className="w-full px-3.5 py-2.5 text-xs sm:text-sm rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 dark:focus:ring-[#0A84FF]/20 focus:border-[#0071E3] dark:focus:border-[#0A84FF] transition-all resize-none"
            />
          </div>
        </form>
      </Dialog>
    </div>
  );
};
