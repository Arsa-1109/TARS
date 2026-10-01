import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ActionReceipt } from '../../types/contracts';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Check,
  Shield,
  Clock,
  Hash,
  FileCode,
  ExternalLink,
} from 'lucide-react';

interface ActionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ActionReceipt | null;
  onViewInLedger?: (blockId: string) => void;
}

export const ActionReceiptModal: React.FC<ActionReceiptModalProps> = ({
  isOpen,
  onClose,
  receipt,
  onViewInLedger,
}) => {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  if (!isOpen || !receipt) return null;

  const handleCopy = (text: string, type: 'hash' | 'id') => {
    navigator.clipboard.writeText(text);
    if (type === 'hash') {
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    } else {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    }
  };

  const isExecuted = receipt.status === 'EXECUTED';
  const isRolledBack = receipt.status === 'ROLLED_BACK';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-apple-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.12] dark:border-white/[0.15] shadow-[0_24px_64px_rgba(0,0,0,0.24)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.72)] overflow-hidden animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[16px] font-semibold text-black dark:text-white tracking-tight">
                  Action Receipt
                </h3>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93]">
                  Verified Record
                </span>
              </div>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                Verified execution details and parameters checksum
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Status banner - calm, restrained Apple card */}
          <div className="flex items-center justify-between p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center">
                {isExecuted ? (
                  <CheckCircle2 className="w-4 h-4 text-[#34C759] dark:text-[#30D158]" />
                ) : isRolledBack ? (
                  <RotateCcw className="w-4 h-4 text-[#FF9500] dark:text-[#FF9F0A]" />
                ) : (
                  <AlertTriangle className="w-4 h-4 text-[#D70015] dark:text-[#FF453A]" />
                )}
              </div>
              <div>
                <span className="text-[13px] font-semibold text-black dark:text-white block">
                  {isExecuted ? 'Action Completed' : isRolledBack ? 'Action Reverted' : 'Action Failed'}
                </span>
                <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                  Action ID: <span className="font-mono text-black dark:text-white">{receipt.action_id}</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => handleCopy(receipt.receipt_id, 'id')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] text-[11px] font-mono transition-colors"
              title="Copy Receipt ID"
            >
              <span>{receipt.receipt_id}</span>
              {copiedId ? <Check className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" /> : <Copy className="w-3 h-3 opacity-60" />}
            </button>
          </div>

          {/* Key-Value Details */}
          <div className="grid grid-cols-2 gap-3 text-[12px]">
            <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                <Clock className="w-3.5 h-3.5" />
                <span>Executed</span>
              </div>
              <div className="font-medium text-black dark:text-white">
                {new Date(receipt.executed_at).toLocaleString()}
              </div>
            </div>

            <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06]">
              <div className="flex items-center gap-1.5 text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                <FileCode className="w-3.5 h-3.5" />
                <span>Duration</span>
              </div>
              <div className="font-medium font-mono text-black dark:text-white">
                {receipt.duration_ms !== undefined ? `${receipt.duration_ms} ms` : 'Immediate'}
              </div>
            </div>

            <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] col-span-2">
              <div className="flex items-center justify-between text-[#6E6E73] dark:text-[#8E8E93] mb-1">
                <div className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" />
                  <span>Checksum (SHA-256)</span>
                </div>
                <button
                  onClick={() => handleCopy(receipt.parameters_hash, 'hash')}
                  className="flex items-center gap-1 hover:text-black dark:hover:text-white transition-colors"
                >
                  {copiedHash ? <Check className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedHash ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <div className="font-mono text-[11px] text-black dark:text-white truncate bg-black/[0.03] dark:bg-white/[0.05] p-1.5 rounded-[6px]">
                {receipt.parameters_hash}
              </div>
            </div>

            {receipt.actor && (
              <div className="p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.05] dark:border-white/[0.06] col-span-2">
                <span className="text-[#6E6E73] dark:text-[#8E8E93] block mb-0.5">Operator</span>
                <span className="font-medium text-black dark:text-white">{receipt.actor}</span>
              </div>
            )}
          </div>

          {/* Rollback Details Preview if present */}
          {receipt.rollback_payload && (
            <div className="p-3.5 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08] space-y-1.5">
              <span className="text-[11px] font-semibold text-black dark:text-white block">
                Reversion Parameters
              </span>
              <pre className="font-mono text-[10px] text-[#3C3C43] dark:text-[#D1D1D6] overflow-x-auto p-2 rounded-[8px] bg-black/[0.03] dark:bg-white/[0.05]">
                {JSON.stringify(receipt.rollback_payload, null, 2)}
              </pre>
            </div>
          )}

          {/* Cross navigation to Audit Ledger */}
          {receipt.audit_block_id && (
            <div className="flex items-center justify-between p-3 rounded-[12px] bg-black/[0.02] dark:bg-white/[0.03] border border-black/[0.06] dark:border-white/[0.08]">
              <div>
                <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] block">
                  Logged in Audit Trail
                </span>
                <span className="font-mono text-[12px] font-medium text-black dark:text-white">
                  {receipt.audit_block_id}
                </span>
              </div>
              {onViewInLedger && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewInLedger(receipt.audit_block_id!);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[11px] font-medium text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3]/10 transition-colors"
                >
                  <span>View in Audit Trail</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3.5 border-t border-black/[0.07] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.015]">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[10px] bg-black dark:bg-white text-white dark:text-black font-medium text-[12px] hover:bg-black/90 dark:hover:bg-white/90 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
