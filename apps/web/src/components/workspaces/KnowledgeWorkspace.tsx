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
  const [query, setQuery] = useState('');
  const [department, setDepartment] = useState('ALL');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [copiedBundle, setCopiedBundle] = useState(false);
  const [lakeDocuments, setLakeDocuments] = useState<any[]>([]);

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

  const fetchLakeDocuments = async () => {
    try {
      const res = await fetch('/api/ingestion/documents');
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.documents)) {
          setLakeDocuments(data.documents);
        }
      }
    } catch {
      setLakeDocuments([]);
    }
  };

  useEffect(() => {
    fetchLakeDocuments();
  }, [uploadSuccess]);

  const handleSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResult(null);
      return;
    }
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
    if (query.trim()) {
      handleSearch(query);
    }
  }, [department]);

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  const handleFileUploadWithRef = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const uploaded = await api.uploadDocument(files[0]);
      setUploadSuccess(`Ingested "${uploaded.title}" (${uploaded.pages} pages) into local vector index.`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (err) {
      setUploadError('Upload failed. Ensure the file is a supported format.');
      console.error(err);
    } finally {
      setUploading(false);
      // reset input so same file can be re-uploaded
      if (fileInputRef.current) fileInputRef.current.value = '';
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
    "Runway survival model with 12 team members",
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
                { value: 'lake', label: 'All Documents', badge: lakeDocuments.length },
              ]}
              value={activeView}
              onChange={(v) => setActiveView(v as any)}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.csv,.xlsx"
              onChange={(e) => handleFileUploadWithRef(e.target.files)}
            />
            <Button
              variant="primary"
              size="sm"
              icon={<UploadCloud className="w-4 h-4" />}
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Document
            </Button>
          </div>
        }
      />

      {uploadSuccess && (
        <div className="p-3.5 rounded-[12px] border border-[#0071E3]/[0.22] dark:border-[#0A84FF]/[0.22] bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.10] text-[#0051A2] dark:text-[#0A84FF] text-[13px] flex items-center gap-2 animate-slide-up">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
          <span className="flex-1">{uploadSuccess}</span>
          <button onClick={() => setUploadSuccess(null)} className="text-[11px] font-medium opacity-60 hover:opacity-100 transition-opacity">Dismiss</button>
        </div>
      )}

      {uploadError && (
        <div className="p-3.5 rounded-[12px] border border-[#FF3B30]/[0.22] bg-[#FF3B30]/[0.08] text-[#C0392B] dark:text-[#FF453A] text-[13px] flex items-center gap-2 animate-slide-up">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/><path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M12 8v4m0 4h.01"/></svg>
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-[11px] font-medium opacity-60 hover:opacity-100 transition-opacity">Dismiss</button>
        </div>
      )}

      {/* VIEW 1: SEARCH & CITATIONS */}
      {activeView === 'search' && (
        <>
          {/* Apple Clean Search Input */}
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-sm p-4 sm:p-5 space-y-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch(query);
              }}
              className="space-y-3"
            >
              <div className="relative flex items-center">
                <Search className="w-4 h-4 text-[#8E8E93] absolute left-4 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search institutional memory, contracts, or architecture records..."
                  className="w-full pl-11 pr-24 py-3 text-[14px] sm:text-[15px] rounded-full border border-black/[0.08] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.05] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-2 focus:ring-black/10 dark:focus:ring-white/10 focus:border-black dark:focus:border-white transition-all font-normal"
                />
                <div className="absolute right-1.5">
                  <Button type="submit" variant="primary" size="sm" loading={loading}>
                    Search
                  </Button>
                </div>
              </div>

              {/* Department Filter */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                  <span className="text-[#86868B] dark:text-[#8E8E93] text-[12px] font-normal mr-1">
                    Filter:
                  </span>
                  {departments.map((dept) => (
                    <button
                      type="button"
                      key={dept}
                      onClick={() => setDepartment(dept)}
                      className={`px-3 py-1 rounded-full text-[12px] transition-all cursor-pointer ${
                        department === dept
                          ? 'bg-black text-white dark:bg-white dark:text-black font-medium shadow-xs'
                          : 'text-[#86868B] dark:text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      {dept}
                    </button>
                  ))}
                </div>
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
                  className="text-[11px] text-black dark:text-white hover:underline bg-black/[0.03] dark:bg-white/[0.04] px-2.5 py-1 rounded-[8px] border border-black/[0.07] dark:border-white/[0.07] transition-colors"
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
                    <FileText className="w-4 h-4 text-black dark:text-white" />
                    <span>Company Answer</span>
                  </div>
                  {result && (
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={copiedBundle ? <Check className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" /> : <Copy className="w-3.5 h-3.5" />}
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
                              <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] line-clamp-2 mt-1.5 italic leading-relaxed">
                                "{c.snippet}"
                              </p>
                            </div>
                            <div className="mt-2.5 pt-1.5 border-t border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between text-[11px] text-black dark:text-white font-medium">
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
                    icon={<Search className="w-5 h-5 text-[#8E8E93]" />}
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
                  handleFileUploadWithRef(e.dataTransfer.files);
                }}
                className={`relative p-6 rounded-[18px] border-2 border-dashed text-center transition-all cursor-pointer ${
                  dragOver
                    ? 'border-[#0071E3] dark:border-[#0A84FF] bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.12] scale-[1.01]'
                    : 'border-black/[0.12] dark:border-white/[0.14] bg-white dark:bg-[#1C1C1E] hover:border-black/[0.24] dark:hover:border-white/[0.28]'
                }`}
              >
                <input
                  type="file"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".pdf,.docx,.txt,.csv,.xlsx,.m4a"
                  onChange={(e) => handleFileUploadWithRef(e.target.files)}
                  title="Click or drop files to ingest"
                />
                <div className="w-10 h-10 rounded-full bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center mx-auto mb-2 text-[#6E6E73] dark:text-[#8E8E93]">
                  <UploadCloud className="w-5 h-5 text-[#0071E3] dark:text-[#0A84FF]" />
                </div>
                <h4 className="text-[14px] font-semibold text-black dark:text-white">
                  Drop Files Here or Click to Upload
                </h4>
                <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-1 max-w-xs mx-auto leading-relaxed">
                  Drop PDFs, Word documents, spreadsheets, or audio notes. Automatically indexed into local Tantivy.
                </p>
                <div className="mt-3 text-[11px] font-mono text-[#8E8E93]">
                  0.00 KB Egress • Local SQLite Vector Store
                </div>
              </div>

              {/* Indexed Documents Summary */}
              <div className="apple-card p-4 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                  <span>Recent Documents</span>
                  <button
                    onClick={() => setActiveView('lake')}
                    className="text-[#0071E3] dark:text-[#0A84FF] hover:underline text-xs font-medium"
                  >
                    View All
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  {lakeDocuments.length === 0 ? (
                    <div className="text-center py-4 text-[12px] text-[#8E8E93]">
                      No documents indexed yet. Upload a file above.
                    </div>
                  ) : (
                    lakeDocuments.slice(0, 3).map((doc, idx) => {
                      const title = doc.filename || doc.title || `Document #${idx + 1}`;
                      const dept = doc.department || 'GENERAL';
                      const docType = doc.format || 'Document';
                      const clr = doc.clearance || 'ALL_TEAM';
                      const content = doc.preview || doc.content || 'Indexed in local sovereign memory.';
                      return (
                        <div
                          key={doc.doc_id || doc.id || idx}
                          onClick={() =>
                            setReaderModal({
                              open: true,
                              title,
                              department: dept,
                              clearance: clr,
                              content,
                            })
                          }
                          className="p-3 rounded-[12px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] hover:bg-black/[0.02] dark:hover:bg-white/[0.04] cursor-pointer transition-colors flex items-start gap-2.5 group"
                        >
                          <FileText className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0 mt-0.5" />
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold text-black dark:text-white truncate group-hover:text-[#0071E3] dark:group-hover:text-[#0A84FF] transition-colors">
                              {title}
                            </div>
                            <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                              {dept} • {docType} • {clr}
                            </div>
                          </div>
                          <Eye className="w-3.5 h-3.5 text-[#8E8E93] group-hover:text-black dark:group-hover:text-white shrink-0 mt-1" />
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* VIEW 2: DOCUMENT LAKE BROWSER */}
      {activeView === 'lake' && (
        <div className="rounded-[18px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-6 space-y-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/[0.08] dark:border-white/[0.08] pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-black dark:text-white">
                Company Document Lake & Ingestion Repository
              </h3>
              <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                All unredacted startup IP indexed locally under sovereign encryption
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-[#8E8E93]">
                Total Files: {lakeDocuments.length}
              </span>
            </div>
          </div>

          {lakeDocuments.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-5 h-5 text-[#8E8E93]" />}
              title="No documents ingested yet"
              description="Drop or upload PDFs, Word documents, spreadsheets, or markdown files to populate institutional memory."
              actionLabel="Upload First Document"
              onAction={() => fileInputRef.current?.click()}
            />
          ) : (
            <div className="overflow-x-auto rounded-[14px] border border-black/[0.08] dark:border-white/[0.10]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F5F5F7] dark:bg-[#2C2C2E] text-[#6E6E73] dark:text-[#8E8E93] font-semibold uppercase tracking-wider text-[10px] border-b border-black/[0.08] dark:border-white/[0.08]">
                  <tr>
                    <th className="py-3 px-4">Document Title</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Clearance</th>
                    <th className="py-3 px-4">Tables / Chunks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.06] dark:divide-white/[0.06] bg-white dark:bg-[#1C1C1E]">
                  {lakeDocuments.map((doc, idx) => {
                    const title = doc.filename || doc.title || `Document #${idx + 1}`;
                    const dept = doc.department || 'GENERAL';
                    const docType = doc.format || 'Document';
                    const clr = doc.clearance || 'ALL_TEAM';
                    const content = doc.preview || doc.content || 'Indexed in local sovereign memory.';
                    return (
                      <tr
                        key={doc.doc_id || doc.id || idx}
                        className="hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors cursor-pointer group"
                        onClick={() =>
                          setReaderModal({
                            open: true,
                            title,
                            department: dept,
                            clearance: clr,
                            content,
                          })
                        }
                      >
                        <td className="py-3 px-4 font-semibold text-black dark:text-white flex items-center gap-2">
                          <FileText className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                          <span className="truncate max-w-xs">{title}</span>
                        </td>
                        <td className="py-3 px-4 text-[#3C3C43] dark:text-[#EBEBF5]">{dept}</td>
                        <td className="py-3 px-4 text-[#6E6E73] dark:text-[#8E8E93] font-mono">{docType}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-black/[0.05] dark:bg-white/[0.08] text-black dark:text-white">
                            {clr}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-[#8E8E93] font-mono">
                          {doc.table_count || 0} tables • {doc.chunk_count || 1} chunks
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Button variant="ghost" size="sm" icon={<Eye className="w-3.5 h-3.5" />}>
                            Read
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
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
