import React from 'react';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  eyebrow,
  title,
  description,
  actions,
  className = '',
}) => {
  return (
    <div
      className={[
        'flex flex-col sm:flex-row sm:items-end justify-between gap-4',
        'pb-5 mb-6 border-b border-black/[0.07] dark:border-white/[0.08]',
        className,
      ].join(' ')}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <div className="text-[11px] font-semibold text-[#86868B] dark:text-[#8E8E93] mb-1 tracking-wider uppercase font-mono">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[22px] sm:text-[26px] lg:text-[28px] font-bold tracking-tight text-black dark:text-white leading-[1.1]">
          {title}
        </h1>
        {description && (
          <p className="text-[13px] sm:text-[14px] text-[#6E6E73] dark:text-[#8E8E93] mt-1.5 leading-relaxed max-w-xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
