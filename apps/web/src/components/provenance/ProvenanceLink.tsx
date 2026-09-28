import React from 'react';
import { FileText, Phone, GitCommit, Scale, ExternalLink } from 'lucide-react';

interface ProvenanceLinkProps {
  type?: 'document' | 'call' | 'decision' | 'code' | 'general';
  sourceTitle: string;
  location?: string;
  onClick?: () => void;
  className?: string;
}

export const ProvenanceLink: React.FC<ProvenanceLinkProps> = ({
  type = 'general',
  sourceTitle,
  location,
  onClick,
  className = '',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'document': return <FileText className="w-3 h-3" />;
      case 'call':     return <Phone className="w-3 h-3" />;
      case 'decision': return <Scale className="w-3 h-3" />;
      case 'code':     return <GitCommit className="w-3 h-3" />;
      default:         return <ExternalLink className="w-3 h-3" />;
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1 text-[11px] font-medium transition-colors text-left',
        'text-black dark:text-white',
        'hover:text-black dark:hover:text-white',
        'bg-black/[0.04] dark:bg-white/[0.06]',
        'hover:bg-black/[0.08] dark:hover:bg-white/[0.12]',
        'px-2 py-0.5 rounded-[6px]',
        'border border-black/[0.08] dark:border-white/[0.12]',
        'focus-visible:outline-none',
        className,
      ].join(' ')}
    >
      <span className="shrink-0 opacity-80">{getIcon()}</span>
      <span className="truncate max-w-[180px] sm:max-w-[240px]">{sourceTitle}</span>
      {location && (
        <span className="text-[10px] font-mono tabular-nums shrink-0 opacity-70">
          · {location}
        </span>
      )}
    </button>
  );
};
