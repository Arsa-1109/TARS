import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';

interface InlineNoticeProps {
  type?: 'info' | 'warning' | 'critical' | 'success';
  title?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export const InlineNotice: React.FC<InlineNoticeProps> = ({
  type = 'info',
  title,
  children,
  action,
  className = '',
}) => {
  const styles = {
    info:     'bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white border-black/[0.08] dark:border-white/[0.12]',
    warning:  'bg-[#B45309]/[0.08] dark:bg-[#FBBF24]/[0.10] text-[#B45309] dark:text-[#FBBF24] border-[#B45309]/[0.20] dark:border-[#FBBF24]/[0.20]',
    critical: 'bg-[#B91C1C]/[0.08] dark:bg-[#F87171]/[0.10] text-[#B91C1C] dark:text-[#F87171] border-[#B91C1C]/[0.20] dark:border-[#F87171]/[0.20]',
    success:  'bg-[#15803D]/[0.08] dark:bg-[#34D399]/[0.10] text-[#15803D] dark:text-[#34D399] border-[#15803D]/[0.20] dark:border-[#34D399]/[0.20]',
  };

  const icons = {
    info:     <Info className="w-4 h-4 shrink-0 mt-0.5" />,
    warning:  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />,
    critical: <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />,
    success:  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />,
  };

  return (
    <div
      role="alert"
      className={[
        'flex items-start gap-3 p-3.5 rounded-[12px] border text-[13px] leading-relaxed',
        styles[type],
        className,
      ].join(' ')}
    >
      {icons[type]}
      <div className="flex-1 min-w-0">
        {title && <div className="font-semibold mb-0.5 text-[13px]">{title}</div>}
        <div className="opacity-90 text-current">{children}</div>
      </div>
      {action && <div className="shrink-0 ml-2">{action}</div>}
    </div>
  );
};
