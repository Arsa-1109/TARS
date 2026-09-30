import React, { useState } from 'react';
import { Button } from '../primitives/Button';
import {
  Download,
  Copy,
  Check,
  Terminal,
  FileCode,
  Shield,
  ExternalLink,
  X,
  Code2,
  Cpu,
} from 'lucide-react';
import { CursorMcpConfig } from '../../types/contracts';

interface CursorConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CursorConfigModal: React.FC<CursorConfigModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  if (!isOpen) return null;

  const configPayload: CursorMcpConfig = {
    mcpServers: {
      "tars-cortex": {
        command: "python",
        args: ["apps/api/cortex/mcp_server.py"],
        env: {
          "PYTHONUNBUFFERED": "1",
          "TARS_GATEWAY_URL": "http://127.0.0.1:7777"
        }
      }
    }
  };

  const jsonString = JSON.stringify(configPayload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mcp.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Scrim */}
      <div className="fixed inset-0 bg-black/65 backdrop-blur-[16px]" aria-hidden="true" />

      {/* Modal Card */}
      <div
        className="relative w-full max-w-2xl bg-white dark:bg-[#1C1C1E] text-black dark:text-white rounded-[24px] border border-black/[0.12] dark:border-white/[0.16] shadow-[0_32px_96px_rgba(0,0,0,0.32)] dark:shadow-[0_32px_96px_rgba(0,0,0,0.85)] z-10 overflow-hidden flex flex-col animate-apple-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top highlight */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/50 dark:via-white/20 to-transparent pointer-events-none z-20" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-black/[0.08] dark:border-white/[0.08] flex items-center justify-between bg-[#F5F5F7] dark:bg-[#2C2C2E]/60">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-[10px] bg-black dark:bg-white text-white dark:text-black flex items-center justify-center shadow-sm">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-black dark:text-white">
                1-Click Cursor MCP Exporter
              </h3>
              <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                Model Context Protocol bridge for Cursor IDE & Claude Desktop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.10] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.12] dark:hover:bg-white/[0.18] transition-all flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Architecture Badge Banner */}
          <div className="p-4 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-neutral-500 dark:text-neutral-400" />
                <span>Patch P-01 & P-02: Stdio-to-FastAPI Loopback Proxy</span>
              </span>
              <span className="text-[11px] font-mono text-[#8E8E93]">Port :7777</span>
            </div>
            <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
              When configured in Cursor, AI Composer accesses your living company memory, customer commitments, and Tree-sitter architectural invariants directly via local stdio loopback, completely avoiding database lock deadlocks.
            </p>
          </div>

          {/* Configuration Preview Block */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-black dark:text-white font-mono text-[11px]">
                .cursor/mcp.json
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="xs"
                  icon={copied ? <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  onClick={handleCopy}
                >
                  {copied ? 'Copied' : 'Copy JSON'}
                </Button>
                <Button
                  variant="primary"
                  size="xs"
                  icon={downloaded ? <Check className="w-3 h-3" /> : <Download className="w-3 h-3" />}
                  onClick={handleDownload}
                >
                  {downloaded ? 'Downloaded' : 'Download .cursor/mcp.json'}
                </Button>
              </div>
            </div>

            <pre className="p-4 rounded-[14px] bg-black text-[#EBEBF5] font-mono text-xs overflow-x-auto border border-white/[0.10] select-text">
              <code>{jsonString}</code>
            </pre>
          </div>

          {/* Quick Setup Instructions */}
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
              Setup Instructions (2 Steps)
            </div>
            <div className="space-y-2 text-xs">
              <div className="p-3.5 rounded-[12px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-black/[0.06] dark:bg-white/[0.10] flex items-center justify-center font-bold text-[11px] shrink-0">
                  1
                </span>
                <p className="text-[#3C3C43] dark:text-[#EBEBF5] leading-relaxed">
                  Download <code className="font-mono text-black dark:text-white font-semibold">mcp.json</code> and place it inside your project's <code className="font-mono text-black dark:text-white font-semibold">.cursor/</code> folder (e.g. <code className="font-mono text-black dark:text-white">your-project/.cursor/mcp.json</code>).
                </p>
              </div>

              <div className="p-3.5 rounded-[12px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] flex items-start gap-3">
                <span className="w-5 h-5 rounded-full bg-black/[0.06] dark:bg-white/[0.10] flex items-center justify-center font-bold text-[11px] shrink-0">
                  2
                </span>
                <p className="text-[#3C3C43] dark:text-[#EBEBF5] leading-relaxed">
                  Restart Cursor IDE or toggle <span className="font-semibold text-black dark:text-white">Cursor Settings → Features → MCP</span>. Cursor will automatically detect the 4 exposed TARS tools:
                </p>
              </div>
            </div>

            {/* List of Exposed FastMCP Tools */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] font-mono">
              <div className="p-2.5 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white">
                • tars_query_company_memory
              </div>
              <div className="p-2.5 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white">
                • tars_check_architectural_invariant
              </div>
              <div className="p-2.5 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white">
                • tars_get_client_commitments
              </div>
              <div className="p-2.5 rounded-[10px] bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] text-black dark:text-white">
                • tars_simulate_decision
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-black/[0.08] dark:border-white/[0.08] bg-[#F5F5F7]/80 dark:bg-[#2C2C2E]/60 flex items-center justify-between text-xs">
          <span className="text-[#8E8E93] font-mono">
            FastMCP Protocol • Stdio Line-Buffered
          </span>
          <Button variant="primary" size="sm" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};
