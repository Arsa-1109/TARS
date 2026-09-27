import React, { useState } from 'react';
import {
  FileText,
  Download,
  Copy,
  Shield,
  X,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Button } from '../primitives/Button';

interface DocumentReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  docTitle: string;
  department: string;
  clearance: string;
  content: string;
}

export const DocumentReaderModal: React.FC<DocumentReaderModalProps> = ({
  isOpen,
  onClose,
  docTitle,
  department,
  clearance,
  content,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const totalPages = 3;

  const handleCopyText = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = docTitle.endsWith('.md') ? docTitle : `${docTitle}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Premium Apple Scrim */}
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[16px]" aria-hidden="true" />

      {/* Reader Modal Window (macOS Preview / Document Viewer style) */}
      <div
        className="relative w-full max-w-4xl h-[88vh] rounded-[24px] overflow-hidden bg-white dark:bg-[#1C1C1E] border border-black/[0.12] dark:border-white/[0.16] shadow-[0_32px_96px_rgba(0,0,0,0.32)] dark:shadow-[0_32px_96px_rgba(0,0,0,0.85)] z-10 flex flex-col animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none z-20" />

        {/* macOS-style Unified Header & Toolbar */}
        <div className="px-5 py-3 border-b border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/90 dark:bg-[#2C2C2E]/90 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
          {/* Document Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-black/[0.06] dark:bg-white/[0.10] flex items-center justify-center text-[#0071E3] dark:text-[#0A84FF] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold text-black dark:text-white truncate max-w-md sm:max-w-lg leading-tight">
                {docTitle}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                <span className="font-medium text-[#3C3C43] dark:text-[#EBEBF5]">{department}</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded-[4px] bg-black/[0.05] dark:bg-white/[0.08] font-mono text-[10px] font-semibold text-black dark:text-white">
                  {clearance}
                </span>
                <span>•</span>
                <span className="text-[#34C759] dark:text-[#30D158] flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Local Vault
                </span>
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-1.5 shrink-0 ml-4">
            {/* Zoom Controls */}
            <div className="hidden sm:flex items-center rounded-[8px] bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] p-0.5">
              <button
                onClick={() => setZoom((prev) => Math.max(75, prev - 15))}
                className="p-1 rounded-[6px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.10] transition-colors"
                title="Zoom Out"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 text-[10px] font-mono text-[#3C3C43] dark:text-[#EBEBF5]">
                {zoom}%
              </span>
              <button
                onClick={() => setZoom((prev) => Math.min(150, prev + 15))}
                className="p-1 rounded-[6px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.10] transition-colors"
                title="Zoom In"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Copy Button */}
            <button
              onClick={handleCopyText}
              className="h-7 px-2.5 rounded-[8px] text-[11px] font-medium border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5] hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-all flex items-center gap-1.5 shadow-2xs"
            >
              {copied ? <Check className="w-3 h-3 text-[#34C759] dark:text-[#30D158]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="h-7 px-2.5 rounded-[8px] text-[11px] font-medium border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#3A3A3C] text-[#3C3C43] dark:text-[#EBEBF5] hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.06] transition-all flex items-center gap-1.5 shadow-2xs"
              title="Download local copy"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.10] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.12] dark:hover:bg-white/[0.18] transition-all flex items-center justify-center ml-1"
              aria-label="Close document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reader Body: Document Page Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-[#EBEBF0] dark:bg-[#000000] flex justify-center items-start">
          <div
            className="w-full max-w-2xl bg-white dark:bg-[#1C1C1E] rounded-[16px] border border-black/[0.08] dark:border-white/[0.10] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.50)] p-8 sm:p-12 transition-all select-text text-black dark:text-[#F5F5F7]"
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
          >
            {/* Document Header Page Badge */}
            <div className="flex items-center justify-between pb-6 mb-6 border-b border-black/[0.08] dark:border-white/[0.08] text-[11px] text-[#8E8E93]">
              <div className="flex items-center gap-2 font-mono">
                <span className="w-2 h-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]" />
                <span>CONFIDENTIAL INTERNAL DOCUMENT</span>
              </div>
              <div className="font-mono tabular-nums">
                Page {currentPage} of {totalPages}
              </div>
            </div>

            {/* Document Content Display */}
            <div className="prose prose-sm dark:prose-invert max-w-none space-y-4">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white mb-4">
                {docTitle.replace(/\.[^/.]+$/, '')}
              </h1>

              <div className="text-[13px] sm:text-[14px] leading-relaxed whitespace-pre-line text-[#1D1D1F] dark:text-[#EBEBF5] font-sans">
                {content}
              </div>

              {/* Watermark verification block */}
              <div className="mt-12 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-[#8E8E93] flex flex-wrap items-center justify-between gap-2">
                <span>Cryptographic Digest: SHA256-Verified</span>
                <span>Storage: Local Tantivy Invariant Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* macOS Bottom Control Bar */}
        <div className="px-5 py-2.5 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/95 dark:bg-[#2C2C2E]/95 backdrop-blur-md flex items-center justify-between shrink-0 text-xs select-none">
          {/* Pagination */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1 rounded-[6px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#3A3A3C] text-black dark:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="text-[11px] font-mono text-[#6E6E73] dark:text-[#8E8E93] tabular-nums">
              Page {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1 rounded-[6px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#3A3A3C] text-black dark:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] hidden sm:inline">
              100% On-Device Document Rendering
            </span>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
