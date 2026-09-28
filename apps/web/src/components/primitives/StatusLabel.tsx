import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, Info, Shield, Clock, Minus } from 'lucide-react';

export type StatusType =
  | 'success'
  | 'warning'
  | 'critical'
  | 'info'
  | 'local'
  | 'neutral'
  | 'superseded';

interface StatusLabelProps {
  status: StatusType;
  label?: string;
  icon?: React.ReactNode;
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusLabel: React.FC<StatusLabelProps> = ({
  status,
  label,
  icon,
  size = 'md',
  className = '',
}) => {
  const getDefaultIcon = () => {
    switch (status) {
      case 'success':    return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'warning':    return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'critical':   return <AlertOctagon className="w-3.5 h-3.5" />;
      case 'info':       return <Info className="w-3.5 h-3.5" />;
      case 'local':      return <Shield className="w-3.5 h-3.5" />;
      case 'superseded': return <Minus className="w-3.5 h-3.5" />;
      case 'neutral':
      default:           return <Clock className="w-3.5 h-3.5" />;
    }
  };

  // Explicit Apple color values — no washed CSS vars
  const statusStyles: Record<StatusType, string> = {
    success:    'bg-[#0071E3]/[0.10] dark:bg-[#0A84FF]/[0.12] text-[#0A84FF] dark:text-[#0A84FF] border-[#0071E3]/[0.22] dark:border-[#0A84FF]/[0.22]',
    warning:    'bg-[#FF9500]/[0.10] dark:bg-[#FF9F0A]/[0.12] text-[#B25000] dark:text-[#FF9F0A] border-[#FF9500]/[0.22] dark:border-[#FF9F0A]/[0.22]',
    critical:   'bg-[#FF3B30]/[0.08] dark:bg-[#FF453A]/[0.10] text-[#C0392B] dark:text-[#FF453A] border-[#FF3B30]/[0.18] dark:border-[#FF453A]/[0.22]',
    info:       'bg-black/[0.05] dark:bg-white/[0.08] text-black dark:text-white border-black/[0.10] dark:border-white/[0.14]',
    local:      'bg-black/[0.05] dark:bg-white/[0.08] text-[#3C3C43] dark:text-[#EBEBF5] border-black/[0.10] dark:border-white/[0.12]',
    neutral:    'bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] border-black/[0.08] dark:border-white/[0.10]',
    superseded: 'bg-black/[0.04] dark:bg-white/[0.06] text-[#8E8E93] border-black/[0.06] dark:border-white/[0.08] line-through',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1 rounded-[5px]',
    md: 'text-[11px] px-2 py-0.5 gap-1 rounded-[6px]',
  };

  const displayLabel = label || status;

  return (
    <span
      className={[
        'inline-flex items-center font-semibold border uppercase tracking-wide',
        statusStyles[status],
        sizeStyles[size],
        className,
      ].join(' ')}
    >
      <span className="shrink-0">{icon || getDefaultIcon()}</span>
      <span>{displayLabel}</span>
    </span>
  );
};
