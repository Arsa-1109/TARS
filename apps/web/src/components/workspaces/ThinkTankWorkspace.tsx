import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { EmptyState } from '../primitives/EmptyState';
import { api } from '../../services/client';
import { chatApi, ChatMessage } from '../../services/chatApi';
import { DecisionItem, SearchCitation } from '../../types/contracts';
import { MOCK_THINKTANK_CHANNELS, MOCK_THINKTANK_MESSAGES } from '../../mocks/fixtures';
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
  Pencil,
  Trash2,
  Check,
  X,
} from 'lucide-react';

interface ThinkTankWorkspaceProps {
  onNavigateDecision: (decId: string) => void;
}

type ViewMode = 'document' | 'split' | 'canvas';

export const formatMessageTime = (rawTime: string | number): string => {
  if (!rawTime) return 'Just now';
  if (typeof rawTime === 'string' && (rawTime.toLowerCase() === 'just now' || rawTime.length < 6)) return rawTime;
  const date = typeof rawTime === 'number'
    ? new Date(rawTime > 1e11 ? rawTime : rawTime * 1000)
    : new Date(rawTime);
  if (isNaN(date.getTime())) return String(rawTime);

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (isToday) return `Today, ${timeStr}`;

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return `Yesterday, ${timeStr}`;

  return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
};

