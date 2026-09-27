import React from 'react';

interface SurfaceProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  bordered?: boolean;
  radius?: 'control' | 'card' | 'large' | 'none';
}

export const Surface: React.FC<SurfaceProps> = ({
  children,
  variant = 'primary',
  bordered = true,
  radius = 'card',
  className = '',
  ...props
}) => {
  const variantStyles = {
    primary: 'bg-white dark:bg-[#1C1C1E]',
    secondary: 'bg-[#F5F5F7] dark:bg-[#2C2C2E]',
    tertiary: 'bg-[#E5E5EA] dark:bg-[#3A3A3C]',
  };

  const radiusStyles = {
    control: 'rounded-[12px]',
    card: 'rounded-[18px]',
    large: 'rounded-[24px]',
    none: 'rounded-none',
  };

  return (
    <div
      className={`${variantStyles[variant]} ${radiusStyles[radius]} ${
        bordered ? 'border border-black/[0.08] dark:border-white/[0.10]' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
