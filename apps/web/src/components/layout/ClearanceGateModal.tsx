import React from 'react';
import { createPortal } from 'react-dom';
import { UserRole, UserProfile } from '../../types/contracts';
import { ShieldAlert, Lock, ArrowRight, X, Key, Check } from 'lucide-react';
import { Button } from '../primitives/Button';

interface ClearanceGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  requiredClearance: string;
  targetWorkspaceName: string;
  currentProfile: UserProfile;
  onSwitchToFounder?: () => void;
}

export const ClearanceGateModal: React.FC<ClearanceGateModalProps> = ({
  isOpen,
  onClose,
  requiredClearance,
  targetWorkspaceName,
  currentProfile,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 dark:bg-black/85 backdrop-blur-[24px] animate-fade-in select-none">
      <div
        className="w-full max-w-md rounded-3xl border border-black/[0.08] dark:border-white/[0.12] bg-white/95 dark:bg-zinc-950/90 text-zinc-900 dark:text-zinc-100 shadow-2xl p-6 sm:p-8 apple-glass relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-red-500/30 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3 text-red-500 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-white">
            Restricted Clearance Level
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
            Access to <span className="text-zinc-900 dark:text-white font-medium">{targetWorkspaceName}</span> requires{' '}
            <span className="font-semibold text-red-600 dark:text-red-400">{requiredClearance}</span>.
          </p>
        </div>

        <div className="p-3.5 rounded-2xl border border-black/5 dark:border-white/5 bg-zinc-50 dark:bg-zinc-900/60 mb-5 space-y-2 text-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span>Current Operator</span>
            <span className="text-zinc-900 dark:text-white font-semibold">{currentProfile.name}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span>Operator Clearance</span>
            <span className="font-mono text-amber-600 dark:text-amber-400 font-semibold">{currentProfile.clearance}</span>
          </div>
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
            <span>Target Clearance</span>
            <span className="font-mono text-red-600 dark:text-red-400 font-semibold">{requiredClearance}</span>
          </div>
        </div>

        <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-6">
          Invariants in TARS ensure sensitive company financials, runway trade-off models, and
          architectural override rules cannot be mutated outside the authorized Sovereign Operator
          circle.
        </p>

        <div className="space-y-2.5">
          <Button
            variant="primary"
            className="w-full justify-center h-10 text-xs font-semibold rounded-xl bg-black text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200 shadow-sm"
            onClick={onClose}
          >
            <span>Return to Permitted Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between text-[11px] text-zinc-500 font-mono">
          <span>TARS Security Isolation</span>
          <span>Role Guard INV-004</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
