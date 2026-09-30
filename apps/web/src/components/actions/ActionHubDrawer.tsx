import React, { useState } from 'react';
import { Drawer } from '../primitives/Drawer';
import { ActionItemDTO } from '../../types/contracts';
import { ActionItemRow } from './ActionItemRow';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { EmptyState } from '../primitives/EmptyState';
import { Button } from '../primitives/Button';
import {
  CheckCircle2,
  Copy,
  Check,
  Plus,
  Kanban,
  List,
  Calendar,
  User,
  ExternalLink,
} from 'lucide-react';

interface ActionHubDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  actionItems: ActionItemDTO[];
  onStatusChange: (id: string, newStatus: ActionItemDTO['status']) => void;
  onNavigateSource: (sourceType: string, sourceId: string) => void;
  onAddItem: (item: Omit<ActionItemDTO, 'id'>) => void;
  onDeleteItem?: (id: string) => void;
}

type FilterStatus = 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'DONE';
type LayoutView = 'list' | 'kanban';

export const ActionHubDrawer: React.FC<ActionHubDrawerProps> = ({
  isOpen,
  onClose,
  actionItems,
  onStatusChange,
  onNavigateSource,
  onAddItem,
  onDeleteItem,
}) => {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [layout, setLayout] = useState<LayoutView>('list');
  const [copiedStandup, setCopiedStandup] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);

  // New task form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState('Founder');
  const [department, setDepartment] = useState('General');
  const [priority, setPriority] = useState<ActionItemDTO['priority']>('MEDIUM');

  const filteredItems = actionItems.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const openCount = actionItems.filter((i) => i.status === 'OPEN').length;
  const inProgressCount = actionItems.filter((i) => i.status === 'IN_PROGRESS').length;
  const doneCount = actionItems.filter((i) => i.status === 'DONE').length;

  const handleCopyStandup = () => {
    const standupText = `🚀 TARS Daily Standup Summary (${new Date().toLocaleDateString()}):\n\n` +
      `📌 IN PROGRESS (${inProgressCount}):\n` +
      actionItems
        .filter((i) => i.status === 'IN_PROGRESS')
        .map((i) => `• [${i.owner}] ${i.title ? `${i.title}: ` : ''}${i.description} (Source: ${i.source_id})`)
        .join('\n') +
      `\n\n📋 OPEN BACKLOG (${openCount}):\n` +
      actionItems
        .filter((i) => i.status === 'OPEN')
        .map((i) => `• [${i.owner}] ${i.title ? `${i.title}: ` : ''}${i.description} (Source: ${i.source_id})`)
        .join('\n') +
      `\n\n✅ COMPLETED (${doneCount}):\n` +
      actionItems
        .filter((i) => i.status === 'DONE')
        .map((i) => `• [${i.owner}] ${i.title ? `${i.title}: ` : ''}${i.description}`)
        .join('\n');

    navigator.clipboard.writeText(standupText);
    setCopiedStandup(true);
    setTimeout(() => setCopiedStandup(false), 2000);
  };

  const handleCreateTask = () => {
    if (!desc.trim()) return;
    onAddItem({
      title: title.trim() || undefined,
      description: desc.trim(),
      owner,
      department,
      priority,
      status: 'OPEN',
      source_type: 'CHAT',
      source_id: 'Manual Standup Task',
      source_offset: 'Today',
      deadline: Date.now() + 3 * 86400000,
    });
    setTitle('');
    setDesc('');
    setAddModalOpen(false);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Unified Action Hub"
      subtitle="Cross-workspace execution checklist linked to source decisions & audio"
      width="max-w-md sm:max-w-2xl"
      footer={
        <div className="flex items-center justify-between text-[12px] text-[#6E6E73] dark:text-[#8E8E93] w-full">
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums">{doneCount}/{actionItems.length} completed</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={copiedStandup ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            onClick={handleCopyStandup}
          >
            {copiedStandup ? 'Copied!' : 'Copy Standup'}
          </Button>
        </div>
      }
    >
      {/* Top Controls: Filter & View Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-black/[0.08] dark:border-white/[0.08]">
        <SegmentedControl
          size="sm"
          options={[
            { value: 'ALL', label: 'All', badge: actionItems.length },
            { value: 'OPEN', label: 'Open', badge: openCount },
            { value: 'IN_PROGRESS', label: 'In Progress', badge: inProgressCount },
            { value: 'DONE', label: 'Done', badge: doneCount },
          ]}
          value={filter}
          onChange={(v) => setFilter(v as FilterStatus)}
        />

        <div className="flex items-center gap-2">
          <SegmentedControl
            size="sm"
            options={[
              { value: 'list', label: 'List' },
              { value: 'kanban', label: 'Kanban' },
            ]}
            value={layout}
            onChange={(v) => setLayout(v as LayoutView)}
          />
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setAddModalOpen(true)}
          >
            Add Task
          </Button>
        </div>
      </div>

      {/* Add Task Quick Form */}
      {addModalOpen && (
        <div className="p-3.5 rounded-[8px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-3">
          <div className="text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider">
            New Action Item
          </div>
          <input
            type="text"
            placeholder="Short Title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-1.5 text-[13px] rounded-[6px] border border-black/10 dark:border-white/12 bg-white dark:bg-[#18191D] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
          />
          <textarea
            rows={2}
            placeholder="Describe the action..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3 py-1.5 text-[13px] rounded-[6px] border border-black/10 dark:border-white/12 bg-white dark:bg-[#18191D] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="px-2.5 py-1.5 text-[12px] rounded-[6px] border border-black/10 dark:border-white/12 bg-white dark:bg-[#18191D] text-black dark:text-white focus:outline-none"
              >
                <option value="Alex Vance">Alex Vance (CEO)</option>
                <option value="Dr. Elena Rostova">Dr. Elena Rostova (CTO)</option>
                <option value="Marcus Chen">Marcus Chen (Product)</option>
                <option value="Sarah Jenkins">Sarah Jenkins (Sales)</option>
                <option value="Liam Patel">Liam Patel (Backend)</option>
                <option value="Chloe Dubois">Chloe Dubois (Frontend)</option>
              </select>

              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="px-2.5 py-1.5 text-[12px] rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none"
              >
                <option value="General">General</option>
                <option value="Executive">Executive</option>
                <option value="Engineering">Engineering</option>
                <option value="Product">Product</option>
                <option value="Sales">Sales</option>
              </select>

              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="px-2.5 py-1.5 text-[12px] rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none"
              >
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={handleCreateTask}>
                Save Task
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 1: LIST VIEW */}
      {layout === 'list' && (
        <div className="space-y-2">
          {filteredItems.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="w-5 h-5 text-neutral-500 dark:text-neutral-400" />}
              title="No tasks in this view"
              description="All commitments and action items in this category are up to date."
            />
          ) : (
            filteredItems.map((item) => (
              <ActionItemRow
                key={item.id}
                item={item}
                onStatusChange={onStatusChange}
                onNavigateSource={onNavigateSource}
                onDelete={onDeleteItem}
              />
            ))
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD VIEW */}
      {layout === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Column: OPEN */}
          <div className="p-3 rounded-[8px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400 uppercase tracking-wider pb-1.5 border-b border-black/10 dark:border-white/10">
              <span>Open</span>
              <span className="font-mono">{openCount}</span>
            </div>
            {actionItems
              .filter((i) => i.status === 'OPEN')
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-[6px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] space-y-2"
                >
                  <p className="text-[12px] font-medium text-black dark:text-white leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">{item.owner}</span>
                    <button
                      onClick={() => onStatusChange(item.id, 'IN_PROGRESS')}
                      className="text-black dark:text-white text-[10px] font-bold uppercase hover:opacity-70 transition-opacity"
                    >
                      Start →
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Column: IN PROGRESS */}
          <div className="p-3 rounded-[8px] border border-black/15 dark:border-white/15 bg-black/[0.03] dark:bg-white/[0.04] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white uppercase tracking-wider pb-1.5 border-b border-black/10 dark:border-white/10">
              <span>In Progress</span>
              <span className="font-mono">{inProgressCount}</span>
            </div>
            {actionItems
              .filter((i) => i.status === 'IN_PROGRESS')
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-[6px] border border-black/10 dark:border-white/12 bg-white dark:bg-[#18191D] space-y-2 shadow-2xs"
                >
                  <p className="text-[12px] font-medium text-black dark:text-white leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">{item.owner}</span>
                    <button
                      onClick={() => onStatusChange(item.id, 'DONE')}
                      className="text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase hover:opacity-70 transition-opacity"
                    >
                      Complete →
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Column: DONE */}
          <div className="p-3 rounded-[8px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
            <div className="flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider pb-1.5 border-b border-black/10 dark:border-white/10">
              <span>Done</span>
              <span className="font-mono">{doneCount}</span>
            </div>
            {actionItems
              .filter((i) => i.status === 'DONE')
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-[6px] border border-black/[0.07] dark:border-white/[0.07] bg-white/60 dark:bg-[#18191D]/60 space-y-2 opacity-70"
                >
                  <p className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] leading-snug line-through">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[#8E8E93]">{item.owner}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-bold">✓</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </Drawer>
  );
};
