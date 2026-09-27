import React from 'react';
import { FileText, Download, Copy, Shield, X, Calendar, User } from 'lucide-react';
import { Button } from '../primitives/Button';

interface DocumentReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle: string;
  department: string;
  clearance: string;
  content: string;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  isOpen,
  onClose,
  docTitle,
  department,
  clearance,
  content,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 backdrop-blur-md" onClick={onClose} />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-2xl bg-tars-surface rounded-2xl border border-tars-separator shadow-modal z-10 overflow-hidden apple-glass flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-tars-separator flex items-center justify-between shrink-0 bg-tars-surface/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-tars-surface-secondary border border-tars-separator flex items-center justify-center text-tars-accent">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-tars-text-primary truncate max-w-md">
                {docTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs text-tars-text-tertiary mt-0.5">
                <span>{department}</span>
                <span>•</span>
                <span className="font-mono">{clearance}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-tars-text-secondary hover:text-tars-text-primary hover:bg-tars-surface-tertiary"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Document Content View */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 font-sans text-xs sm:text-sm text-tars-text-primary leading-relaxed select-text">
          <div className="p-4 rounded-xl border border-tars-separator bg-tars-surface-secondary/40 space-y-2 mb-4">
            <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
              Document Lake Metadata
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-tars-text-tertiary">Indexed:</span> 2026-09-24
              </div>
              <div>
                <span className="text-tars-text-tertiary">Vector Chunks:</span> 18 BGE Embeddings
              </div>
              <div>
                <span className="text-tars-text-tertiary">Storage:</span> Local SQLite
              </div>
            </div>
          </div>

          <div className="whitespace-pre-line font-sans text-tars-text-primary leading-relaxed">
            {content}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-tars-separator bg-tars-surface-secondary/40 shrink-0 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-tars-text-tertiary">
            <Shield className="w-3.5 h-3.5 text-tars-success-text" />
            <span>Encrypted local storage • 0.00 KB Egress</span>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
