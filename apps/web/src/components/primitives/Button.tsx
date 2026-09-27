import React from 'react';
import { Spinner } from './Spinner';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'accent';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  loadingText?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  loadingText,
  className = '',
  disabled,
  ...props
}) => {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-150 ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 dark:focus-visible:ring-[#0A84FF]/40 ' +
    'disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]';

  const sizes = {
    xs: 'text-[11px] px-2.5 py-1 h-7 gap-1 rounded-lg',
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5 rounded-[10px]',
    md: 'text-sm px-4 py-2 h-9 gap-2 rounded-[12px]',
    lg: 'text-sm px-5 py-2.5 h-11 gap-2 rounded-[14px]',
  };

  const variants = {
    primary:
      'bg-black text-white hover:bg-[#1C1C1E] dark:bg-white dark:text-black dark:hover:bg-[#E5E5EA] shadow-sm',
    accent:
      'bg-[#0071E3] text-white hover:bg-[#0077ED] dark:bg-[#0A84FF] dark:hover:bg-[#0071E3] shadow-sm',
    secondary:
      'bg-white dark:bg-[#1C1C1E] border border-black/[0.10] dark:border-white/[0.12] text-black dark:text-white ' +
      'hover:bg-black/[0.04] dark:hover:bg-white/[0.08] shadow-xs',
    ghost:
      'text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08]',
    destructive:
      'border border-[#FF3B30]/30 text-[#FF3B30] dark:text-[#FF453A] ' +
      'hover:bg-[#FF3B30]/10',
  };

  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <>
          <Spinner size={size === 'xs' ? 'xs' : size === 'sm' ? 'xs' : 'sm'} />
          {loadingText && <span>{loadingText}</span>}
        </>
      ) : (
        <>
          {icon && iconPosition === 'left' && <span className="shrink-0">{icon}</span>}
          {children && <span>{children}</span>}
          {icon && iconPosition === 'right' && <span className="shrink-0">{icon}</span>}
        </>
      )}
    </button>
  );
};
