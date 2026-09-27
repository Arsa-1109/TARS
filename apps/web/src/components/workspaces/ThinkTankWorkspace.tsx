import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { Dialog } from '../primitives/Dialog';
import { SegmentedControl } from '../primitives/SegmentedControl';
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
} from 'lucide-react';

interface ThinkTankWorkspaceProps {
  onNavigateDecision: (decId: string) => void;
}

type ViewMode = 'document' | 'split' | 'canvas';

export const ThinkTankWorkspace: React.FC<ThinkTankWorkspaceProps> = ({
  onNavigateDecision,
}) => {
  const [channels, setChannels] = useState(MOCK_THINKTANK_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState('pricing-strategy');
  const [messages, setMessages] = useState(MOCK_THINKTANK_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const [selectedNode, setSelectedNode] = useState<string | null>('node-2');

  // Create Channel Modal state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelTopic, setNewChannelTopic] = useState('');

  const currentChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
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
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;
    const newMsg = {
      id: `m-${Date.now()}`,
      sender: 'You',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      text: inputMessage.trim(),
    };

    setMessages((prev) => ({
      ...prev,
      [activeChannelId]: [...(prev[activeChannelId] || []), newMsg],
    }));
    setInputMessage('');

    // If query includes @TARS or ask, trigger simulated synthesis
    if (newMsg.text.includes('@TARS') || newMsg.text.toLowerCase().includes('simulate')) {
      setTimeout(() => {
        const aiMsg = {
          id: `m-ai-${Date.now()}`,
          sender: 'TARS (@TARS)',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isAi: true,
          text: "Evaluated in-channel proposal against active knowledge graph: Decision #14 restricts bespoke engineering prior to Q4. If this proposal advances, counter-offering with an OIDC provider preserves $80k ARR with zero branch divergence.",
          provenance: "Decision #14 · ADR-014 · Call #ACME-01",
        };
        setMessages((prev) => ({
          ...prev,
          [activeChannelId]: [...(prev[activeChannelId] || []), aiMsg],
        }));
      }, 700);
    }
  };

  // Structured diagram entities for the optional canvas
  const canvasNodes = [
    {
      id: 'node-1',
      title: 'Acme Corp ($80k ARR)',
      type: 'Customer Request',
      x: 40,
      y: 80,
      detail: 'Mandatory on-prem SAML 2.0 by May 1st',
    },
    {
      id: 'node-2',
      title: 'Decision #14',
      type: 'Company Policy',
      x: 280,
      y: 80,
      detail: 'Zero enterprise customisations before Q4',
      isConflict: true,
    },
    {
      id: 'node-3',
      title: 'Self-Serve Product Launch',
      type: 'Core Milestone',
      x: 520,
      y: 80,
      detail: '3.5-week delay if 2 devs reallocated',
    },
    {
      id: 'node-4',
      title: 'Runway Impact (-1.8 mo)',
      type: 'Financial Simulation',
      x: 280,
      y: 220,
      detail: 'Net cash runway drops from 11.4 to 9.6 mo',
    },
  ];

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
              {channelMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3.5 rounded-[14px] text-xs leading-relaxed space-y-1.5 ${
                    msg.isAi
                      ? 'bg-[#0071E3]/[0.06] dark:bg-[#0A84FF]/[0.08] border border-[#0071E3]/25 dark:border-[#0A84FF]/30 text-black dark:text-white'
                      : 'bg-[#F5F5F7] dark:bg-[#2C2C2E] border border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                    <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                      {msg.isAi && <Sparkles className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />}
                      {msg.sender}
                    </span>
                    <span className="font-mono text-[#8E8E93]">{msg.time}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-black dark:text-[#EBEBF5] font-sans leading-relaxed">
                    {msg.text}
                  </p>
                  {msg.provenance && (
                    <div className="pt-2 mt-1 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-[#0071E3] dark:text-[#0A84FF] font-medium flex items-center gap-1.5">
                      <span>Evidence Grounding:</span>
                      <span className="underline decoration-[#0071E3]/40 underline-offset-2">{msg.provenance}</span>
                    </div>
                  )}
                </div>
              ))}
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
                placeholder="Discuss topic or type @TARS to cite past decisions..."
                className="flex-1 px-3.5 py-2.5 text-xs sm:text-sm rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 dark:focus:ring-[#0A84FF]/20 focus:border-[#0071E3] dark:focus:border-[#0A84FF] transition-all"
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
              <div className="flex-1 rounded-[16px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/50 dark:bg-[#1C1C1E] relative overflow-hidden flex items-center justify-center p-4">
                <svg className="w-full h-full" viewBox="0 0 700 360">
                  {/* Connecting Edges */}
                  <line
                    x1="180"
                    y1="110"
                    x2="280"
                    y2="110"
                    stroke="#FF9500"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <text x="205" y="100" fill="#FF9500" fontSize="10" fontWeight="bold">
                    CONTRADICTS
                  </text>

                  <line
                    x1="420"
                    y1="110"
                    x2="520"
                    y2="110"
                    stroke="rgba(128,128,128,0.3)"
                    strokeWidth="1.5"
                  />
                  <text x="450" y="100" fill="#8E8E93" fontSize="10">
                    DELAYS
                  </text>

                  <line
                    x1="350"
                    y1="150"
                    x2="350"
                    y2="220"
                    stroke="rgba(128,128,128,0.3)"
                    strokeWidth="1.5"
                  />
                  <text x="355" y="185" fill="#8E8E93" fontSize="10">
                    IMPACTS
                  </text>

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
                          width="140"
                          height="70"
                          rx="12"
                          className={isSelected ? 'fill-white dark:fill-[#2C2C2E]' : 'fill-white dark:fill-[#1C1C1E]'}
                          stroke={
                            isSelected
                              ? '#0071E3'
                              : n.isConflict
                              ? '#FF9500'
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
                          y="56"
                          fill="#8E8E93"
                          fontSize="9.5"
                        >
                          {n.detail.slice(0, 22)}...
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Node Details Footer */}
              {selectedNode && (
                <div className="mt-3 p-3.5 rounded-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-black dark:text-white">
                      {canvasNodes.find((n) => n.id === selectedNode)?.title}
                    </span>
                    <span className="text-[#6E6E73] dark:text-[#8E8E93] ml-2">
                      {canvasNodes.find((n) => n.id === selectedNode)?.detail}
                    </span>
                  </div>
                  {selectedNode === 'node-2' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onNavigateDecision('DEC-14')}
                    >
                      Open Decision #14
                    </Button>
                  )}
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
