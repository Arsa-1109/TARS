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
    primary: 'bg-tars-surface',
    secondary: 'bg-tars-surface-secondary',
    tertiary: 'bg-tars-surface-tertiary',
  };

  const radiusStyles = {
    control: 'rounded-control',
    card: 'rounded-card',
    large: 'rounded-large',
    none: 'rounded-none',
  };

  return (
    <div
      className={`${variantStyles[variant]} ${radiusStyles[radius]} ${
        bordered ? 'border border-tars-separator' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};
