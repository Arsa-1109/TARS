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
        'flex flex-col sm:flex-row sm:items-center justify-between gap-3',
        'pb-3 mb-4 border-b border-black/[0.08] dark:border-white/[0.08]',
        className,
      ].join(' ')}
    >
      <div className="max-w-3xl">
        {eyebrow && (
          <div className="text-[10px] font-semibold text-[#8E8E93] mb-0.5 tracking-wider uppercase font-mono">
            {eyebrow}
          </div>
        )}
        <h1 className="text-[18px] sm:text-[20px] font-semibold tracking-tight text-black dark:text-white leading-tight">
          {title}
        </h1>
        {description && (
          <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5 leading-snug max-w-2xl">
            {description}
          </p>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 shrink-0">
          {actions}
        </div>
      )}
    </div>
  );
};
