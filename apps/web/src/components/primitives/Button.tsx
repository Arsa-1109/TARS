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
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0071E3]/40 dark:focus-visible:ring-[#0A84FF]/40 ' +
    'disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[0.97] cursor-pointer';

  const sizes = {
    xs: 'text-[11px] px-2.5 py-1 h-7 gap-1 rounded-full',
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5 rounded-full',
    md: 'text-[13px] px-4 py-2 h-9 gap-2 rounded-full',
    lg: 'text-sm px-5 py-2.5 h-10 gap-2 rounded-full',
  };

  const variants = {
    primary:
      'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-sm font-medium',
    accent:
      'bg-black text-white hover:bg-neutral-800 dark:bg-white dark:text-black dark:hover:bg-neutral-200 shadow-sm font-medium',
    secondary:
      'bg-black/[0.05] dark:bg-white/[0.08] text-black dark:text-white ' +
      'hover:bg-black/[0.08] dark:hover:bg-white/[0.12] border border-black/[0.06] dark:border-white/[0.08]',
    ghost:
      'text-[#86868B] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]',
    destructive:
      'bg-[#FF3B30]/10 text-[#FF3B30] dark:text-[#FF453A] border border-[#FF3B30]/20 hover:bg-[#FF3B30]/15',
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
