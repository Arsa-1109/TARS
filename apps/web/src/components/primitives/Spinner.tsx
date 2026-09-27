import React from 'react';

interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
  /** If true, renders the Apple-style circular spinner track (recommended for dark-on-light contexts) */
  track?: boolean;
}

export const Spinner: React.FC<SpinnerProps> = ({
  size = 'md',
  className = '',
  label,
  track = true,
}) => {
  const sizeMap = {
    xs: { svg: 'w-3.5 h-3.5', sw: '2.5' },
    sm: { svg: 'w-4 h-4',   sw: '2.75' },
    md: { svg: 'w-5 h-5',   sw: '2.75' },
    lg: { svg: 'w-7 h-7',   sw: '3' },
    xl: { svg: 'w-10 h-10', sw: '3' },
  };

  const { svg, sw } = sizeMap[size];

  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      role="status"
      aria-label={label || 'Loading'}
    >
      <svg
        className={`${svg} animate-spin text-current`}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Track ring */}
        {track && (
          <circle
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth={sw}
            className="opacity-[0.15]"
          />
        )}
        {/* Progress arc */}
        <path
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          className="opacity-90"
        />
      </svg>
      {label && (
        <span className="text-xs font-medium tracking-tight text-current opacity-80">
          {label}
        </span>
      )}
      <span className="sr-only">Loading…</span>
    </span>
  );
};
