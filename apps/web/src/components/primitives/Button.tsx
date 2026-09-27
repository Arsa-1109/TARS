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
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tars-accent/40 ' +
    'disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]';

  const sizes = {
    xs: 'text-[11px] px-2 py-1 h-7 gap-1 rounded-lg',
    sm: 'text-xs px-3 py-1.5 h-8 gap-1.5 rounded-[10px]',
    md: 'text-sm px-4 py-2 h-9 gap-2 rounded-[12px]',
    lg: 'text-sm px-5 py-2.5 h-11 gap-2 rounded-[14px]',
  };

  const variants = {
    primary:
      'bg-tars-text-primary text-tars-canvas hover:opacity-90 shadow-subtle',
    accent:
      'bg-tars-accent text-white hover:bg-tars-accent-dark shadow-subtle',
    secondary:
      'bg-tars-surface border border-tars-separator text-tars-text-primary ' +
      'hover:bg-tars-surface-secondary hover:border-tars-border-strong',
    ghost:
      'text-tars-text-secondary hover:text-tars-text-primary hover:bg-tars-surface-secondary',
    destructive:
      'border border-tars-critical-border text-tars-critical-text ' +
      'hover:bg-tars-critical-bg',
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
