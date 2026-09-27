import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { Skeleton } from '../primitives/Skeleton';
import { Spinner } from '../primitives/Spinner';
import { EmptyState } from '../primitives/EmptyState';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { DocumentReaderModal } from './DocumentReaderModal';
import { SearchCitation, SearchResponse, UserRole } from '../../types/contracts';
import { api } from '../../services/client';
import {
  Search,
  FileText,
  UploadCloud,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
  Download,
  Copy,
  Check,
  Eye,
  Table,
} from 'lucide-react';

interface KnowledgeWorkspaceProps {
  onOpenCitation: (citation: SearchCitation) => void;
  userRole: UserRole;
  clearance: string;
}

export const KnowledgeWorkspace: React.FC<KnowledgeWorkspaceProps> = ({
  onOpenCitation,
  userRole,
  clearance,
}) => {
  const [activeView, setActiveView] = useState<'search' | 'lake'>('search');
  const [query, setQuery] = useState('What is our policy on enterprise customisations?');
  const [department, setDepartment] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [copiedBundle, setCopiedBundle] = useState(false);

  // Document Reader modal state
  const [readerModal, setReaderModal] = useState<{
    open: boolean;
    title: string;
    department: string;
    clearance: string;
    content: string;
  }>({
    open: false,
    title: '',
    department: '',
    clearance: '',
    content: '',
  });

  const departments = ['ALL', 'Executive', 'Product', 'Engineering', 'Sales'];

  const indexedLakeDocuments = [
    {
      id: 'DOC-DEC-14',
      title: 'Decision #14: Enterprise Customisations Policy.md',
      department: 'Executive',
      clearance: 'ALL_TEAM',
      type: 'Markdown',
      size: '14.2 KB',
      date: '2026-09-14',
      content: `## Context & Core Trade-Offs\nWith only 4 developers and 11.4 months of runway, allocating capacity to bespoke enterprise branches creates massive Bus Factor = 1 divergence.\n\n## Ratified Policy\nZero enterprise customisations before Q4 2026. All clients must consume public multi-tenant APIs. Any exception requires explicit signed waiver by CEO and Lead Architect.`
    },
    {
      id: 'DOC-FIN-2026',
      title: 'Q3 Runway & Cash Burn Financial Model.xlsx',
      department: 'Executive',
      clearance: 'EXECUTIVE_ONLY',
      type: 'Spreadsheet',
      size: '84.6 KB',
      date: '2026-09-20',
      content: `## Runway Analysis\nBase Monthly Burn: $24,500\nTotal Cash in Bank: $280,000\nRunway: 11.4 months.\n\nIf 2 developers are reallocated to Acme Corp bespoke SAML SSO, launch delay shifts revenue recognition 60 days back, dropping cash survival runway to 9.6 months.`
    },
    {
      id: 'CALL-ACME-01',
      title: 'Acme Corp Enterprise Call Recording.m4a',
      department: 'Sales',
      clearance: 'ALL_TEAM',
      type: 'Audio Transcript',
      size: '18.4 MB',
      date: '2026-09-24',
      content: `## Transcript Excerpt\nJohnathan Vance (VP Eng, Acme): 'We cannot clear Infosec without custom SAML 2.0 and Okta integration deployed on our private VPC by May 1st. It is a hard requirement for the $80k contract.'`
    },
    {
      id: 'DOC-SEC-04',
      title: 'Enterprise Identity & Auth Architecture ADR-009.md',
      department: 'Engineering',
      clearance: 'ALL_TEAM',
      type: 'Markdown',
      size: '22.1 KB',
      date: '2026-09-22',
      content: `## Identity Federation Architecture\nCurrent auth pipeline relies on local Argon2id sessions with lightweight API key exchange. Full SAML 2.0 SP metadata parser is scheduled for v2.2 once multi-tenant core matures.`
    }
  ];

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    setLoading(true);
    try {
      const res = await api.search({
        query: searchQuery,
        department,
        clearance,
      });
      setResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleSearch(query);
  }, [department]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    try {
      const uploaded = await api.uploadDocument(files[0]);
      setUploadSuccess(`Ingested "${uploaded.title}" (${uploaded.pages} pages) into local vector index.`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleCopyCitationBundle = () => {
    if (!result) return;
    const bundleText = `# TARS Verified Citations for: "${result.query}"\n\n${result.answer}\n\n## Sources:\n${result.citations
      .map((c) => `- **${c.doc_title}** (Page ${c.page_number}): "${c.snippet}"`)
      .join('\n')}\n\n*Verified by TARS Sovereign Memory Engine (0.00 KB Egress)*`;
    navigator.clipboard.writeText(bundleText);
    setCopiedBundle(true);
    setTimeout(() => setCopiedBundle(false), 2000);
  };

  const sampleQueries = [
    "What is our policy on enterprise customisations?",
    "SAML SSO requirements and client commitments",
    "Runway survival model with 4 developers",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Knowledge"
        title="Company Knowledge"
        description="Search company documents, contracts, and decisions with verifiable citations."
        actions={
          <div className="flex items-center gap-2">
            <SegmentedControl
              size="sm"
              options={[
                { value: 'search', label: 'Search' },
                { value: 'lake', label: 'All Documents', badge: indexedLakeDocuments.length },
              ]}
              value={activeView}
              onChange={(v) => setActiveView(v as any)}
            />
            <label className="cursor-pointer">
              <input
                type="file"
                className="hidden"
                accept=".pdf,.docx,.txt,.csv,.xlsx"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
              <Button
                variant="primary"
                size="sm"
                icon={<UploadCloud className="w-4 h-4" />}
                loading={uploading}
              >
                Upload Document
              </Button>
            </label>
          </div>
        }
      />

      {uploadSuccess && (
        <div className="p-3.5 rounded-[12px] border border-[#34C759]/[0.22] dark:border-[#30D158]/[0.22] bg-[#34C759]/[0.08] dark:bg-[#30D158]/[0.10] text-[#1D8348] dark:text-[#30D158] text-[13px] flex items-center justify-between">
          <span>{uploadSuccess}</span>
          <button onClick={() => setUploadSuccess(null)} className="underline text-[11px] font-medium ml-3 opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: SEARCH & CITATIONS */}
      {activeView === 'search' && (
        <>
          {/* Dominant Apple-Style Search Input Card */}
          <div className="rounded-[18px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.30)] p-4 sm:p-5 space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(query);
              }}
              className="space-y-3"
            >
              <div className="relative flex items-center">
                <Search className="w-5 h-5 text-[#8E8E93] absolute left-3.5 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask any question about company strategy, customer contracts, or past decisions..."
                  className="w-full pl-11 pr-24 py-3.5 text-[14px] sm:text-[15px] rounded-[12px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-[#0071E3]/20 dark:focus:ring-[#0A84FF]/20 focus:border-[#0071E3] dark:focus:border-[#0A84FF] transition-all"
                />
                <div className="absolute right-2">
                  <Button type="submit" variant="primary" size="sm" loading={loading}>
                    Search
                  </Button>
                </div>
              </div>

              {/* Department Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[#8E8E93] font-medium flex items-center gap-1">
                    <Filter className="w-3 h-3" /> Dept:
                  </span>
                  {departments.map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => setDepartment(dept)}
                      className={`px-2.5 py-1 rounded-[8px] border text-[11px] font-medium transition-all ${
                        department === dept
                          ? 'border-black/[0.20] dark:border-white/[0.25] bg-black/[0.06] dark:bg-white/[0.10] font-semibold text-black dark:text-white'
                          : 'border-black/[0.08] dark:border-white/[0.08] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>

                {result && (
                  <div className="text-[11px] text-[#8E8E93] font-mono tabular-nums">
                    Latency: <span className="font-semibold text-black dark:text-white">{result.latency_ms} ms</span>
                  </div>
                )}
              </div>
            </form>

            {/* Suggested Queries */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2.5 border-t border-black/[0.07] dark:border-white/[0.07] text-xs">
              <span className="text-[#8E8E93]">Quick queries:</span>
              {sampleQueries.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(sq);
                    handleSearch(sq);
                  }}
                  className="text-[11px] text-[#0071E3] dark:text-[#0A84FF] hover:underline bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1 rounded-[8px] border border-black/[0.07] dark:border-white/[0.07] transition-colors"
                >
                  "{sq}"
                </button>
              ))}
            </div>
          </div>

          {/* Main Analytical Work Surface: Results & Evidence Split */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Answer & Exact Provenance Citations (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-[18px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-[0_2px_8px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.30)] p-6 space-y-5">
                <div className="flex items-center justify-between border-b border-black/[0.07] dark:border-white/[0.07] pb-3">
                  <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                    <FileText className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                    <span>Company Answer</span>
                  </div>
                  {result && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={copiedBundle ? <Check className="w-3.5 h-3.5 text-tars-success-text" /> : <Copy className="w-3.5 h-3.5" />}
                      onClick={handleCopyCitationBundle}
                    >
                      {copiedBundle ? 'Copied' : 'Export Citations'}
                    </Button>
                  )}
                </div>

                {loading ? (
                  <div className="space-y-4 py-4">
                    <div className="flex items-center gap-2.5 text-[13px] text-[#6E6E73] dark:text-[#8E8E93] pb-1">
                      <Spinner size="sm" />
                      <span>Searching company knowledge...</span>
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-4 w-4/5" />
                    <div className="pt-4 flex gap-2">
                      <Skeleton className="h-8 w-36" />
                      <Skeleton className="h-8 w-40" />
                    </div>
                  </div>
                ) : result ? (
                  <div className="space-y-5">
                    <p className="text-[14px] sm:text-[15px] text-black dark:text-white leading-relaxed font-normal">
                      {result.answer}
                    </p>

                    {/* Evidence Citations Section */}
                    <div className="pt-4 border-t border-black/[0.07] dark:border-white/[0.07] space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                          Sources ({result.citations.length})
                        </span>
                        <span className="text-[11px] text-[#8E8E93]">
                          Click any source to inspect excerpt
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {result.citations.map((c, idx) => (
                          <div
                            key={idx}
                            onClick={() => onOpenCitation(c)}
                            className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.05] cursor-pointer transition-all duration-150 group flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between text-[12px] font-semibold text-black dark:text-white">
                                <span className="truncate pr-2">{c.doc_title}</span>
                                <span className="text-[10px] font-mono text-[#8E8E93] shrink-0">
                                  p.{c.page_number}
                                </span>
                              </div>
                              <p className="text-xs text-tars-text-secondary line-clamp-2 mt-1.5 italic leading-relaxed">
                                "{c.snippet}"
                              </p>
                            </div>
                            <div className="mt-2.5 pt-1.5 border-t border-tars-separator/40 flex items-center justify-between text-[11px] text-tars-accent font-medium">
                              <span>Inspect Source Snippet</span>
                              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Search className="w-5 h-5 text-tars-text-tertiary" />}
                    title="Search company memory"
                    description="Enter a query above to retrieve exact references across contracts, meeting recordings, and strategic decisions."
                  />
                )}
              </div>
            </div>

            {/* Right Column: Ambient Drop Area & Recent Lake Ingestions (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* Ambient Drag & Drop Area */}
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`p-6 rounded-2xl border-2 border-dashed text-center transition-all ${
                  dragOver
                    ? 'border-tars-accent bg-tars-surface-secondary scale-102'
                    : 'border-tars-separator bg-tars-surface/50 hover:bg-tars-surface'
                }`}
              >
                <UploadCloud className="w-8 h-8 text-tars-text-tertiary mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-tars-text-primary">
                  Drop Files Here
                </h4>
                <p className="text-xs text-tars-text-secondary mt-1 max-w-xs mx-auto leading-relaxed">
                  Drop PDFs, Word documents, spreadsheets, or audio notes. Automatically indexed.
                </p>
                <div className="mt-3 text-[11px] font-mono text-tars-text-tertiary">
                  Local folder: ~/Documents/TARS/
                </div>
              </div>

              {/* Indexed Documents Summary */}
              <div className="apple-card p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                  <span>Recent Documents</span>
                  <button
                    onClick={() => setActiveView('lake')}
                    className="text-tars-accent hover:underline text-xs font-medium"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {indexedLakeDocuments.slice(0, 3).map((doc) => (
                    <div
                      key={doc.id}
                      onClick={() =>
                        setReaderModal({
                          open: true,
                          title: doc.title,
                          department: doc.department,
                          clearance: doc.clearance,
                          content: doc.content,
                        })
                      }
                      className="p-3 rounded-xl border border-tars-separator bg-tars-surface hover:bg-tars-surface-secondary cursor-pointer transition-colors flex items-start gap-2.5 group"
                    >
                      <FileText className="w-4 h-4 text-tars-accent shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-tars-text-primary truncate group-hover:text-tars-accent transition-colors">
                          {doc.title}
                        </div>
                        <div className="text-[11px] text-tars-text-tertiary mt-0.5">
                          {doc.department} • {doc.type} • {doc.clearance}
                        </div>
                      </div>
                      <Eye className="w-3.5 h-3.5 text-tars-text-tertiary group-hover:text-tars-text-primary shrink-0 mt-1" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: DOCUMENT LAKE BROWSER */}
      {activeView === 'lake' && (
        <div className="apple-card p-6 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-tars-separator/60 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-tars-text-primary">
                Company Document Lake & Ingestion Repository
              </h3>
              <p className="text-xs text-tars-text-secondary mt-0.5">
                All unredacted startup IP indexed locally under sovereign encryption
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-tars-text-tertiary">
                Total Files: {indexedLakeDocuments.length}
              </span>
            </div>
          </div>

          {/* Document Lake Table */}
          <div className="overflow-x-auto rounded-xl border border-tars-separator">
            <table className="w-full text-left text-xs">
              <thead className="bg-tars-surface-secondary text-tars-text-secondary font-semibold uppercase tracking-wider text-[10px] border-b border-tars-separator">
                <tr>
                  <th className="py-3 px-4">Document Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4">Clearance</th>
                  <th className="py-3 px-4">Indexed Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-tars-separator bg-tars-surface">
                {indexedLakeDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-tars-surface-secondary/50 transition-colors cursor-pointer group"
                    onClick={() =>
                      setReaderModal({
                        open: true,
                        title: doc.title,
                        department: doc.department,
                        clearance: doc.clearance,
                        content: doc.content,
                      })
                    }
                  >
                    <td className="py-3 px-4 font-semibold text-tars-text-primary flex items-center gap-2">
                      <FileText className="w-4 h-4 text-tars-accent shrink-0" />
                      <span className="truncate max-w-xs">{doc.title}</span>
                    </td>
                    <td className="py-3 px-4 text-tars-text-secondary">{doc.department}</td>
                    <td className="py-3 px-4 text-tars-text-secondary font-mono">{doc.type}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-tars-surface-tertiary text-tars-text-secondary">
                        {doc.clearance}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-tars-text-tertiary font-mono">{doc.date}</td>
                    <td className="py-3 px-4 text-right">
                      <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>
                        Read
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Document Reader Modal */}
      <DocumentReaderModal
        isOpen={readerModal.open}
        onClose={() => setReaderModal((prev) => ({ ...prev, open: false }))}
        docTitle={readerModal.title}
        department={readerModal.department}
        clearance={readerModal.clearance}
        content={readerModal.content}
      />
    </div>
  );
};
