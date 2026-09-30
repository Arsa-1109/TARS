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

  // Restrained semantic status styling — strictly adheres to monochrome base + semantic cues
  const statusStyles: Record<StatusType, string> = {
    success:    'bg-[#15803D]/[0.08] dark:bg-[#34D399]/[0.10] text-[#15803D] dark:text-[#34D399] border-[#15803D]/[0.20] dark:border-[#34D399]/[0.20]',
    warning:    'bg-[#B45309]/[0.08] dark:bg-[#FBBF24]/[0.10] text-[#B45309] dark:text-[#FBBF24] border-[#B45309]/[0.20] dark:border-[#FBBF24]/[0.20]',
    critical:   'bg-[#B91C1C]/[0.08] dark:bg-[#F87171]/[0.10] text-[#B91C1C] dark:text-[#F87171] border-[#B91C1C]/[0.20] dark:border-[#F87171]/[0.20]',
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
