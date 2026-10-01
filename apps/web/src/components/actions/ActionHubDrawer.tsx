import React, { useState, useEffect } from 'react';
import { Drawer } from '../primitives/Drawer';
import { ActionItemDTO, UserProfile } from '../../types/contracts';
import { api } from '../../services/client';
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
  currentUser?: UserProfile | null;
  onStatusChange: (id: string, newStatus: ActionItemDTO['status']) => void;
  onNavigateSource: (sourceType: string, sourceId: string) => void;
  onAddItem: (item: Omit<ActionItemDTO, 'id'>) => void;
  onDeleteItem?: (id: string) => void;
  onViewInLedger?: (blockId: string) => void;
}

type FilterStatus = 'ALL' | 'REVIEW_REQUIRED' | 'APPROVED' | 'IN_PROGRESS' | 'DONE' | 'ROLLED_BACK';
type LayoutView = 'list' | 'kanban';

export const ActionHubDrawer: React.FC<ActionHubDrawerProps> = ({
  isOpen,
  onClose,
  actionItems,
  currentUser,
  onStatusChange,
  onNavigateSource,
  onAddItem,
  onDeleteItem,
  onViewInLedger,
}) => {
  const [filter, setFilter] = useState<FilterStatus>('ALL');
  const [layout, setLayout] = useState<LayoutView>('list');
  const [copiedStandup, setCopiedStandup] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [teamMembers, setTeamMembers] = useState<string[]>([]);

  // New task form state
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [owner, setOwner] = useState(currentUser?.name || 'Unassigned');
  const [department, setDepartment] = useState('General');
  const [priority, setPriority] = useState<ActionItemDTO['priority']>('MEDIUM');

  useEffect(() => {
    if (currentUser?.name) {
      setOwner(currentUser.name);
    }
  }, [currentUser?.name]);

  useEffect(() => {
    if (isOpen) {
      api.getUsers()
        .then((users) => {
          if (users && users.length > 0) {
            const names = Array.from(new Set(users.map((u) => u.name).filter(Boolean)));
            setTeamMembers(names);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const filteredItems = actionItems.filter((item) => {
    if (filter === 'ALL') return true;
    return item.status === filter;
  });

  const openCount = actionItems.filter((i) => i.status === 'OPEN').length;
  const reviewCount = actionItems.filter((i) => i.status === 'REVIEW_REQUIRED' || i.status === 'PROPOSED').length;
  const approvedCount = actionItems.filter((i) => i.status === 'APPROVED').length;
  const inProgressCount = actionItems.filter((i) => i.status === 'IN_PROGRESS' || i.status === 'EXECUTING').length;
  const doneCount = actionItems.filter((i) => i.status === 'DONE' || i.status === 'COMPLETED').length;
  const rolledBackCount = actionItems.filter((i) => i.status === 'ROLLED_BACK').length;

  const handleCopyStandup = () => {
    const standupText = `🚀 TARS Daily Standup Summary (${new Date().toLocaleDateString()}):\n\n` +
      `📌 IN PROGRESS (${inProgressCount}):\n` +
      actionItems
        .filter((i) => i.status === 'IN_PROGRESS' || i.status === 'EXECUTING')
        .map((i) => `• [${i.owner}] ${i.title ? `${i.title}: ` : ''}${i.description} (Source: ${i.source_id})`)
        .join('\n') +
      `\n\n📋 REVIEW REQUIRED / APPROVED (${reviewCount + approvedCount}):\n` +
      actionItems
        .filter((i) => i.status === 'REVIEW_REQUIRED' || i.status === 'PROPOSED' || i.status === 'APPROVED')
        .map((i) => `• [${i.owner}] [${i.status}] ${i.title ? `${i.title}: ` : ''}${i.description} (Source: ${i.source_id})`)
        .join('\n') +
      `\n\n✅ COMPLETED (${doneCount}):\n` +
      actionItems
        .filter((i) => i.status === 'DONE' || i.status === 'COMPLETED')
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
      title="Actions & Tasks"
      subtitle="Tasks and approvals linked to decisions and meetings"
      width="max-w-md sm:max-w-2xl"
      footer={
        <div className="flex items-center justify-between text-[12px] text-[#6E6E73] dark:text-[#8E8E93] w-full">
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums">{doneCount}/{actionItems.length} completed</span>
          </div>
          <Button
            variant="secondary"
            size="sm"
            icon={copiedStandup ? <Check className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" /> : <Copy className="w-3.5 h-3.5" />}
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
            { value: 'REVIEW_REQUIRED', label: 'Review', badge: reviewCount },
            { value: 'APPROVED', label: 'Approved', badge: approvedCount },
            { value: 'IN_PROGRESS', label: 'In Progress', badge: inProgressCount },
            { value: 'DONE', label: 'Done', badge: doneCount },
            { value: 'ROLLED_BACK', label: 'Reverted', badge: rolledBackCount },
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
        <div className="p-4 rounded-[16px] border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] space-y-3">
          <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
            New Action Item
          </div>
          <input
            type="text"
            placeholder="Short Title (optional)..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 py-2 text-[13px] rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] transition-all"
          />
          <textarea
            rows={2}
            placeholder="Describe the action..."
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full px-3.5 py-2 text-[13px] rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] transition-all"
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <select
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                className="px-2.5 py-1.5 text-[12px] rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-white dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none"
              >
                {owner && !teamMembers.includes(owner) && (
                  <option value={owner}>{owner}</option>
                )}
                {teamMembers.map((name) => (
                  <option key={name} value={name}>{name}</option>
                ))}
                {!teamMembers.includes('Unassigned') && owner !== 'Unassigned' && (
                  <option value="Unassigned">Unassigned</option>
                )}
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
              icon={<CheckCircle2 className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />}
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
                onViewInLedger={onViewInLedger}
              />
            ))
          )}
        </div>
      )}

      {/* VIEW 2: KANBAN BOARD VIEW */}
      {layout === 'kanban' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Column: OPEN */}
          <div className="p-3 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider pb-1.5 border-b border-black/[0.08] dark:border-white/[0.08]">
              <span>Open</span>
              <span className="font-mono">{openCount}</span>
            </div>
            {actionItems
              .filter((i) => i.status === 'OPEN')
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] space-y-2"
                >
                  <p className="text-[12px] font-medium text-black dark:text-white leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">{item.owner}</span>
                    <button
                      onClick={() => onStatusChange(item.id, 'IN_PROGRESS')}
                      className="text-[#0071E3] dark:text-[#0A84FF] text-[10px] font-bold uppercase hover:opacity-70"
                    >
                      Start →
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Column: IN PROGRESS */}
          <div className="p-3 rounded-[14px] border border-[#0071E3]/[0.20] dark:border-[#0A84FF]/[0.24] bg-[#0071E3]/[0.03] dark:bg-[#0A84FF]/[0.05] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider pb-1.5 border-b border-[#0071E3]/[0.15] dark:border-[#0A84FF]/[0.20]">
              <span>In Progress</span>
              <span className="font-mono">{inProgressCount}</span>
            </div>
            {actionItems
              .filter((i) => i.status === 'IN_PROGRESS')
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-[12px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#141416] space-y-2 shadow-xs"
                >
                  <p className="text-[12px] font-medium text-black dark:text-white leading-snug">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[#6E6E73] dark:text-[#8E8E93]">{item.owner}</span>
                    <button
                      onClick={() => onStatusChange(item.id, 'DONE')}
                      className="text-[#0071E3] dark:text-[#0A84FF] text-[10px] font-bold uppercase hover:opacity-70"
                    >
                      Complete →
                    </button>
                  </div>
                </div>
              ))}
          </div>

          {/* Column: DONE */}
          <div className="p-3 rounded-[14px] border border-[#0A84FF]/[0.18] dark:border-[#0A84FF]/[0.18] bg-[#0A84FF]/[0.03] dark:bg-[#0A84FF]/[0.04] space-y-2.5">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#0071E3] dark:text-[#0A84FF] uppercase tracking-wider pb-1.5 border-b border-[#0A84FF]/[0.15] dark:border-[#0A84FF]/[0.15]">
              <span>Done</span>
              <span className="font-mono">{doneCount}</span>
            </div>
            {actionItems
              .filter((i) => i.status === 'DONE')
              .map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-[12px] border border-black/[0.07] dark:border-white/[0.07] bg-white/60 dark:bg-[#1C1C1E]/60 space-y-2 opacity-70"
                >
                  <p className="text-[12px] font-medium text-[#6E6E73] dark:text-[#8E8E93] leading-snug line-through">
                    {item.description}
                  </p>
                  <div className="flex items-center justify-between text-[11px] pt-1.5 border-t border-black/[0.06] dark:border-white/[0.06]">
                    <span className="text-[#8E8E93]">{item.owner}</span>
                    <span className="text-[#0071E3] dark:text-[#0A84FF] text-[11px] font-bold">✓</span>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}
    </Drawer>
  );
};