export const ThinkTankWorkspace: React.FC<ThinkTankWorkspaceProps> = ({
  onNavigateDecision,
}) => {
  const [decisions, setDecisions] = useState<DecisionItem[]>([]);

  useEffect(() => {
    api.getDecisions().then((d) => setDecisions(d)).catch(() => {});
  }, []);

  const [channels, setChannels] = useState<{ id: string; name: string; topic: string }[]>([
    ...MOCK_THINKTANK_CHANNELS,
    { id: 'general', name: '#general', topic: 'Company strategic alignment & cross-functional topics' }
  ]);
  const [activeChannelId, setActiveChannelId] = useState(MOCK_THINKTANK_CHANNELS[0]?.id || 'general');
  const [messages, setMessages] = useState<Record<string, Array<{ id: string; sender: string; time: string; text: string; isAi?: boolean; provenance?: string; isEdited?: boolean }>>>({
    ...MOCK_THINKTANK_MESSAGES,
    general: [
      {
        id: 'msg-welcome',
        sender: 'TARS (@TARS)',
        time: 'Just now',
        isAi: true,
        text: 'Welcome to Think Tank. Use this workspace to debate strategic changes, roadmap adjustments, and architectural shifts. TARS monitors threads in real-time to alert on policy contradictions and client commitments.',
      }
    ]
  });
  const [inputMessage, setInputMessage] = useState('');
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of thread on new messages (Bug 8)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeChannelId]);

  // Load persisted messages from SQLite API (Bug 9)
  useEffect(() => {
    const controller = new AbortController();
    chatApi.getMessages(activeChannelId, controller.signal).then((persisted) => {
      if (persisted && persisted.length > 0) {
        const mapped = persisted.map((m) => ({
          id: m.id,
          sender: m.user_id === 'tars' || m.user_role === 'SYSTEM' ? 'TARS (@TARS)' : m.user_name || 'You',
          time: m.created_at,
          text: m.content,
          isAi: m.user_id === 'tars' || m.user_role === 'SYSTEM',
          isEdited: m.is_edited,
        }));
        setMessages((prev) => ({
          ...prev,
          [activeChannelId]: mapped,
        }));
      }
    });
    return () => controller.abort();
  }, [activeChannelId]);

  // Create Channel Modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');

  const currentChannel = channels.find((c) => c.id === activeChannelId) || channels[0] || {
    id: 'general',
    name: '#general',
    topic: 'Company strategic alignment & cross-functional topics'
  };
  const channelMessages = messages[activeChannelId] || [];

  const handleCreateChannel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const formattedId = newChannelName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '');
    const cleanName = '#' + (newChannelName.startsWith('#') ? newChannelName.slice(1) : newChannelName);

    const newCh = {
      id: formattedId || `ch-${Date.now()}`,
      name: cleanName,
      topic: newChannelTopic.trim() || 'General discussion topic',
    };

    setChannels((prev) => [...prev, newCh]);
    setMessages((prev) => ({
      ...prev,
      [newCh.id]: [
        {
          id: `m-init-${Date.now()}`,
          sender: 'TARS (@TARS)',
          time: new Date().toISOString(),
          isAi: true,
          text: `Channel ${cleanName} created. I am monitoring this discussion thread to ground decisions in institutional context and prevent conflicting commitments.`,
        },
      ],
    }));

    setActiveChannelId(newCh.id);
    setCreateDialogOpen(false);
    setNewChannelName('');
    setNewChannelTopic('');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;
    const userPrompt = inputMessage.trim();
    setInputMessage('');

    // Check for /teach command (Bug 20: Direct Knowledge Teaching)
    if (userPrompt.startsWith('/teach ')) {
      const fact = userPrompt.slice(7).trim();
      if (fact) {
        try {
          const teachRes = await chatApi.teachMemory({
            content: fact,
            title: `Direct Fact: ${fact.slice(0, 36)}`,
            category: 'ORGANIZATIONAL_FACT',
            clearance: 'ALL_TEAM',
          });
          const teachConfirmMsg = {
            id: `m-teach-${Date.now()}`,
            sender: 'TARS (@TARS)',
            time: new Date().toISOString(),
            isAi: true,
            text: `🧠 Institutional Fact Committed: "${fact}" (Memory ID: ${teachRes.memory_id}). This rule is now indexed into sovereign organizational memory and will be cited in future discussions.`,
            provenance: 'Direct Sovereign Teaching (/teach)',
          };
          setMessages((prev) => ({
            ...prev,
            [activeChannelId]: [...(prev[activeChannelId] || []), teachConfirmMsg],
          }));
          return;
        } catch (teachErr) {
          console.error('Teach error:', teachErr);
        }
      }
    }

    const tempId = `m-${Date.now()}`;
    const newMsg = {
      id: tempId,
      sender: 'You',
      time: new Date().toISOString(),
      text: userPrompt,
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
    }));

    // Persist message to SQLite
    try {
      const saved = await chatApi.sendMessage({
        channel_id: activeChannelId,
        content: userPrompt,
        sender_id: 'usr-current',
        sender_name: 'You',
        sender_role: 'ENGINEER',
      });
      newMsg.id = saved.id;
      newMsg.time = saved.created_at;
    } catch (err) {
      console.warn('Could not persist message:', err);
    }

    // TARS monitors threads in real-time and evaluates all messages via live Cortex & SLM
    try {
      const cleanQuery = newMsg.text.replace(/@TARS/gi, '').trim() || newMsg.text;

      // 1. Check for institutional decision contradictions
      const conflictRes = await api.checkContradiction(cleanQuery);

      let aiText = '';
      let provenance = '';

      if (conflictRes.has_conflict) {
        aiText = `⚠️ Contradiction Detected: ${conflictRes.explanation}`;
        provenance = conflictRes.conflicting_decision_id
          ? `Decision ${conflictRes.conflicting_decision_id} · Local Institutional Graph`
          : 'Institutional Invariant Rule';
      } else {
        // 2. Query knowledge base for institutional context with local Compound SLM
        const ragRes = await api.search({ query: cleanQuery });
        aiText = ragRes.answer;
        if (ragRes.citations && ragRes.citations.length > 0) {
          provenance = ragRes.citations.map((c: SearchCitation) => c.doc_title || c.doc_id).slice(0, 3).join(' · ');
        } else {
          provenance = 'TARS Institutional Cortex Engine';
        }
      }

      const aiMsg = {
        id: `m-ai-${Date.now()}`,
        sender: 'TARS (@TARS)',
        time: new Date().toISOString(),
        isAi: true,
        text: aiText,
        provenance: provenance || undefined,
      };

      setMessages((prev) => ({
        ...prev,
        [activeChannelId]: [...(prev[activeChannelId] || []), aiMsg],
      }));

      // Persist AI reply
      chatApi.sendMessage({
        channel_id: activeChannelId,
        content: aiText,
        sender_id: 'tars',
        sender_name: 'TARS (@TARS)',
        sender_role: 'SYSTEM',
      }).catch(() => {});
    } catch (err) {
      console.error('Think Tank TARS evaluation error:', err);
    }
  };

  const handleEditMessage = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await chatApi.updateMessage(msgId, editingText.trim());
      setMessages((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] || []).map((m) =>
          m.id === msgId ? { ...m, text: editingText.trim(), isEdited: true } : m
        ),
      }));
      setEditingMessageId(null);
      setEditingText('');
    } catch (err) {
      console.error('Error updating message:', err);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      await chatApi.deleteMessage(msgId);
      setMessages((prev) => ({
        ...prev,
        [activeChannelId]: (prev[activeChannelId] || []).filter((m) => m.id !== msgId),
      }));
    } catch (err) {
      console.error('Error deleting message:', err);
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
        description="Focused asynchronous topic discussions with instant institutional context injection and an optional relationship canvas."
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

            <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] px-2 text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
              Type <code className="text-black dark:text-white font-mono font-semibold">@TARS</code> to query historical context.
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
              <div>
                <h3 className="text-sm font-semibold text-black dark:text-white">
                  {currentChannel.name}
                </h3>
                <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] truncate mt-0.5">
                  {currentChannel.topic}
                </p>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {channelMessages.map((msg) => {
                const isEditing = editingMessageId === msg.id;
                const canModify = !msg.isAi && msg.sender !== 'TARS (@TARS)';

                return (
                  <div
                    key={msg.id}
                    className={`p-3.5 rounded-[14px] text-xs leading-relaxed space-y-1.5 group transition-all ${
                      msg.isAi
                        ? 'bg-black/[0.04] dark:bg-white/[0.06] border border-black/[0.12] dark:border-white/[0.16] text-black dark:text-white'
                        : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                      <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                        {msg.isAi && <Sparkles className="w-3.5 h-3.5 text-black dark:text-white" />}
                        {msg.sender}
                        {msg.isEdited && (
                          <span className="text-[10px] text-[#8E8E93] font-normal italic">(edited)</span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[#8E8E93] text-[10px]">{formatMessageTime(msg.time)}</span>
                        {canModify && !isEditing && (
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingMessageId(msg.id);
                                setEditingText(msg.text);
                              }}
                              className="p-1 rounded text-[#8E8E93] hover:text-black dark:hover:text-white"
                              title="Edit message"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteMessage(msg.id)}
                              className="p-1 rounded text-[#8E8E93] hover:text-[#FF3B30]"
                              title="Delete message"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {isEditing ? (
                      <div className="space-y-2 pt-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs rounded-[8px] border border-black/[0.15] dark:border-white/[0.20] bg-white dark:bg-[#1C1C1E] text-black dark:text-white focus:outline-none"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleEditMessage(msg.id);
                            if (e.key === 'Escape') setEditingMessageId(null);
                          }}
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setEditingMessageId(null)}
                            className="px-2 py-0.5 rounded text-[11px] text-[#8E8E93] hover:text-black dark:hover:text-white"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditMessage(msg.id)}
                            className="px-2.5 py-0.5 rounded bg-black dark:bg-white text-white dark:text-black text-[11px] font-medium"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs sm:text-sm text-black dark:text-[#EBEBF5] font-sans leading-relaxed">
                        {msg.text}
                      </p>
                    )}

                    {msg.provenance && (
                      <div className="pt-2 mt-1 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-black dark:text-white font-medium flex items-center gap-1.5">
                        <span>Evidence Grounding:</span>
                        <span className="underline decoration-black/40 dark:decoration-white/40 underline-offset-2">{msg.provenance}</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {/* Auto-scroll anchor */}
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
                placeholder="Discuss topic, @TARS to cite decisions, or /teach <fact> to record memory..."
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white transition-all"
              />
              <Button type="submit" variant="primary" size="sm" icon={<Send className="w-3.5 h-3.5" />}>
                Send
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
