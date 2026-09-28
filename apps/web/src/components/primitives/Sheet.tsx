import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: string;
}

export const Sheet: React.FC<SheetProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  height = 'max-h-[88vh]',
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

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-hidden select-none sm:hidden">
      {/* Full screen scrim */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-[16px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet panel — slides up from bottom */}
      <div
        className={[
          'fixed inset-x-0 bottom-0 flex flex-col safe-bottom select-text',
          'animate-slide-up',
          // Solid Apple surface
          'bg-white dark:bg-[#1C1C1E]',
          // Top rounded corners — iOS sheet style
          'rounded-t-[28px]',
          // Top border highlight
          'border-t border-black/[0.08] dark:border-white/[0.12]',
          'shadow-[0_-16px_50px_rgba(0,0,0,0.18)] dark:shadow-[0_-16px_60px_rgba(0,0,0,0.60)]',
          height,
        ].join(' ')}
        role="dialog"
        aria-modal="true"
      >
        {/* iOS-style drag handle */}
        <div className="w-10 h-[5px] bg-black/[0.12] dark:bg-white/[0.18] rounded-full mx-auto mt-3 mb-1 shrink-0" />

        {/* Header */}
        <div className="px-5 py-3 border-b border-black/[0.07] dark:border-white/[0.08] flex items-center justify-between shrink-0">
          <div className="min-w-0 pr-3">
            <h2 className="text-[15px] font-semibold tracking-tight text-black dark:text-white truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] truncate mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/18 text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors flex items-center justify-center shrink-0"
            aria-label="Close sheet"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
};
