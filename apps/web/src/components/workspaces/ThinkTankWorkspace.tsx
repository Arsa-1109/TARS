import React, { useState } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
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
} from 'lucide-react';

interface ThinkTankWorkspaceProps {
  onNavigateDecision: (decId: string) => void;
}

type ViewMode = 'document' | 'split' | 'canvas';

export const ThinkTankWorkspace: React.FC<ThinkTankWorkspaceProps> = ({
  onNavigateDecision,
}) => {
  const [channels] = useState(MOCK_THINKTANK_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState('pricing-strategy');
  const [messages, setMessages] = useState(MOCK_THINKTANK_MESSAGES);
  const [inputMessage, setInputMessage] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const [selectedNode, setSelectedNode] = useState<string | null>('node-2');

  const currentChannel = channels.find((c) => c.id === activeChannelId) || channels[0];
  const channelMessages = messages[activeChannelId] || [];

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
            <span className="text-xs text-tars-text-tertiary hidden sm:inline">Canvas Mode:</span>
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
            <div className="text-[11px] font-semibold text-tars-text-secondary uppercase tracking-wider px-2 py-1">
              Topic Channels
            </div>
            <div className="space-y-1">
              {channels.map((ch) => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannelId(ch.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-control text-xs flex items-center gap-2 transition-colors ${
                    activeChannelId === ch.id
                      ? 'bg-tars-surface-tertiary font-semibold text-tars-text-primary border border-tars-separator'
                      : 'text-tars-text-secondary hover:bg-tars-surface-secondary hover:text-tars-text-primary'
                  }`}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0 text-tars-text-tertiary" />
                  <span className="truncate">{ch.name.replace('#', '')}</span>
                </button>
              ))}
            </div>

            <div className="pt-3 border-t border-tars-separator/60 px-2 text-[11px] text-tars-text-tertiary">
              Type <code className="text-tars-text-primary font-mono font-semibold">@TARS</code> to query historical context.
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
            <div className="flex items-center justify-between border-b border-tars-separator/60 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-semibold text-tars-text-primary">
                  {currentChannel.name}
                </h3>
                <p className="text-xs text-tars-text-secondary truncate mt-0.5">
                  {currentChannel.topic}
                </p>
              </div>
            </div>

            {/* Message Stream */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
              {channelMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`p-3 rounded-control text-xs leading-relaxed space-y-1 ${
                    msg.isAi
                      ? 'bg-tars-surface-secondary/70 border border-tars-accent/30 text-tars-text-primary'
                      : 'bg-tars-surface border border-tars-separator text-tars-text-primary'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] text-tars-text-secondary">
                    <span className="font-semibold text-tars-text-primary flex items-center gap-1.5">
                      {msg.isAi && <Sparkles className="w-3 h-3 text-tars-accent" />}
                      {msg.sender}
                    </span>
                    <span className="font-mono text-tars-text-tertiary">{msg.time}</span>
                  </div>
                  <p className="text-xs sm:text-sm text-tars-text-primary font-sans leading-relaxed">
                    {msg.text}
                  </p>
                  {msg.provenance && (
                    <div className="pt-1.5 mt-1 border-t border-tars-separator/40 text-[11px] font-mono text-tars-accent">
                      Evidence Grounding: {msg.provenance}
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
              className="pt-3 border-t border-tars-separator/60 flex items-center gap-2 mt-2"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Discuss topic or type @TARS to cite past decisions..."
                className="flex-1 px-3 py-2 text-xs sm:text-sm rounded-control border border-tars-separator bg-tars-canvas text-tars-text-primary focus:outline-none focus:ring-1 focus:ring-tars-accent"
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
              <div className="flex items-center justify-between border-b border-tars-separator/60 pb-3 mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider flex items-center gap-1.5">
                    <GitBranch className="w-4 h-4 text-tars-accent" />
                    <span>Decision & Commitment Topology</span>
                  </h4>
                  <p className="text-[11px] text-tars-text-tertiary">
                    Analytical relationship view (Never decorative, zero particle effects)
                  </p>
                </div>
              </div>

              {/* Interactive SVG Relationship Canvas */}
              <div className="flex-1 rounded-control border border-tars-separator bg-tars-surface-secondary/20 relative overflow-hidden flex items-center justify-center p-4">
                <svg className="w-full h-full" viewBox="0 0 700 360">
                  {/* Connecting Edges */}
                  <line
                    x1="180"
                    y1="110"
                    x2="280"
                    y2="110"
                    stroke="var(--warning-text)"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                  <text x="215" y="100" fill="var(--warning-text)" fontSize="10" fontWeight="bold">
                    CONTRADICTS
                  </text>

                  <line
                    x1="420"
                    y1="110"
                    x2="520"
                    y2="110"
                    stroke="var(--separator)"
                    strokeWidth="1.5"
                  />
                  <text x="450" y="100" fill="var(--text-tertiary)" fontSize="10">
                    DELAYS
                  </text>

                  <line
                    x1="350"
                    y1="150"
                    x2="350"
                    y2="220"
                    stroke="var(--separator)"
                    strokeWidth="1.5"
                  />
                  <text x="355" y="185" fill="var(--text-tertiary)" fontSize="10">
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
                          rx="8"
                          fill="var(--surface)"
                          stroke={
                            isSelected
                              ? 'var(--accent)'
                              : n.isConflict
                              ? 'var(--warning-text)'
                              : 'var(--separator)'
                          }
                          strokeWidth={isSelected ? '2' : '1'}
                          className="transition-all"
                        />
                        <text
                          x="10"
                          y="20"
                          fill="var(--text-tertiary)"
                          fontSize="9"
                          fontWeight="bold"
                        >
                          {n.type.toUpperCase()}
                        </text>
                        <text
                          x="10"
                          y="38"
                          fill="var(--text-primary)"
                          fontSize="11"
                          fontWeight="bold"
                        >
                          {n.title}
                        </text>
                        <text
                          x="10"
                          y="54"
                          fill="var(--text-secondary)"
                          fontSize="9.5"
                        >
                          {n.detail.slice(0, 24)}...
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Node Details Footer */}
              {selectedNode && (
                <div className="mt-3 p-3 rounded-control border border-tars-separator bg-tars-surface-secondary/40 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-semibold text-tars-text-primary">
                      {canvasNodes.find((n) => n.id === selectedNode)?.title}
                    </span>
                    <span className="text-tars-text-secondary ml-2">
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
    </div>
  );
};
