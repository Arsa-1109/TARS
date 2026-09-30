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
      // 1. Check for explicit /teach slash command
      if (userPrompt.startsWith('/teach ')) {
        const fact = userPrompt.replace(/^\/teach\s+/i, '').trim();
        if (fact) {
          // Send user message to thread
          const userMsg = await chatApi.sendMessage({
            channel_id: activeChannelId,
            sender: 'You',
            sender_role: 'ENGINEER',
            text: userPrompt,
            is_ai: false
          });
          setMessages((prev) => [...prev, userMsg]);

          // Call backend /teach endpoint to persist institutional memory
          await chatApi.teachTars({
            content: fact,
            title: `Fact: ${fact.slice(0, 36)}...`,
            category: 'POLICY',
            clearance: 'ALL_TEAM',
            user_name: 'You',
            user_role: 'ENGINEER'
          });

          // Send confirmation assistant message
          const aiReply = await chatApi.sendMessage({
            channel_id: activeChannelId,
            sender: 'TARS (@TARS)',
            sender_role: 'ASSISTANT',
            sender_type: 'AI',
            text: `Institutional memory successfully updated: "${fact}" recorded and indexed. Accessible in future searches.`,
            provenance: 'TARS Continuous Memory Engine',
            is_ai: true
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
        is_ai: false
      });
      setMessages((prev) => [...prev, userMsg]);

      // 3. Real-time TARS evaluation via live backend Cortex & SLM
      const cleanQuery = userPrompt.replace(/@TARS/gi, '').trim() || userPrompt;

      // Check for institutional decision contradictions
      const conflictRes = await api.checkContradiction(cleanQuery);

      let aiText = '';
      let provenance = '';

      if (conflictRes.has_conflict) {
        aiText = `⚠️ Contradiction Detected: ${conflictRes.explanation}`;
        provenance = conflictRes.conflicting_decision_id
          ? `Decision ${conflictRes.conflicting_decision_id} · Local Institutional Graph`
          : 'Institutional Invariant Rule';
      } else {
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
          <div className="p-3 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] shadow-xs space-y-2">
            <div className="flex items-center justify-between px-1 py-0.5">
              <span className="text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">
                Topic Channels
              </span>
              <button
                onClick={() => setCreateDialogOpen(true)}
                className="w-5 h-5 rounded-[4px] bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/15 text-neutral-700 dark:text-neutral-300 flex items-center justify-center transition-colors"
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
                  className={`w-full text-left px-2.5 py-1.5 rounded-[6px] text-xs flex items-center gap-2 transition-all ${
                    activeChannelId === ch.id
                      ? 'bg-black/[0.05] dark:bg-white/[0.10] font-medium text-black dark:text-white border border-black/10 dark:border-white/10'
                      : 'text-neutral-600 dark:text-neutral-400 hover:bg-black/3 dark:hover:bg-white/5 hover:text-black dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Hash className="w-3 h-3 shrink-0 text-neutral-400" />
                  <span className="truncate">{ch.name.replace('#', '')}</span>
                </button>
              ))}
            </div>

            <div className="pt-2.5 border-t border-black/8 dark:border-white/8 px-1 text-[11px] text-neutral-500 dark:text-neutral-400 space-y-1">
              <div>
                Type <code className="text-black dark:text-white font-mono font-medium">@TARS</code> to query historical context.
              </div>
              <div>
                Type <code className="text-black dark:text-white font-mono font-medium">/teach &lt;fact&gt;</code> to record new policy directly.
              </div>
            </div>
          </div>
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
          <div className="p-4 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] shadow-xs flex flex-col h-[600px]">
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b border-black/8 dark:border-white/8 pb-2.5 mb-3">
              <div className="min-w-0 pr-3">
                <h3 className="text-xs font-semibold text-black dark:text-white truncate">
                  {currentChannel.name}
                </h3>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                  {currentChannel.topic}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<Eraser className="w-3.5 h-3.5" />}
                onClick={() => setClearDialogOpen(true)}
                title="Clear Channel History"
                className="text-xs shrink-0 text-neutral-500 hover:text-red-600"
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
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`group relative p-3 rounded-[8px] text-xs leading-relaxed space-y-1.5 transition-all ${
                      msg.is_ai
                        ? 'bg-neutral-100/70 dark:bg-[#18191D] border border-black/10 dark:border-white/10 text-black dark:text-white'
                        : 'bg-neutral-50 dark:bg-[#15161A] border border-black/6 dark:border-white/8 text-black dark:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                      <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                        {msg.is_ai && <Sparkles className="w-3.5 h-3.5 text-black dark:text-white" />}
                        {msg.sender}
                        {msg.is_edited && (
                          <span className="text-[10px] text-neutral-400 font-normal italic">(edited)</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-neutral-400">{formatMessageTime(msg.created_at)}</span>
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
                    </div>

                    {/* Message Body or Edit Field */}
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
                      <p className="text-xs text-neutral-800 dark:text-neutral-200 font-sans leading-relaxed whitespace-pre-wrap">
                        {msg.text}
                      </p>
                    )}

                    {msg.provenance && (
                      <div className="pt-1.5 mt-1 border-t border-black/6 dark:border-white/8 text-[10px] font-mono text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                        <span className="font-medium text-black dark:text-white">Evidence:</span>
                        <span className="underline decoration-black/20 dark:decoration-white/20 underline-offset-2">
                          {msg.provenance}
                        </span>
                      </div>
                    )}
                  </div>
                ))
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
              className="pt-2.5 border-t border-black/8 dark:border-white/8 flex items-center gap-2 mt-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Discuss topic, @TARS for context, or '/teach Our payment provider is Stripe'..."
                disabled={isSending}
                className="flex-1 px-3 py-2 text-xs rounded-[7px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all disabled:opacity-50"
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
          </div>
        </div>

        {/* Right / Full Column: Optional Relationship Canvas (SVG diagram) */}
        {(viewMode === 'split' || viewMode === 'canvas') && (
          <div
            className={`space-y-4 ${
              viewMode === 'split' ? 'lg:col-span-4' : 'lg:col-span-9'
            }`}
          >
            <div className="p-4 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] shadow-xs flex flex-col h-[600px]">
              <div className="flex items-center justify-between border-b border-black/8 dark:border-white/8 pb-2.5 mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-3.5 h-3.5 text-black dark:text-white" />
                    <span>Decision & Commitment Topology</span>
                  </h4>
                  <p className="text-[10px] text-neutral-500 dark:text-neutral-400">
                    Analytical relationship view (Never decorative, zero particle effects)
                  </p>
                </div>
              </div>

              {/* Interactive SVG Relationship Canvas */}
              {canvasNodes.length === 0 ? (
                <div className="flex-1 rounded-[8px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] flex flex-col items-center justify-center p-8 text-center space-y-2">
                  <div className="w-9 h-9 rounded-full bg-black/5 dark:bg-white/10 flex items-center justify-center text-neutral-400 mb-1">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-semibold text-black dark:text-white">No Decision Nodes Mapped</h4>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-sm">
                    Record company decisions in Workspace 3 to visualize institutional topology, trade-offs, and invariants here.
                  </p>
                </div>
              ) : (
                <div className="flex-1 rounded-[8px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] relative overflow-hidden flex items-center justify-center p-4">
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
                            rx="8"
                            className={isSelected ? 'fill-white dark:fill-[#222327]' : 'fill-white dark:fill-[#18191D]'}
                            stroke={
                              isSelected
                                ? 'currentColor'
                                : n.isConflict
                                ? '#D97706'
                                : 'rgba(128,128,128,0.25)'
                            }
                            strokeWidth={isSelected ? '1.5' : '1'}
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
                <div className="mt-2.5 p-3 rounded-[8px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-xs flex items-center justify-between">
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
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1 uppercase tracking-wider">
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
            <label className="block text-[10px] font-semibold text-neutral-500 dark:text-neutral-400 mb-1 uppercase tracking-wider">
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
