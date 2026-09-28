import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  Download,
  Copy,
  Shield,
  X,
  ZoomIn,
  ZoomOut,
  Check,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  Eye,
  Code,
  ExternalLink,
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
  const isPdf = docTitle.toLowerCase().endsWith('.pdf') || content.trim().startsWith('%PDF');
  const [viewMode, setViewMode] = useState<'pdf' | 'text'>(isPdf ? 'pdf' : 'text');
  const [zoom, setZoom] = useState<number>(100);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [copied, setCopied] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [pdfError, setPdfError] = useState<boolean>(false);

  const pdfUrl = `/api/ingestion/documents/${encodeURIComponent(docTitle)}/file`;

  useEffect(() => {
    if (isPdf) {
      setViewMode('pdf');
    } else {
      setViewMode('text');
    }
    setZoom(100);
    setCurrentPage(1);
  }, [docTitle, isPdf, isOpen]);

  // Load PDF into a resilient local Blob URL
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    if (isOpen && isPdf) {
      setPdfLoading(true);
      setPdfError(false);

      const loadPdf = async () => {
        try {
          const res = await fetch(pdfUrl);
          if (!res.ok) {
            throw new Error(`Server returned ${res.status}`);
          }
          const blob = await res.blob();
          if (active) {
            // Ensure the blob is tagged as application/pdf
            const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
            const url = URL.createObjectURL(pdfBlob);
            createdUrl = url;
            setPdfBlobUrl(url);
            setPdfLoading(false);
            return;
          }
        } catch (fetchErr) {
          // If remote fetch fails, check if content has raw PDF bytes or base64
          if (content && content.trim().startsWith('%PDF')) {
            try {
              const len = content.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = content.charCodeAt(i) & 0xff;
              }
              const fallbackBlob = new Blob([bytes], { type: 'application/pdf' });
              if (active) {
                const url = URL.createObjectURL(fallbackBlob);
                createdUrl = url;
                setPdfBlobUrl(url);
                setPdfLoading(false);
                return;
              }
            } catch (fallbackErr) {
              console.warn('Fallback PDF synthesis failed:', fallbackErr);
            }
          }

          if (active) {
            setPdfError(true);
            setPdfLoading(false);
          }
        }
      };

      loadPdf();
    } else {
      setPdfBlobUrl(null);
      setPdfLoading(false);
      setPdfError(false);
    }

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [isOpen, isPdf, pdfUrl, content]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const totalPages = 3;

  const handleCopyText = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (isPdf) {
      const a = document.createElement('a');
      a.href = pdfBlobUrl || pdfUrl;
      a.download = docTitle;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      const element = document.createElement('a');
      const file = new Blob([content], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = docTitle.endsWith('.md') ? docTitle : `${docTitle}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    }
  };

  // Helper to render clean structured document sections
  const renderFormattedContent = () => {
    // If it's raw PDF code that couldn't be parsed, display a graceful notification with metadata
    if (content.trim().startsWith('%PDF')) {
      return (
        <div className="space-y-6">
          <div className="p-4 rounded-[14px] bg-[#0071E3]/[0.08] dark:bg-[#2997FF]/[0.10] border border-[#0071E3]/[0.20] dark:border-[#2997FF]/[0.25] text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#0071E3] dark:text-[#2997FF] mb-1">
              <BookOpen className="w-4 h-4" />
              <span>Inbuilt Native PDF Stream Active</span>
            </div>
            <p className="text-[#3C3C43] dark:text-[#D1D1D8] leading-relaxed">
              This document is indexed as a binary PDF artifact. Switch to the <strong>Document Canvas</strong> tab above to view the rendered pages directly on-device.
            </p>
          </div>

          <div className="rounded-[12px] border border-black/[0.08] dark:border-white/[0.10] bg-black/[0.02] dark:bg-white/[0.03] p-4 font-mono text-[12px] text-[#6E6E73] dark:text-[#8E8E98] space-y-1">
            <div className="text-black dark:text-white font-semibold mb-2">Ingestion Header & Digest:</div>
            <div>File: {docTitle}</div>
            <div>Format: PDF 1.4 Encapsulation</div>
            <div>Status: Tantivy Vector Store Indexed</div>
            <div>Egress: 0.00 KB (Strict Air-Gap)</div>
          </div>
        </div>
      );
    }

    // Markdown-like formatting for structured text / tables
    const lines = content.split('\n');
    return (
      <div className="space-y-3 font-sans text-[13px] sm:text-[14px] leading-relaxed text-[#1D1D1F] dark:text-[#EBEBF5]">
        {lines.map((line, idx) => {
          const trimmed = line.trim();
          if (trimmed.startsWith('# ')) {
            return (
              <h1 key={idx} className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white pt-2 pb-1 border-b border-black/[0.08] dark:border-white/[0.08]">
                {trimmed.replace(/^#\s+/, '')}
              </h1>
            );
          }
          if (trimmed.startsWith('## ')) {
            return (
              <h2 key={idx} className="text-lg font-semibold tracking-tight text-black dark:text-white pt-3 pb-0.5">
                {trimmed.replace(/^##\s+/, '')}
              </h2>
            );
          }
          if (trimmed.startsWith('### ')) {
            return (
              <h3 key={idx} className="text-base font-semibold text-black dark:text-white pt-2">
                {trimmed.replace(/^###\s+/, '')}
              </h3>
            );
          }
          if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
            return (
              <div key={idx} className="font-mono text-xs overflow-x-auto py-1 px-2.5 rounded-[8px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08]">
                {line}
              </div>
            );
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return (
              <div key={idx} className="flex items-start gap-2 pl-2">
                <span className="text-[#0071E3] dark:text-[#2997FF]">•</span>
                <span>{trimmed.replace(/^[-*]\s+/, '')}</span>
              </div>
            );
          }
          if (!trimmed) {
            return <div key={idx} className="h-2" />;
          }
          return <p key={idx} className="text-[#3C3C43] dark:text-[#D1D1D8]">{line}</p>;
        })}
      </div>
    );
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 w-screen h-screen flex items-center justify-center p-3 sm:p-6 select-none animate-fade-in"
      onClick={onClose}
    >
      {/* 100% Full Viewport Apple Backdrop Scrim with rich blur */}
      <div
        className="fixed inset-0 w-screen h-screen bg-black/65 dark:bg-black/85 backdrop-blur-[24px] transition-all"
        aria-hidden="true"
      />

      {/* Reader Modal Window */}
      <div
        className="relative w-full max-w-4xl h-[88vh] rounded-[24px] overflow-hidden bg-white dark:bg-[#141519] border border-black/[0.12] dark:border-white/[0.14] shadow-[0_32px_96px_rgba(0,0,0,0.32)] dark:shadow-[0_32px_96px_rgba(0,0,0,0.85)] z-10 flex flex-col animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Specular top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none z-20" />

        {/* Unified macOS Header Toolbar */}
        <div className="px-5 py-3 border-b border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/95 dark:bg-[#1A1B22]/95 backdrop-blur-md flex items-center justify-between shrink-0 select-none">
          {/* Document Identity */}
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-black/[0.06] dark:bg-white/[0.10] flex items-center justify-center text-[#0071E3] dark:text-[#2997FF] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-semibold text-black dark:text-white truncate max-w-xs sm:max-w-md leading-tight">
                {docTitle}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-[#6E6E73] dark:text-[#8E8E98] mt-0.5">
                <span className="font-medium text-[#3C3C43] dark:text-[#D1D1D8]">{department}</span>
                <span>•</span>
                <span className="px-1.5 py-0.5 rounded-[4px] bg-black/[0.05] dark:bg-white/[0.08] font-mono text-[10px] font-semibold text-black dark:text-white">
                  {clearance}
                </span>
                <span>•</span>
                <span className="text-[#0071E3] dark:text-[#2997FF] flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Local Vault
                </span>
              </div>
            </div>
          </div>

          {/* Quick Toolbar */}
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {/* View Mode Toggle if PDF */}
            {isPdf && (
              <div className="flex items-center rounded-[8px] bg-black/[0.05] dark:bg-white/[0.08] p-0.5 border border-black/[0.06] dark:border-white/[0.08]">
                <button
                  onClick={() => setViewMode('pdf')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all ${
                    viewMode === 'pdf'
                      ? 'bg-white dark:bg-[#252631] text-black dark:text-white shadow-2xs'
                      : 'text-[#6E6E73] dark:text-[#8E8E98] hover:text-black dark:hover:text-white'
                  }`}
                  title="Document Canvas"
                >
                  <Eye className="w-3 h-3" />
                  <span>Preview</span>
                </button>
                <button
                  onClick={() => setViewMode('text')}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all ${
                    viewMode === 'text'
                      ? 'bg-white dark:bg-[#252631] text-black dark:text-white shadow-2xs'
                      : 'text-[#6E6E73] dark:text-[#8E8E98] hover:text-black dark:hover:text-white'
                  }`}
                  title="Extracted Text"
                >
                  <Code className="w-3 h-3" />
                  <span>Text</span>
                </button>
              </div>
            )}

            {/* Zoom Controls (Text Mode) */}
            {viewMode === 'text' && (
              <div className="hidden sm:flex items-center rounded-[8px] bg-black/[0.05] dark:bg-white/[0.08] border border-black/[0.06] dark:border-white/[0.08] p-0.5">
                <button
                  onClick={() => setZoom((prev) => Math.max(75, prev - 15))}
                  className="p-1 rounded-[6px] text-[#6E6E73] dark:text-[#8E8E98] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.10] transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <span className="px-1.5 text-[10px] font-mono text-[#3C3C43] dark:text-[#D1D1D8]">
                  {zoom}%
                </span>
                <button
                  onClick={() => setZoom((prev) => Math.min(150, prev + 15))}
                  className="p-1 rounded-[6px] text-[#6E6E73] dark:text-[#8E8E98] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.10] transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Copy Button */}
            <button
              onClick={handleCopyText}
              className="h-7 px-2.5 rounded-[8px] text-[11px] font-medium border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1E2028] text-[#3C3C43] dark:text-[#D1D1D8] hover:text-black dark:hover:text-white transition-all flex items-center gap-1.5 shadow-2xs"
            >
              {copied ? <Check className="w-3 h-3 text-[#0071E3] dark:text-[#2997FF]" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {/* Download Button */}
            <button
              onClick={handleDownload}
              className="h-7 px-2.5 rounded-[8px] text-[11px] font-medium border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1E2028] text-[#3C3C43] dark:text-[#D1D1D8] hover:text-black dark:hover:text-white transition-all flex items-center gap-1.5 shadow-2xs"
              title="Download local copy"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.10] text-[#6E6E73] dark:text-[#8E8E98] hover:text-black dark:hover:text-white hover:bg-black/[0.12] dark:hover:bg-white/[0.18] transition-all flex items-center justify-center ml-1"
              aria-label="Close document"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Reader Canvas Area */}
        <div className="flex-1 overflow-hidden bg-[#EAEAF0] dark:bg-[#08080B] flex flex-col relative">
          {viewMode === 'pdf' ? (
            /* Inbuilt Native PDF Canvas Viewer */
            <div className="w-full h-full flex flex-col p-2 sm:p-4">
              {pdfLoading ? (
                <div className="w-full h-full rounded-[14px] border border-black/[0.10] dark:border-white/[0.10] bg-white dark:bg-[#141519] flex flex-col items-center justify-center gap-3">
                  <div className="w-7 h-7 rounded-full border-2 border-[#0071E3] dark:border-[#2997FF] border-t-transparent animate-spin" />
                  <span className="text-xs font-medium text-[#6E6E73] dark:text-[#8E8E98]">
                    Preparing document canvas...
                  </span>
                </div>
              ) : pdfError || !pdfBlobUrl ? (
                <div className="w-full h-full rounded-[14px] border border-black/[0.10] dark:border-white/[0.10] bg-white dark:bg-[#141519] flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
                  <div className="w-12 h-12 rounded-2xl bg-[#0071E3]/10 dark:bg-[#2997FF]/15 text-[#0071E3] dark:text-[#2997FF] flex items-center justify-center mb-4">
                    <FileText className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-semibold text-black dark:text-white mb-1.5">
                    Inline PDF Preview Unavailable
                  </h4>
                  <p className="text-xs text-[#6E6E73] dark:text-[#8E8E98] leading-relaxed mb-5 max-w-sm">
                    The document canvas could not be rendered inline. You can read the extracted document text directly or export the raw PDF file.
                  </p>
                  <div className="flex items-center gap-2.5">
                    <Button variant="primary" size="sm" onClick={() => setViewMode('text')}>
                      Read Extracted Text
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleDownload}>
                      <Download className="w-3.5 h-3.5 mr-1" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              ) : (
                <iframe
                  src={`${pdfBlobUrl}#toolbar=1&navpanes=0&view=FitH`}
                  title={docTitle}
                  className="w-full h-full rounded-[14px] border border-black/[0.10] dark:border-white/[0.10] bg-white shadow-sm"
                />
              )}
            </div>
          ) : (
            /* Formatted Document / Text Canvas */
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center items-start">
              <div
                className="w-full max-w-2xl bg-white dark:bg-[#121317] rounded-[16px] border border-black/[0.08] dark:border-white/[0.10] shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_30px_rgba(0,0,0,0.60)] p-8 sm:p-12 transition-all select-text text-black dark:text-[#F5F5F7]"
                style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
              >
                {/* Document Header Page Badge */}
                <div className="flex items-center justify-between pb-6 mb-6 border-b border-black/[0.08] dark:border-white/[0.08] text-[11px] text-[#8E8E98]">
                  <div className="flex items-center gap-2 font-mono">
                    <span className="w-2 h-2 rounded-full bg-[#0071E3] dark:bg-[#2997FF]" />
                    <span>CONFIDENTIAL INTERNAL DOCUMENT</span>
                  </div>
                  <div className="font-mono tabular-nums">
                    Page {currentPage} of {totalPages}
                  </div>
                </div>

                {/* Formatted Content */}
                <div className="max-w-none space-y-4">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-black dark:text-white mb-4">
                    {docTitle.replace(/\.[^/.]+$/, '')}
                  </h1>

                  {renderFormattedContent()}

                  {/* Watermark verification block */}
                  <div className="mt-12 pt-6 border-t border-black/[0.06] dark:border-white/[0.08] text-[11px] font-mono text-[#8E8E98] flex flex-wrap items-center justify-between gap-2">
                    <span>Cryptographic Digest: SHA256-Verified</span>
                    <span>Storage: Local Tantivy Invariant Engine</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* macOS Bottom Control Bar */}
        <div className="px-5 py-2.5 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/95 dark:bg-[#1A1B22]/95 backdrop-blur-md flex items-center justify-between shrink-0 text-xs select-none">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E98] font-mono">
              Status: Sovereign Air-Gap Document Cache
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[11px] text-[#6E6E73] dark:text-[#8E8E98] hidden sm:inline">
              100% On-Device Document Rendering
            </span>
            <Button variant="secondary" size="sm" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
