import React from 'react';
import { ActionItemDTO } from '../../types/contracts';
import { CheckCircle2, Circle, Clock, User, Calendar } from 'lucide-react';
import { ProvenanceLink } from '../provenance/ProvenanceLink';

interface ActionItemRowProps {
  item: ActionItemDTO;
  onStatusChange: (id: string, newStatus: ActionItemDTO['status']) => void;
  onNavigateSource: (sourceType: string, sourceId: string) => void;
}

export const ActionItemRow: React.FC<ActionItemRowProps> = ({
  item,
  onStatusChange,
  onNavigateSource,
}) => {
  const nextStatus = (curr: ActionItemDTO['status']): ActionItemDTO['status'] => {
    if (curr === 'OPEN') return 'IN_PROGRESS';
    if (curr === 'IN_PROGRESS') return 'DONE';
    return 'OPEN';
  };

  const isDone = item.status === 'DONE';
  const isInProgress = item.status === 'IN_PROGRESS';

  const statusConfig = {
    OPEN: {
      icon: <Circle className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93]" />,
      badge: 'text-[#6E6E73] dark:text-[#8E8E93] bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.09] dark:border-white/[0.10]',
      label: 'Open',
    },
    IN_PROGRESS: {
      icon: <Clock className="w-4 h-4 text-[#B25000] dark:text-[#FF9F0A]" />,
      badge: 'text-[#B25000] dark:text-[#FF9F0A] bg-[#FF9500]/[0.10] dark:bg-[#FF9F0A]/[0.12] border-[#FF9500]/[0.22] dark:border-[#FF9F0A]/[0.22]',
      label: 'In Progress',
    },
    DONE: {
      icon: <CheckCircle2 className="w-4 h-4 text-[#1D8348] dark:text-[#30D158]" />,
      badge: 'text-[#1D8348] dark:text-[#30D158] bg-[#34C759]/[0.10] dark:bg-[#30D158]/[0.12] border-[#34C759]/[0.22] dark:border-[#30D158]/[0.22]',
      label: 'Done',
    },
  };

  const config = statusConfig[item.status];
  const formattedDate = item.deadline
    ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  return (
    <div
      className={[
        'group flex items-start gap-3 p-3.5 rounded-[14px] select-text transition-colors',
        'border border-black/[0.08] dark:border-white/[0.08]',
        'bg-white dark:bg-[#1C1C1E]',
        'hover:bg-black/[0.015] dark:hover:bg-white/[0.025]',
        isDone ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Status toggle button */}
      <button
        type="button"
        onClick={() => onStatusChange(item.id, nextStatus(item.status))}
        className="mt-0.5 p-1 rounded-[8px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors focus-visible:outline-none shrink-0"
        title={`Advance status (${item.status})`}
      >
        {config.icon}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={[
            'text-[13px] font-medium leading-snug',
            isDone
              ? 'line-through text-[#8E8E93]'
              : 'text-black dark:text-white',
          ].join(' ')}
        >
          {item.description}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
          <span className="inline-flex items-center gap-1">
            <User className="w-3 h-3 opacity-70" />
            <span className="font-medium">{item.owner}</span>
          </span>

          {formattedDate && (
            <>
              <span className="opacity-30">·</span>
              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                <Calendar className="w-3 h-3 opacity-70" />
                {formattedDate}
              </span>
            </>
          )}

          <span className="opacity-30">·</span>
          <ProvenanceLink
            type={
              item.source_type === 'CALL' ? 'call'
              : item.source_type === 'DECISION' ? 'decision'
              : item.source_type === 'ARCHITECTURE' ? 'code'
              : 'general'
            }
            sourceTitle={item.source_id}
            location={item.source_offset}
            onClick={() => onNavigateSource(item.source_type, item.source_id)}
          />
        </div>
      </div>

      {/* Status pill */}
      <button
        type="button"
        onClick={() => onStatusChange(item.id, nextStatus(item.status))}
        className={[
          'text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-[6px] border shrink-0 transition-opacity hover:opacity-80',
          config.badge,
        ].join(' ')}
      >
        {config.label}
      </button>
    </div>
  );
};
