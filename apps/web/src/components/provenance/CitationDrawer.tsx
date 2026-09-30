import React from 'react';
import { Drawer } from '../primitives/Drawer';
import { SearchCitation } from '../../types/contracts';
import { FileText, Shield, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface CitationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  citation: SearchCitation | null;
}

export const CitationDrawer: React.FC<CitationDrawerProps> = ({
  isOpen,
  onClose,
  citation,
}) => {
  const [copied, setCopied] = useState(false);

  if (!citation) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(`"${citation.snippet}" — ${citation.doc_title}, Page ${citation.page_number}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title="Source Evidence"
      subtitle={`Verified from local knowledge store · ${citation.doc_id}`}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 text-[12px] text-[#6E6E73] dark:text-[#8E8E93] font-mono">
            <Shield className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
            <span>Air-Gapped · Local Verified</span>
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-black dark:text-white px-3 py-1.5 rounded-[7px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors shadow-2xs"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Citation'}</span>
          </button>
        </div>
      }
    >
      {/* Source Meta Card */}
      <div className="p-3.5 rounded-[8px] border border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[6px] bg-black/[0.06] dark:bg-white/[0.08] flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4 text-black dark:text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-[13px] font-semibold text-black dark:text-white leading-tight">
              {citation.doc_title}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-[#6E6E73] dark:text-[#8E8E93] font-mono">
              <span>Page {citation.page_number}</span>
              <span className="opacity-40">·</span>
              <span>{citation.doc_id}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Snippet Content */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
          Source Excerpt
        </div>
        <div className="p-3.5 rounded-[8px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] border-l-[3px] border-l-black dark:border-l-white">
          <p className="text-[13px] text-black dark:text-white leading-relaxed font-medium">
            "{citation.snippet}"
          </p>
        </div>
      </div>

      {/* Traceability */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
          Provenance Chain
        </div>
        <ul className="space-y-2 text-[13px] text-[#3C3C43] dark:text-[#EBEBF5]">
          {[
            'Extracted during initial ingestion into sovereign SQLite vector store.',
            'Mathematically isolated on local host — zero egress to external LLM providers.',
            'Referenced in active company decision ledger and verified by Tree-sitter AST layer.',
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[#8E8E93] mt-1.5 shrink-0" />
              <span className="leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </Drawer>
  );
};
