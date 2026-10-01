import React from 'react';
import { createPortal } from 'react-dom';
import { UserProfile } from '../../types/contracts';
import { Lock, ArrowRight, X, Shield } from 'lucide-react';
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-md animate-apple-fade-in select-none">
      <div
        className="w-full max-w-md rounded-[22px] border border-black/[0.12] dark:border-white/[0.15] bg-white dark:bg-[#1C1C1E] text-black dark:text-white shadow-[0_24px_64px_rgba(0,0,0,0.24)] dark:shadow-[0_24px_64px_rgba(0,0,0,0.72)] p-6 sm:p-8 relative overflow-hidden animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-full text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-[14px] bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-3 text-black dark:text-white">
            <Lock className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
          </div>
          <h2 className="text-[18px] font-semibold tracking-tight text-black dark:text-white">
            Access Restricted
          </h2>
          <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-1">
            Access to <span className="text-black dark:text-white font-medium">{targetWorkspaceName}</span> requires{' '}
            <span className="font-semibold text-black dark:text-white">{requiredClearance}</span> clearance.
          </p>
        </div>

        <div className="p-3.5 rounded-[14px] border border-black/[0.06] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] mb-5 space-y-2 text-[12px]">
          <div className="flex items-center justify-between text-[#6E6E73] dark:text-[#8E8E93]">
            <span>Current User</span>
            <span className="text-black dark:text-white font-medium">{currentProfile.name}</span>
          </div>
          <div className="flex items-center justify-between text-[#6E6E73] dark:text-[#8E8E93]">
            <span>Your Clearance</span>
            <span className="font-mono text-black dark:text-white">{currentProfile.clearance}</span>
          </div>
          <div className="flex items-center justify-between text-[#6E6E73] dark:text-[#8E8E93]">
            <span>Required Clearance</span>
            <span className="font-mono text-black dark:text-white font-semibold">{requiredClearance}</span>
          </div>
        </div>

        <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed mb-6">
          Company policies restrict access to financial projections, executive decisions, and
          architectural overrides to authorized team members.
        </p>

        <div className="space-y-2.5">
          <Button
            variant="primary"
            className="w-full justify-center h-10 text-[12px] font-medium rounded-[10px] bg-black text-white hover:bg-black/90 dark:bg-white dark:text-black dark:hover:bg-white/90 shadow-xs"
            onClick={onClose}
          >
            <span>Return to Workspace</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
          </Button>
        </div>

        <div className="mt-6 pt-4 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-[#8E8E93]">
          <span className="flex items-center gap-1">
            <Shield className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" />
            <span>Policy Enforced</span>
          </span>
          <span>Security Guard</span>
        </div>
      </div>
    </div>,
    document.body
  );
};
