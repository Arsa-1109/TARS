import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
  /** Set to true for wide content dialogs */
  wide?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  width = 'max-w-md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 animate-fade-in">
      {/* Scrim */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-[3px] transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog panel */}
      <div
        className={[
          'relative w-full z-10 overflow-hidden animate-modal-in',
          width,
          // Light mode: pure white surface, Dark mode: rich dark graphite
          'bg-white dark:bg-[#141416]',
          // Border — specular on dark, soft on light
          'border border-black/[0.10] dark:border-white/[0.14]',
          // Apple squircle shape
          'rounded-[22px]',
          // Shadows — natural soft Apple blur
          'shadow-[0_24px_60px_rgba(0,0,0,0.18),0_4px_12px_rgba(0,0,0,0.08)]',
          'dark:shadow-[0_32px_80px_rgba(0,0,0,0.85),0_0_0_1px_rgba(255,255,255,0.06)]',
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent pointer-events-none" />

        {/* Header */}
        <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-black/[0.07] dark:border-white/[0.08]">
          <div className="pr-3 min-w-0">
            <h3 className="text-[15px] font-semibold tracking-tight text-black dark:text-white leading-tight">
              {title}
            </h3>
            {description && (
              <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 leading-snug">
                {description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/18 text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors flex items-center justify-center shrink-0 ml-2 mt-0.5"
            aria-label="Close dialog"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        {children && (
          <div className="px-6 py-4 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]">
            {children}
          </div>
        )}

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-black/[0.02] dark:bg-white/[0.03] border-t border-black/[0.06] dark:border-white/[0.07] flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
