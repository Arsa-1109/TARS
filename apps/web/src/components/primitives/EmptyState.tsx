import React from 'react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className = '',
}) => {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center text-center p-8 sm:p-12',
        'border border-dashed border-black/[0.10] dark:border-white/[0.10]',
        'rounded-[18px]',
        'bg-black/[0.015] dark:bg-white/[0.025]',
        className,
      ].join(' ')}
    >
      {icon && (
        <div className="w-12 h-12 mb-4 flex items-center justify-center rounded-[14px] bg-black/[0.05] dark:bg-white/[0.08] text-[#6E6E73] dark:text-[#8E8E93]">
          {icon}
        </div>
      )}
      <h3 className="text-[15px] font-semibold tracking-tight text-black dark:text-white mb-1.5">
        {title}
      </h3>
      <p className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] max-w-xs mb-5 leading-relaxed">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
