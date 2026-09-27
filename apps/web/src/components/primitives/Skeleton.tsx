import React from 'react';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', ...props }) => {
  return (
    <div
      className={[
        'rounded-[8px] animate-pulse',
        'bg-black/[0.06] dark:bg-white/[0.08]',
        className,
      ].join(' ')}
      {...props}
    />
  );
};
