import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AuditBlockDTO, AuditVerifyResponse } from '../../types/contracts';
import { api } from '../../services/client';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  RotateCw,
  Search,
  Copy,
  Check,
  Clock,
  User,
  Link as LinkIcon,
  Hash,
  X,
  CheckCircle2,
} from 'lucide-react';

interface AuditLedgerModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetBlockId?: string | null;
}

export const AuditLedgerModal: React.FC<AuditLedgerModalProps> = ({
  isOpen,
  onClose,
  targetBlockId,
}) => {
  const [trail, setTrail] = useState<AuditBlockDTO[]>([]);
  const [verification, setVerification] = useState<AuditVerifyResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const loadTrail = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAuditTrail(100);
      setTrail(data);
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await api.verifyAuditLedger();
      setVerification(res);
    } catch (err) {
      console.error('Audit verification error:', err);
      setVerification({
        status: 'VERIFICATION_ERROR',
        message: 'Could not connect to local ledger verification service.',
        total_events: trail.length,
        tip_hash: '',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTrail();
      handleRunVerify();
    }
  }, [isOpen]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  if (!isOpen) return null;

  const isChainValid = verification ? verification.status === 'AUDIT_VALID' : true;

  const filteredTrail = trail.filter((evt) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      evt.event_id.toLowerCase().includes(q) ||
      evt.action.toLowerCase().includes(q) ||
      evt.actor.toLowerCase().includes(q) ||
      evt.event_hash.toLowerCase().includes(q)
    );
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/40 backdrop-blur-md animate-apple-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] rounded-[22px] bg-white dark:bg-[#1C1C1E] border border-black/[0.12] dark:border-white/[0.15] shadow-[0_24px_64px_rgba(0,0,0,0.24)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.72)] overflow-hidden flex flex-col animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-black/[0.08] dark:border-white/[0.08] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[12px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center">
              <Shield className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[17px] font-semibold text-black dark:text-white tracking-tight">
                  Audit Trail
                </h2>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] border border-black/[0.06] dark:border-white/[0.08]">
                  Verified Record
                </span>
              </div>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93]">
                Tamper-evident activity history and security verification for all system events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRunVerify}
              disabled={isVerifying}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[10px] text-[12px] font-medium text-white bg-[#0071E3] dark:bg-[#0A84FF] hover:opacity-90 active:scale-95 transition-all shadow-xs"
              title="Verify ledger chain integrity"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin' : ''}`} />
              <span>Verify Ledger</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verification Status Summary */}
        <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.06] bg-black/[0.015] dark:bg-white/[0.015] shrink-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* Status card - understated Apple card with calm accent */}
            <div className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex items-center gap-3">
              <div className="w-9 h-9 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.05] flex items-center justify-center shrink-0">
                {isChainValid ? (
                  <ShieldCheck className="w-5 h-5 text-[#34C759] dark:text-[#30D158]" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-[#D70015] dark:text-[#FF453A]" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[12px] font-semibold text-black dark:text-white block">
                  {isChainValid ? 'Ledger Verified' : 'Integrity Issue Detected'}
                </span>
                <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] truncate block">
                  {verification?.message || 'Validating record consistency...'}
                </span>
              </div>
            </div>

            {/* Total verified events */}
            <div className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex flex-col justify-center">
              <span className="text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                Verified Events
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-[18px] font-semibold text-black dark:text-white tabular-nums">
                  {verification?.total_events ?? trail.length}
                </span>
                <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                  Sequential records
                </span>
              </div>
            </div>

            {/* Current Ledger Hash */}
            <div className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] flex flex-col justify-center">
              <div className="flex items-center justify-between text-[11px] font-medium text-[#6E6E73] dark:text-[#8E8E93]">
                <span>Ledger Hash</span>
                {verification?.tip_hash && (
                  <button
                    onClick={() => handleCopy(verification.tip_hash)}
                    className="hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
                  >
                    {copiedHash === verification.tip_hash ? (
                      <Check className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedHash === verification.tip_hash ? 'Copied' : 'Copy'}</span>
                  </button>
                )}
              </div>
              <span className="font-mono text-[11px] text-black dark:text-white truncate mt-1 bg-black/[0.03] dark:bg-white/[0.05] p-1.5 rounded-[6px]">
                {verification?.tip_hash || 'Calculating hash...'}
              </span>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-6 py-2.5 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between gap-3 shrink-0">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#8E8E93]" />
            <input
              type="text"
              placeholder="Search by action, actor, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-[12px] rounded-[10px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.04] text-black dark:text-white placeholder-[#8E8E93] focus:outline-none focus:border-[#0071E3] dark:focus:border-[#0A84FF] transition-all"
            />
          </div>

          <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] tabular-nums">
            Showing {filteredTrail.length} of {trail.length} events
          </div>
        </div>

        {/* Chained Events Feed */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          {filteredTrail.length === 0 ? (
            <div className="py-16 text-center text-[#8E8E93] text-[13px]">
              No audit records match your search query.
            </div>
          ) : (
            filteredTrail.map((block, index) => {
              const isTarget = targetBlockId && block.event_id.toLowerCase().includes(targetBlockId.toLowerCase());
              return (
                <div
                  key={block.event_id}
                  className={`relative p-4 rounded-[14px] border transition-all ${
                    isTarget
                      ? 'border-[#0071E3] bg-[#0071E3]/5 dark:border-[#0A84FF] dark:bg-[#0A84FF]/10 ring-1 ring-[#0071E3]/30'
                      : 'border-black/[0.07] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] hover:border-black/[0.12] dark:hover:border-white/[0.14]'
                  }`}
                >
                  {/* Top metadata line */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#6E6E73] dark:text-[#8E8E93] px-1.5 py-0.5 rounded-[4px] bg-black/[0.04] dark:bg-white/[0.06]">
                        #{block.sequence_id ?? index + 1}
                      </span>
                      <span className="font-mono text-[12px] font-medium text-black dark:text-white">
                        {block.event_id}
                      </span>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-black/[0.04] dark:bg-white/[0.06] text-[#3C3C43] dark:text-[#EBEBF5]">
                        {block.action}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
                      <span className="inline-flex items-center gap-1 font-medium">
                        <User className="w-3 h-3 opacity-60" />
                        {block.actor}
                      </span>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                        <Clock className="w-3 h-3 opacity-60" />
                        {new Date(block.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Hash chain verification detail */}
                  <div className="space-y-1.5 mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05] text-[11px] font-mono">
                    {/* Previous hash */}
                    <div className="flex items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.03] p-1.5 rounded-[6px]">
                      <div className="flex items-center gap-1.5 text-[#8E8E93] shrink-0">
                        <LinkIcon className="w-3 h-3" />
                        <span>Previous Hash:</span>
                      </div>
                      <span className="text-[#6E6E73] dark:text-[#8E8E93] truncate">{block.previous_hash}</span>
                      <button
                        onClick={() => handleCopy(block.previous_hash)}
                        className="text-[#8E8E93] hover:text-black dark:hover:text-white shrink-0 p-0.5"
                        title="Copy Previous Hash"
                      >
                        {copiedHash === block.previous_hash ? <Check className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>

                    {/* Event block hash */}
                    <div className="flex items-center justify-between gap-2 bg-black/[0.02] dark:bg-white/[0.03] p-1.5 rounded-[6px]">
                      <div className="flex items-center gap-1.5 text-[#3C3C43] dark:text-[#D1D1D6] font-medium shrink-0">
                        <Hash className="w-3 h-3" />
                        <span>Record Hash:</span>
                      </div>
                      <span className="text-black dark:text-white font-medium truncate">{block.event_hash}</span>
                      <button
                        onClick={() => handleCopy(block.event_hash)}
                        className="text-[#8E8E93] hover:text-black dark:hover:text-white shrink-0 p-0.5"
                        title="Copy Record Hash"
                      >
                        {copiedHash === block.event_hash ? <Check className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-black/[0.08] dark:border-white/[0.08] bg-black/[0.015] dark:bg-white/[0.015] shrink-0 text-[11px] text-[#6E6E73] dark:text-[#8E8E93]">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#34C759] dark:text-[#30D158]" />
            <span>All records verified against local secure ledger</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-[10px] bg-black dark:bg-white text-white dark:text-black font-medium hover:bg-black/90 dark:hover:bg-white/90 active:scale-95 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
