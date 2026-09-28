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
    warning:  'bg-[#FF9500]/[0.10] dark:bg-[#FF9F0A]/[0.12] text-[#B25000] dark:text-[#FF9F0A] border-[#FF9500]/[0.22] dark:border-[#FF9F0A]/[0.22]',
    critical: 'bg-[#FF3B30]/[0.08] dark:bg-[#FF453A]/[0.10] text-[#C0392B] dark:text-[#FF453A] border-[#FF3B30]/[0.18] dark:border-[#FF453A]/[0.22]',
    success:  'bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.10] text-[#0A84FF] dark:text-[#0A84FF] border-[#0071E3]/[0.18] dark:border-[#0A84FF]/[0.22]',
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
