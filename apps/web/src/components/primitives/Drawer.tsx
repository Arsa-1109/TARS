import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: string;
  footer?: React.ReactNode;
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = 'max-w-md sm:max-w-lg',
  footer,
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
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Full screen scrim */}
      <div
        className="fixed inset-0 bg-black/60 dark:bg-black/75 backdrop-blur-[16px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-y-0 right-0 flex pl-10 max-w-full">
        {/* Drawer Panel */}
        <div
          className={[
            'w-screen flex flex-col animate-slide-right select-text',
            width,
            // Solid Apple surface — rich dark graphite
            'bg-white dark:bg-[#141416]',
            'border-l border-black/[0.09] dark:border-white/[0.14]',
            'shadow-[-20px_0_60px_rgba(0,0,0,0.14)] dark:shadow-[-24px_0_80px_rgba(0,0,0,0.85)]',
          ].join(' ')}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="px-5 py-4 flex items-center justify-between shrink-0 border-b border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E]">
            <div className="min-w-0 pr-4">
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
              aria-label="Close drawer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {children}
          </div>

          {/* Footer */}
          {footer && (
            <div className="px-5 py-3.5 border-t border-black/[0.07] dark:border-white/[0.07] bg-black/[0.015] dark:bg-white/[0.03] shrink-0">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};
