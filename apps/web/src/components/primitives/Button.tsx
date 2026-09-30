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
    'inline-flex items-center justify-center font-medium transition-all duration-150 ease-[cubic-bezier(0.16,1,0.3,1)] ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/25 ' +
    'disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.98] cursor-pointer';

  const sizes = {
    xs: 'text-[11px] px-2 py-0.5 h-6 gap-1 rounded-[6px]',
    sm: 'text-xs px-2.5 py-1 h-7 gap-1.5 rounded-[7px]',
    md: 'text-[13px] px-3.5 py-1.5 h-8 gap-2 rounded-[8px]',
    lg: 'text-sm px-4 py-2 h-9 gap-2 rounded-[8px]',
  };

  const variants = {
    primary:
      'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 border border-transparent shadow-xs font-semibold',
    accent:
      'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 border border-transparent shadow-xs font-semibold',
    secondary:
      'bg-black/[0.04] dark:bg-white/[0.06] text-black dark:text-white ' +
      'hover:bg-black/[0.08] dark:hover:bg-white/[0.10] border border-black/[0.08] dark:border-white/[0.10] shadow-2xs',
    ghost:
      'text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
    destructive:
      'bg-[#B91C1C]/10 text-[#B91C1C] dark:text-[#F87171] border border-[#B91C1C]/20 hover:bg-[#B91C1C]/15',
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
