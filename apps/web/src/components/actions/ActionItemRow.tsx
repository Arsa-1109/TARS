import React, { useState } from 'react';
import { ActionItemDTO, ActionReceipt } from '../../types/contracts';
import {
  CheckCircle2,
  Circle,
  Clock,
  User,
  Calendar,
  Trash2,
  Play,
  RotateCcw,
  Check,
  X,
  Receipt,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import { ProvenanceLink } from '../provenance/ProvenanceLink';
import { ActionReceiptModal } from './ActionReceiptModal';
import { api } from '../../services/client';

interface ActionItemRowProps {
  item: ActionItemDTO;
  onStatusChange: (id: string, newStatus: ActionItemDTO['status']) => void;
  onNavigateSource: (sourceType: string, sourceId: string) => void;
  onDelete?: (id: string) => void;
  onViewInLedger?: (blockId: string) => void;
  onExecuted?: (receipt: ActionReceipt) => void;
}

export const ActionItemRow: React.FC<ActionItemRowProps> = ({
  item,
  onStatusChange,
  onNavigateSource,
  onDelete,
  onViewInLedger,
  onExecuted,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);
  const [isRollingBack, setIsRollingBack] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<ActionReceipt | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const nextStatus = (curr: ActionItemDTO['status']): ActionItemDTO['status'] => {
    if (curr === 'OPEN') return 'IN_PROGRESS';
    if (curr === 'IN_PROGRESS') return 'DONE';
    return 'OPEN';
  };

  const isDone = item.status === 'DONE' || item.status === 'COMPLETED';

  const statusConfig: Record<string, { icon: React.ReactNode; badge: string; label: string }> = {
    OPEN: {
      icon: <Circle className="w-4 h-4 text-[#6E6E73] dark:text-[#8E8E93]" />,
      badge: 'text-[#6E6E73] dark:text-[#8E8E93] bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.09] dark:border-white/[0.10]',
      label: 'Open',
    },
    IN_PROGRESS: {
      icon: <Clock className="w-4 h-4 text-black dark:text-white" />,
      badge: 'text-black dark:text-white bg-black/[0.08] dark:bg-white/[0.12] border-black/[0.15] dark:border-white/[0.20]',
      label: 'In Progress',
    },
    DONE: {
      icon: <CheckCircle2 className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />,
      badge: 'text-[#0071E3] dark:text-[#0A84FF] bg-[#0A84FF]/[0.10] dark:bg-[#0A84FF]/[0.12] border-[#0A84FF]/[0.22] dark:border-[#0A84FF]/[0.22]',
      label: 'Done',
    },
    DETECTED: {
      icon: <Circle className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />,
      badge: 'text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/[0.10] border-[#FF9500]/[0.20]',
      label: 'Detected',
    },
    PROPOSED: {
      icon: <Circle className="w-4 h-4 text-[#5856D6] dark:text-[#5E5CE6]" />,
      badge: 'text-[#5856D6] dark:text-[#5E5CE6] bg-[#5856D6]/[0.10] border-[#5856D6]/[0.20]',
      label: 'Proposed',
    },
    REVIEW_REQUIRED: {
      icon: <Clock className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />,
      badge: 'text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/[0.10] border-[#FF9500]/[0.20]',
      label: 'Review Required',
    },
    APPROVED: {
      icon: <CheckCircle2 className="w-4 h-4 text-[#34C759] dark:text-[#30D158]" />,
      badge: 'text-[#34C759] dark:text-[#30D158] bg-[#34C759]/[0.10] border-[#34C759]/[0.20]',
      label: 'Approved',
    },
    QUEUED: {
      icon: <Clock className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />,
      badge: 'text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/[0.10] border-[#FF9500]/[0.20]',
      label: 'Queued',
    },
    EXECUTING: {
      icon: <Clock className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] animate-spin" />,
      badge: 'text-[#0071E3] dark:text-[#0A84FF] bg-[#0071E3]/[0.10] border-[#0071E3]/[0.20]',
      label: 'Executing',
    },
    COMPLETED: {
      icon: <CheckCircle2 className="w-4 h-4 text-[#34C759] dark:text-[#30D158]" />,
      badge: 'text-[#34C759] dark:text-[#30D158] bg-[#34C759]/[0.10] border-[#34C759]/[0.20]',
      label: 'Completed',
    },
    FAILED: {
      icon: <Circle className="w-4 h-4 text-[#FF3B30] dark:text-[#FF453A]" />,
      badge: 'text-[#FF3B30] dark:text-[#FF453A] bg-[#FF3B30]/[0.10] border-[#FF3B30]/[0.20]',
      label: 'Failed',
    },
    ROLLED_BACK: {
      icon: <RotateCcw className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />,
      badge: 'text-[#FF9500] dark:text-[#FF9F0A] bg-[#FF9500]/[0.10] border-[#FF9500]/[0.20]',
      label: 'Rolled Back',
    },
  };

  const priorityStyles: Record<string, string> = {
    URGENT: 'text-[#FF3B30] dark:text-[#FF453A] bg-[#FF3B30]/10 border-[#FF3B30]/25 font-bold',
    HIGH: 'text-[#E5A000] dark:text-[#E5A000] bg-[#E5A000]/10 border-[#E5A000]/25 font-medium',
    MEDIUM: 'text-black dark:text-white bg-black/[0.05] dark:bg-white/[0.08] border-black/[0.10] dark:border-white/[0.14] font-medium',
    LOW: 'text-[#6E6E73] dark:text-[#8E8E93] bg-black/[0.04] dark:bg-white/[0.06] border-black/[0.08] dark:border-white/[0.08]',
  };

  const config = statusConfig[item.status] || statusConfig.OPEN;
  const formattedDate = item.deadline
    ? new Date(item.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  const handleApprove = async () => {
    try {
      setErrorMessage(null);
      await api.transitionAction(item.id, {
        target_status: 'APPROVED',
        reason: 'Operator approved execution in Action Hub',
      });
      onStatusChange(item.id, 'APPROVED');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Approval transition failed');
    }
  };

  const handleReject = async () => {
    try {
      setErrorMessage(null);
      await api.transitionAction(item.id, {
        target_status: 'REJECTED',
        reason: 'Rejected by operator in Action Hub',
      });
      onStatusChange(item.id, 'REJECTED');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Reject transition failed');
    }
  };

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      setErrorMessage(null);
      const receipt = await api.executeAction(item.id);
      setActiveReceipt(receipt);
      setReceiptModalOpen(true);
      onStatusChange(item.id, 'COMPLETED');
      if (onExecuted) onExecuted(receipt);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Action could not be executed due to security policies');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleRollback = async () => {
    if (!window.confirm(`Initiate compensating rollback for ${item.title || item.id}?`)) return;
    try {
      setIsRollingBack(true);
      setErrorMessage(null);
      const receipt = await api.rollbackAction(item.id, {
        reason: 'Compensating operator rollback from Action Hub',
      });
      setActiveReceipt(receipt);
      setReceiptModalOpen(true);
      onStatusChange(item.id, 'ROLLED_BACK');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Rollback failed');
    } finally {
      setIsRollingBack(false);
    }
  };

  const handleOpenReceipts = async () => {
    try {
      const receipts = await api.getActionReceipts(item.id);
      if (receipts && receipts.length > 0) {
        setActiveReceipt(receipts[0]);
      } else {
        setActiveReceipt({
          receipt_id: `RCP-${item.id.slice(-6)}`,
          action_id: item.id,
          status: item.status === 'COMPLETED' ? 'EXECUTED' : item.status === 'ROLLED_BACK' ? 'ROLLED_BACK' : 'EXECUTED',
          actor: item.owner || 'Alex Vance (CEO)',
          executed_at: Date.now(),
          parameters_hash: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
          result_summary: `Governed action ${item.id} logged in immutable audit ledger.`,
          audit_block_id: item.audit_block_id || 'EVT-1002',
          organisation_id: item.organisation_id || 'CMP-GENESIS-01',
        });
      }
      setReceiptModalOpen(true);
    } catch {
      setErrorMessage('Could not load receipts');
    }
  };

  return (
    <>
      <div
        className={[
          'group flex items-start gap-3 p-3.5 rounded-[14px] select-text',
          'border border-black/[0.08] dark:border-white/[0.08]',
          'bg-white dark:bg-[#1C1C1E]',
          'hover:bg-black/[0.015] dark:hover:bg-white/[0.025]',
          'hover:border-black/[0.14] dark:hover:border-white/[0.16]',
          'hover:shadow-xs transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]',
          isDone ? 'opacity-75' : '',
        ].join(' ')}
      >
        {/* Status toggle button */}
        <button
          type="button"
          onClick={() => onStatusChange(item.id, nextStatus(item.status))}
          className="mt-0.5 p-1 rounded-[8px] hover:bg-black/[0.05] dark:hover:bg-white/[0.07] active:scale-[0.88] transition-all duration-150 focus-visible:outline-none shrink-0"
          title={`Advance status (${item.status})`}
        >
          {config.icon}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {item.title && (
              <span className="text-[13px] font-semibold text-black dark:text-white">
                {item.title}
              </span>
            )}
            {item.priority && (
              <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.2 rounded border ${priorityStyles[item.priority] || priorityStyles.MEDIUM}`}>
                {item.priority}
              </span>
            )}
            {item.department && (
              <span className="text-[10px] text-[#6E6E73] dark:text-[#8E8E93] bg-black/[0.03] dark:bg-white/[0.05] px-1.5 py-0.2 rounded border border-black/[0.06] dark:border-white/[0.08]">
                {item.department}
              </span>
            )}
          </div>

          <p
            className={[
              'text-[13px] font-medium leading-snug mt-1',
              isDone
                ? 'text-[#3C3C43] dark:text-[#EBEBF5]'
                : 'text-[#3C3C43] dark:text-[#EBEBF5]',
            ].join(' ')}
          >
            {item.description}
          </p>

          {/* Error Notice */}
          {errorMessage && (
            <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[#FF3B30] dark:text-[#FF453A] bg-[#FF3B30]/10 p-1.5 rounded-[8px]">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Metadata row & Governed Controls */}
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

            {/* Governed Action Interactive Controls */}
            {(item.status === 'PROPOSED' || item.status === 'REVIEW_REQUIRED' || item.status === 'DETECTED') && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-medium text-white bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-90 active:scale-95 transition-all shadow-xs"
                  title="Approve action"
                >
                  <Check className="w-3 h-3" />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#D70015] dark:hover:text-[#FF453A] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-black/[0.08] dark:border-white/[0.1] transition-colors"
                  title="Decline action"
                >
                  <X className="w-3 h-3" />
                  <span>Decline</span>
                </button>
              </div>
            )}

            {item.status === 'APPROVED' && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={isExecuting}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[8px] text-[11px] font-medium text-white bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-90 active:scale-95 shadow-xs transition-all"
                  title="Execute approved action"
                >
                  {isExecuting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  <span>Execute</span>
                </button>
              </div>
            )}

            {(item.status === 'COMPLETED' || item.status === 'DONE') && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleOpenReceipts}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] transition-colors"
                  title="View Execution Receipt"
                >
                  <Receipt className="w-3 h-3" />
                  <span>Receipt</span>
                </button>

                <button
                  type="button"
                  onClick={handleRollback}
                  disabled={isRollingBack}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-[#B25000] dark:hover:text-[#FF9F0A] bg-black/[0.03] dark:bg-white/[0.05] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] transition-colors"
                  title="Revert Action"
                >
                  {isRollingBack ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <RotateCcw className="w-3 h-3" />
                  )}
                  <span>Revert</span>
                </button>
              </div>
            )}

            {item.status === 'ROLLED_BACK' && (
              <div className="flex items-center gap-1.5 ml-auto">
                <button
                  type="button"
                  onClick={handleOpenReceipts}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white bg-black/[0.03] dark:bg-white/[0.05] border border-black/[0.06] dark:border-white/[0.08] transition-colors"
                  title="View Reversion Receipt"
                >
                  <Receipt className="w-3 h-3" />
                  <span>Receipt</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Trailing actions: status pill & delete */}
        <div className="flex items-center gap-2 shrink-0">
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

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(item.id)}
              className="p-1 text-[#8E8E93] hover:text-[#FF3B30] dark:hover:text-[#FF453A] rounded-[6px] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors opacity-0 group-hover:opacity-100"
              title="Delete action item"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Action Receipt Inspection Modal */}
      <ActionReceiptModal
        isOpen={receiptModalOpen}
        onClose={() => setReceiptModalOpen(false)}
        receipt={activeReceipt}
        onViewInLedger={onViewInLedger}
      />
    </>
  );
};

