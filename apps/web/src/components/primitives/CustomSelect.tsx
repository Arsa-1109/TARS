import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  description?: string;
  badge?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
}

interface CustomSelectProps<T extends string = string> {
  value: T;
  onChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  label?: string;
  className?: string;
}

export function CustomSelect<T extends string = string>({
  value,
  onChange,
  options,
  placeholder = 'Select option...',
  label,
  className = '',
}: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-[11px] font-medium text-[#86868B] dark:text-[#8E8E98] mb-1 px-1 uppercase tracking-wider">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="w-full min-h-[42px] px-3.5 py-2 text-left rounded-[12px] border border-black/[0.09] dark:border-white/[0.12] bg-black/[0.02] dark:bg-white/[0.04] hover:bg-black/[0.04] dark:hover:bg-white/[0.07] text-black dark:text-white focus:outline-none focus:border-black dark:focus:border-white focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10 transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {selectedOption?.icon && (
            <span className="shrink-0 text-[#0071E3] dark:text-[#2997FF]">
              {selectedOption.icon}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-medium truncate">
              {selectedOption ? selectedOption.label : placeholder}
            </div>
            {selectedOption?.description && (
              <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E98] truncate">
                {selectedOption.description}
              </div>
            )}
          </div>
          {selectedOption?.badge && (
            <span className="px-1.5 py-0.5 rounded-[4px] bg-black/[0.06] dark:bg-white/[0.08] font-mono text-[10px] font-semibold text-[#3C3C43] dark:text-[#D1D1D8] shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-[#86868B] dark:text-[#8E8E98] shrink-0 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-black dark:text-white' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[60] animate-apple-in">
          <div className="rounded-[16px] overflow-hidden border border-black/[0.12] dark:border-white/[0.16] bg-white dark:bg-[#1C1C1E] shadow-[0_20px_48px_rgba(0,0,0,0.22)] dark:shadow-[0_24px_56px_rgba(0,0,0,0.92)] p-1.5 space-y-0.5 max-h-64 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full px-3 py-2.5 rounded-[10px] text-left cursor-pointer transition-all flex items-center justify-between gap-3 group select-none ${
                    isSelected
                      ? 'bg-black/[0.06] dark:bg-white/[0.09] text-black dark:text-white font-medium'
                      : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#3C3C43] dark:text-[#D1D1D8]'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    {opt.icon && (
                      <span className="shrink-0 text-[#0071E3] dark:text-[#2997FF]">
                        {opt.icon}
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] leading-tight text-black dark:text-white font-medium">
                        {opt.label}
                      </div>
                      {opt.description && (
                        <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E98] mt-0.5 truncate">
                          {opt.description}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {opt.badge && (
                      <span className="px-1.5 py-0.5 rounded-[4px] bg-black/[0.05] dark:bg-white/[0.08] font-mono text-[10px] font-semibold text-[#6E6E73] dark:text-[#8E8E98]">
                        {opt.badge}
                      </span>
                    )}
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#2997FF]" />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
