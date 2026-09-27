import React from 'react';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  badge?: string | number;
  icon?: React.ReactNode;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'xs' | 'sm' | 'md';
  className?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  size = 'md',
  className = '',
}: SegmentedControlProps<T>) {
  const containerClasses = {
    xs: 'p-[3px] rounded-[10px]',
    sm: 'p-[3px] rounded-[11px]',
    md: 'p-1 rounded-[13px]',
  };

  const itemClasses = {
    xs: 'px-2 py-0.5 text-[11px] rounded-[7px]',
    sm: 'px-2.5 py-1 text-[11px] rounded-[8px]',
    md: 'px-3 py-1.5 text-xs rounded-[10px]',
  };

  return (
    <div
      role="tablist"
      className={[
        'inline-flex items-center',
        // Apple segmented track — solid surface, not glass
        'bg-black/[0.06] dark:bg-white/[0.08]',
        containerClasses[size],
        className,
      ].join(' ')}
    >
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={isSelected}
            onClick={() => onChange(opt.value)}
            className={[
              'relative flex items-center justify-center gap-1.5',
              'font-medium transition-all duration-150 select-none',
              'focus-visible:outline-none',
              itemClasses[size],
              isSelected
                ? [
                    // Active pill — solid white on both modes
                    'bg-white dark:bg-[#3A3A3C]',
                    'text-black dark:text-white',
                    'shadow-[0_1px_3px_rgba(0,0,0,0.12),0_0_0_0.5px_rgba(0,0,0,0.06)]',
                    'dark:shadow-[0_1px_4px_rgba(0,0,0,0.40)]',
                    'font-semibold',
                  ].join(' ')
                : 'text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white',
            ].join(' ')}
          >
            {opt.icon && <span className="shrink-0">{opt.icon}</span>}
            <span className="whitespace-nowrap">{opt.label}</span>
            {opt.badge !== undefined && (
              <span
                className={[
                  'ml-0.5 text-[10px] px-1.5 py-px rounded-full tabular-nums font-mono',
                  isSelected
                    ? 'bg-black/[0.08] dark:bg-white/[0.14] text-black dark:text-white'
                    : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#8E8E93]',
                ].join(' ')}
              >
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
