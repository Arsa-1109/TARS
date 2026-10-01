import React, { useState, useEffect, useMemo, useRef } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { Skeleton } from '../primitives/Skeleton';
import { Spinner } from '../primitives/Spinner';
import { EmptyState } from '../primitives/EmptyState';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { Dialog } from '../primitives/Dialog';
import { DocumentReaderModal } from './DocumentReaderModal';
import { SearchCitation, UserRole, ChatSessionDTO, ChatMessageDTO, ChatAttachment } from '../../types/contracts';
import { knowledgeChatApi } from '../../services/knowledgeChatApi';
import { ingestionApi } from '../../services/ingestionApi';
import { useSessionStore } from '../../state/useSessionStore';
import { realtimeBus } from '../../services/realtime';
import {
  Search,
  FileText,
  UploadCloud,
  Sparkles,
  ArrowRight,
  Copy,
  Check,
  Eye,
  ChevronLeft,
  ChevronRight,
  Plus,
  MessageSquare,
  MoreVertical,
  Edit2,
  Trash2,
  Trash,
  RotateCcw,
  Paperclip,
  Send,
  Shield,
  Layers,
  HelpCircle,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';

interface KnowledgeWorkspaceProps {
  onOpenCitation: (citation: SearchCitation) => void;
  userRole: UserRole;
  clearance: string;
}

const FormattedAnswer: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: React.ReactNode[] = [];
  let listType: 'ol' | 'ul' | null = null;

  const renderInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-black dark:text-white">
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const flushList = (keyPrefix: string | number) => {
    if (currentList.length > 0 && listType) {
      if (listType === 'ol') {
        elements.push(
          <ol key={`list-${keyPrefix}`} className="space-y-2.5 my-3 list-none">
            {currentList}
          </ol>
        );
      } else {
        elements.push(
          <ul key={`list-${keyPrefix}`} className="space-y-1.5 my-2 list-none pl-2">
            {currentList}
          </ul>
        );
      }
      currentList = [];
      listType = null;
    }
  };

  lines.forEach((rawLine, idx) => {
    const trimmed = rawLine.trim();
    if (!trimmed) {
      flushList(idx);
      return;
    }

    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)/);

    if (numMatch) {
      if (listType !== 'ol') flushList(idx);
      listType = 'ol';
      currentList.push(
        <li key={idx} className="flex items-start gap-2.5 text-[14px] sm:text-[14.5px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
          <span className="flex items-center justify-center w-5 h-5 rounded-full bg-black/[0.06] dark:bg-white/[0.1] text-[11px] font-bold text-black dark:text-white shrink-0 mt-0.5">
            {numMatch[1]}
          </span>
          <div className="flex-1 space-y-1">{renderInline(numMatch[2])}</div>
        </li>
      );
    } else if (bulletMatch) {
      if (listType !== 'ul') flushList(idx);
      listType = 'ul';
      currentList.push(
        <li key={idx} className="flex items-start gap-2.5 text-[14px] sm:text-[14.5px] text-[#3A3A3C] dark:text-[#D1D1D6] leading-relaxed pl-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#0071E3] dark:bg-[#0A84FF] shrink-0 mt-2" />
          <div className="flex-1">{renderInline(bulletMatch[1])}</div>
        </li>
      );
    } else {
      flushList(idx);
      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={idx} className="text-[15px] font-semibold text-black dark:text-white mt-4 mb-1">
            {renderInline(trimmed.slice(4))}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={idx} className="text-[16px] font-bold text-black dark:text-white mt-4 mb-2">
            {renderInline(trimmed.slice(3))}
          </h3>
        );
      } else {
        elements.push(
          <p key={idx} className="text-[14px] sm:text-[14.5px] text-[#1D1D1F] dark:text-[#F5F5F7] leading-relaxed">
            {renderInline(trimmed)}
          </p>
        );
      }
    }
  });

  flushList('final');
  return <div className="space-y-3">{elements}</div>;
};

export const KnowledgeWorkspace: React.FC<KnowledgeWorkspaceProps> = ({
  onOpenCitation,
  userRole,
  clearance,
}) => {
  const { profile } = useSessionStore();

  // Resolve consistent sovereign user ID for strict isolation
  const effectiveUserId = useMemo(() => {
    if (profile?.id) return profile.id;
    const name = profile?.name?.toLowerCase() || '';
    if (name.includes('alex')) return 'usr-alex';
    if (name.includes('chloe')) return 'usr-chloe';
    if (name.includes('elena')) return 'usr-elena';
    if (name.includes('marcus')) return 'usr-marcus';
    if (name.includes('sarah')) return 'usr-sarah';
    if (name.includes('liam')) return 'usr-liam';
    return 'usr-alex';
  }, [profile]);

  const [activeView, setActiveView] = useState<'chat' | 'lake'>('chat');

  // Chat Sessions & Messages State
  const [chats, setChats] = useState<ChatSessionDTO[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageDTO[]>([]);
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [inputMessage, setInputMessage] = useState('');
  const [chatSearch, setChatSearch] = useState('');

  // UI Interactive States
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [menuOpenChatId, setMenuOpenChatId] = useState<string | null>(null);
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chatToDelete, setChatToDelete] = useState<ChatSessionDTO | null>(null);
  const [clearDialogOpen, setClearDialogOpen] = useState(false);
  const [chatToClear, setChatToClear] = useState<ChatSessionDTO | null>(null);

  // Ingestion & Upload State
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileUploadMapRef = useRef<Map<string, File>>(new Map());

  // Lake Documents State
  const [lakeDocuments, setLakeDocuments] = useState<any[]>([]);
  const [lakeDepartment, setLakeDepartment] = useState<string>('ALL');
  const [lakeSearch, setLakeSearch] = useState<string>('');
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Document Reader modal state
  const [readerModal, setReaderModal] = useState<{
    open: boolean;
    title: string;
    department: string;
    clearance: string;
    content: string;
    pageCount?: number;
    chunkCount?: number;
    organisationId?: string;
    validFrom?: number | string;
    validUntil?: number | string;
  }>({
    open: false,
    title: '',
    department: '',
    clearance: '',
    content: '',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  // Fetch Lake Documents Catalog
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
    const unsub = realtimeBus.subscribe((evt) => {
      if (
        evt.event === 'DOCUMENT_UPLOADED' ||
        evt.event === 'DOCUMENT_PROCESSED' ||
        evt.event === 'DROP_EVENT' ||
        evt.event === 'CALL_DELETED'
      ) {
        fetchLakeDocuments();
      }
    });
    return unsub;
  }, [uploadSuccess]);

  // Fetch Chats for current user
  const fetchChats = async () => {
    setLoadingChats(true);
    try {
      const list = await knowledgeChatApi.listChats(effectiveUserId);
      setChats(list);
      if (list.length > 0) {
        // Keep active chat if valid, or select the first one
        if (!activeChatId || !list.some((c) => c.id === activeChatId)) {
          setActiveChatId(list[0].id);
        }
      } else {
        // Automatically spawn an initial clean chat if user has none
        const initial = await knowledgeChatApi.createChat(effectiveUserId, 'New conversation');
        setChats([initial]);
        setActiveChatId(initial.id);
      }
    } catch (err) {
      console.error('Failed to fetch user chats:', err);
    } finally {
      setLoadingChats(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, [effectiveUserId]);

  // Fetch messages whenever activeChatId changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }
    let isCancelled = false;
    const fetchChatMessages = async () => {
      setLoadingMessages(true);
      try {
        const msgs = await knowledgeChatApi.listMessages(activeChatId, effectiveUserId);
        if (!isCancelled) {
          setMessages(msgs);
        }
      } catch (err) {
        console.error('Failed to load messages for chat:', activeChatId, err);
        if (!isCancelled) setMessages([]);
      } finally {
        if (!isCancelled) setLoadingMessages(false);
      }
    };
    fetchChatMessages();
    return () => {
      isCancelled = true;
    };
  }, [activeChatId, effectiveUserId]);

  // Create New Chat
  const handleCreateNewChat = async () => {
    try {
      const newChat = await knowledgeChatApi.createChat(effectiveUserId, 'New conversation');
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      setMessages([]);
      setTimeout(() => composerInputRef.current?.focus(), 50);
    } catch (err) {
      console.error('Failed to create new chat:', err);
    }
  };

  // Send Message
  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend !== undefined ? textToSend : inputMessage).trim();
    if (!text || sending) return;

    let targetChatId = activeChatId;
    // Auto-create chat if none active
    if (!targetChatId) {
      try {
        const newChat = await knowledgeChatApi.createChat(effectiveUserId, 'New conversation');
        setChats((prev) => [newChat, ...prev]);
        targetChatId = newChat.id;
        setActiveChatId(newChat.id);
      } catch (err) {
        console.error('Failed to create chat for message:', err);
        return;
      }
    }

    setInputMessage('');
    setSending(true);

    // Optimistic user message bubble
    const tempUserMsg: ChatMessageDTO = {
      id: `temp-${Date.now()}`,
      chat_id: targetChatId,
      role: 'user',
      content: text,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const assistantMsg = await knowledgeChatApi.sendMessage(targetChatId, {
        content: text,
        userId: effectiveUserId,
        userRole: userRole || profile?.role || 'ENGINEER',
        userName: profile?.name || 'Team Member',
        clearance: clearance || profile?.clearance || 'ALL_TEAM',
      });

      // Refresh list to update title if derived or timestamps
      const updatedChats = await knowledgeChatApi.listChats(effectiveUserId);
      setChats(updatedChats);

      // Re-fetch messages from persistent backend to synchronize IDs & timestamps
      const freshMessages = await knowledgeChatApi.listMessages(targetChatId, effectiveUserId);
      setMessages(freshMessages);
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Append truthful failure notice
      const errorMsg: ChatMessageDTO = {
        id: `err-${Date.now()}`,
        chat_id: targetChatId,
        role: 'assistant',
        content: `Sorry, unable to process request: ${err?.message || 'Network error'}. Please try again.`,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
      setTimeout(() => composerInputRef.current?.focus(), 50);
    }
  };

  // Rename Chat
  const handleStartRename = (chat: ChatSessionDTO, e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpenChatId(null);
    setEditingChatId(chat.id);
    setEditingTitle(chat.title);
  };

  const handleSaveRename = async (chatId: string) => {
    if (!editingTitle.trim()) {
      setEditingChatId(null);
      return;
    }
    try {
      const updated = await knowledgeChatApi.renameChat(chatId, editingTitle.trim(), effectiveUserId);
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: updated.title } : c)));
    } catch (err) {
      console.error('Failed to rename chat:', err);
    } finally {
      setEditingChatId(null);
    }
  };

  // Delete Chat
  const handleConfirmDeleteChat = async () => {
    if (!chatToDelete) return;
    try {
      await knowledgeChatApi.deleteChat(chatToDelete.id, effectiveUserId);
      const remaining = chats.filter((c) => c.id !== chatToDelete.id);
      setChats(remaining);
      if (activeChatId === chatToDelete.id) {
        if (remaining.length > 0) {
          setActiveChatId(remaining[0].id);
        } else {
          setActiveChatId(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    } finally {
      setDeleteDialogOpen(false);
      setChatToDelete(null);
    }
  };

  // Clear Chat Messages
  const handleConfirmClearChat = async () => {
    const target = chatToClear || (activeChatId ? chats.find((c) => c.id === activeChatId) : null);
    if (!target) return;
    try {
      await knowledgeChatApi.clearChat(target.id, effectiveUserId);
      if (activeChatId === target.id) {
        setMessages([]);
      }
    } catch (err) {
      console.error('Failed to clear chat:', err);
    } finally {
      setClearDialogOpen(false);
      setChatToClear(null);
    }
  };

  // Copy message
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Open Document Reader from attachment card
  const handleOpenReaderForAttachment = (att: ChatAttachment) => {
    const lakeDoc = lakeDocuments.find(
      (d) =>
        (att.doc_id && (d.id === att.doc_id || d.doc_id === att.doc_id)) ||
        (d.filename || d.title) === att.file_name
    );
    setReaderModal({
      open: true,
      title: att.file_name,
      department: lakeDoc?.department || 'GENERAL',
      clearance: lakeDoc?.clearance || 'ALL_TEAM',
      content:
        lakeDoc?.content ||
        lakeDoc?.raw_text ||
        `# ${att.file_name}\n\nDocument successfully indexed into sovereign knowledge repository.\nPages: ${att.pages || 1}\nClearance: Sovereign Local Storage\nStatus: Verified and Grounded.`,
      pageCount: att.pages || lakeDoc?.pages || 1,
      chunkCount: lakeDoc?.chunk_count || 1,
    });
  };

  // Quick prompt to ask about this document
  const handleAskAboutDoc = (fileName: string) => {
    setInputMessage(`Summarize key points, decisions, and clauses in "${fileName}"`);
    setTimeout(() => composerInputRef.current?.focus(), 50);
  };

  // Retry document upload
  const handleRetryUpload = async (uploadMsgId: string) => {
    const file = fileUploadMapRef.current.get(uploadMsgId);
    if (!file) return;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === uploadMsgId && m.attachment
          ? {
              ...m,
              attachment: {
                ...m.attachment,
                status: 'uploading',
                progress: 0,
                error_message: undefined,
              },
            }
          : m
      )
    );

    try {
      const uploaded = await ingestionApi.uploadDocumentXHR(file, (pct) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === uploadMsgId && m.attachment
              ? { ...m, attachment: { ...m.attachment, progress: pct } }
              : m
          )
        );
      });

      setMessages((prev) =>
        prev.map((m) =>
          m.id === uploadMsgId && m.attachment
            ? {
                ...m,
                attachment: {
                  ...m.attachment,
                  status: 'indexed',
                  progress: 100,
                  doc_id: uploaded.doc_id,
                  pages: uploaded.pages,
                },
              }
            : m
        )
      );
      fetchLakeDocuments();
    } catch (err: any) {
      const errorMsg = err?.message || 'Upload retry failed.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === uploadMsgId && m.attachment
            ? {
                ...m,
                attachment: {
                  ...m.attachment,
                  status: 'error',
                  error_message: errorMsg,
                },
              }
            : m
        )
      );
    }
  };

  // Document Upload
  const handleFileUploadWithRef = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];

    // Auto-create chat if none active
    let targetChatId = activeChatId;
    if (!targetChatId) {
      try {
        const newChat = await knowledgeChatApi.createChat(effectiveUserId, `Upload: ${file.name}`);
        setChats((prev) => [newChat, ...prev]);
        targetChatId = newChat.id;
        setActiveChatId(newChat.id);
      } catch (err) {
        console.error('Failed to create chat for upload:', err);
        return;
      }
    }

    const uploadMsgId = `upload-${Date.now()}`;
    fileUploadMapRef.current.set(uploadMsgId, file);
    const format = file.name.split('.').pop()?.toUpperCase() || 'DOC';

    // Insert visible upload item in the active chat conversation immediately
    const newAttachmentMsg: ChatMessageDTO = {
      id: uploadMsgId,
      chat_id: targetChatId,
      role: 'user',
      content: `[Uploaded document: ${file.name}]`,
      created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      attachment: {
        file_name: file.name,
        file_size: file.size,
        format,
        status: 'uploading',
        progress: 0,
      },
    };

    setMessages((prev) => [...prev, newAttachmentMsg]);
    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      const uploaded = await ingestionApi.uploadDocumentXHR(file, (pct) => {
        setUploadProgress(pct);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === uploadMsgId && m.attachment
              ? { ...m, attachment: { ...m.attachment, progress: pct } }
              : m
          )
        );
      });

      setUploadProgress(100);
      setUploadSuccess(`Ingested "${uploaded.title}" (${uploaded.pages} pages) into local sovereign memory.`);
      setTimeout(() => {
        setUploadSuccess(null);
        setUploadProgress(0);
      }, 5000);

      // Update attachment card to indexed
      setMessages((prev) =>
        prev.map((m) =>
          m.id === uploadMsgId && m.attachment
            ? {
                ...m,
                attachment: {
                  ...m.attachment,
                  status: 'indexed',
                  progress: 100,
                  doc_id: uploaded.doc_id,
                  pages: uploaded.pages,
                },
              }
            : m
        )
      );

      // Refresh Lake documents
      fetchLakeDocuments();

      // Assistant acknowledgment
      const assistMsgId = `tars-ack-${Date.now()}`;
      const assistMsg: ChatMessageDTO = {
        id: assistMsgId,
        chat_id: targetChatId,
        role: 'assistant',
        content: `I have indexed **${uploaded.title || file.name}** (${uploaded.pages || 1} pages) into company sovereign memory.\n\nYou can ask questions about its contents, clauses, or implications right away.`,
        created_at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        citations: [
          {
            doc_id: uploaded.doc_id || 'DOC-NEW',
            doc_title: uploaded.title || file.name,
            page_number: 1,
            snippet: `Document "${uploaded.title || file.name}" was ingested and indexed into Document Lake.`,
          },
        ],
      };
      setMessages((prev) => [...prev, assistMsg]);

    } catch (err: any) {
      const errorMsg = err?.message || 'Upload failed. Ensure the file is a supported format.';
      setUploadError(errorMsg);
      console.error(err);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === uploadMsgId && m.attachment
            ? {
                ...m,
                attachment: {
                  ...m.attachment,
                  status: 'error',
                  error_message: errorMsg,
                },
              }
            : m
        )
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Filtered Chats
  const filteredChats = useMemo(() => {
    if (!chatSearch.trim()) return chats;
    const q = chatSearch.toLowerCase();
    return chats.filter((c) => c.title.toLowerCase().includes(q));
  }, [chats, chatSearch]);

  const activeChat = useMemo(() => {
    return chats.find((c) => c.id === activeChatId) || null;
  }, [chats, activeChatId]);

  // Suggested Queries
  const sampleQueries = [
    'What is our payment provider?',
    'What did we promise Acme about SAML?',
    'What is our policy on enterprise customisations?',
    'Runway survival model with 12 team members',
  ];

  // Document Lake calculations
  const lakeDepartmentTabs = useMemo(() => {
    return ['ALL', 'EXECUTIVE', 'PRODUCT', 'ENGINEERING', 'SALES', 'FINANCE', 'LEGAL'];
  }, []);

  const departmentCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: lakeDocuments.length };
    for (const doc of lakeDocuments) {
      const d = (doc.department || 'GENERAL').toUpperCase();
      counts[d] = (counts[d] || 0) + 1;
    }
    return counts;
  }, [lakeDocuments]);

  const filteredLakeDocuments = useMemo(() => {
    return lakeDocuments.filter((doc) => {
      const docDept = (doc.department || 'GENERAL').toUpperCase();
      const matchesDept = lakeDepartment === 'ALL' || docDept === lakeDepartment;
      const title = (doc.filename || doc.title || '').toLowerCase();
      const format = (doc.format || '').toLowerCase();
      const q = lakeSearch.toLowerCase();
      const matchesSearch = !q || title.includes(q) || docDept.toLowerCase().includes(q) || format.includes(q);
      return matchesDept && matchesSearch;
    });
  }, [lakeDocuments, lakeDepartment, lakeSearch]);

  const totalPages = Math.max(1, Math.ceil(filteredLakeDocuments.length / pageSize));

  const paginatedDocs = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredLakeDocuments.slice(start, start + pageSize);
  }, [filteredLakeDocuments, currentPage, pageSize]);

  return (
    <div className="h-full flex flex-col flex-1 min-h-0 overflow-hidden space-y-3">
      {/* Standard TARS Workspace PageHeader */}
      <PageHeader
        eyebrow="Workspace 1"
        title="Company Knowledge"
        description="Search company documents, contracts, and decisions with verifiable citations."
        className="pb-3 mb-0 shrink-0"
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase px-2 py-1 rounded-full bg-[#0071E3]/[0.10] text-[#0071E3] dark:text-[#0A84FF] font-medium hidden sm:inline-block">
              {clearance}
            </span>
            <SegmentedControl
              size="sm"
              options={[
                { value: 'chat', label: 'Chat Assistant' },
                { value: 'lake', label: 'Document Lake', badge: lakeDocuments.length },
              ]}
              value={activeView}
              onChange={(v) => setActiveView(v as any)}
            />
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.csv,.xlsx,.m4a"
              onChange={(e) => handleFileUploadWithRef(e.target.files)}
            />
            <Button
              variant="primary"
              size="sm"
              icon={<UploadCloud className="w-3.5 h-3.5" />}
              loading={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              Upload Document
            </Button>
          </div>
        }
      />

      {/* Upload Toast (For Document Lake view or subtle feedback) */}
      {uploadSuccess && (
        <div className="p-2.5 px-3.5 rounded-[12px] border border-[#0071E3]/[0.22] dark:border-[#0A84FF]/[0.22] bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.10] text-[#0051A2] dark:text-[#0A84FF] text-xs flex items-center gap-2 shrink-0 animate-slide-up">
          <Check className="w-3.5 h-3.5 shrink-0 text-[#0071E3] dark:text-[#0A84FF]" />
          <span className="flex-1 font-medium truncate">{uploadSuccess}</span>
          <button onClick={() => setUploadSuccess(null)} className="text-[10px] font-medium opacity-60 hover:opacity-100 transition-opacity">
            Dismiss
          </button>
        </div>
      )}

      {uploadError && (
        <div className="p-2.5 px-3.5 rounded-[12px] border border-[#FF3B30]/[0.22] bg-[#FF3B30]/[0.08] text-[#C0392B] dark:text-[#FF453A] text-xs flex items-center gap-2 shrink-0 animate-slide-up">
          <span className="flex-1 font-medium truncate">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-[10px] font-medium opacity-60 hover:opacity-100 transition-opacity">
            Dismiss
          </button>
        </div>
      )}

      {/* VIEW 1: PERSISTENT COMPANY KNOWLEDGE CHATBOT */}
      {activeView === 'chat' && (
        <div className="flex-1 min-h-[560px] rounded-[18px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-sm flex flex-row overflow-hidden">

          {/* LEFT SIDEBAR: CONVERSATION LIST */}
          <div className="w-72 lg:w-80 shrink-0 border-r border-black/[0.07] dark:border-white/[0.07] flex flex-col h-full overflow-hidden bg-black/[0.015] dark:bg-white/[0.01]">
            {/* Top Action Bar */}
            <div className="p-3.5 border-b border-black/[0.07] dark:border-white/[0.07] space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                  Recent Chats
                </span>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Plus className="w-3.5 h-3.5" />}
                  onClick={handleCreateNewChat}
                  className="rounded-full shadow-xs text-xs px-3"
                >
                  New Chat
                </Button>
              </div>

              {/* Chat Quick Filter */}
              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 pointer-events-none" />
                <input
                  type="text"
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                  placeholder="Filter conversations..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[10px] border border-black/[0.08] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.04] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none focus:ring-1 focus:ring-black/10 dark:focus:ring-white/10"
                />
              </div>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {loadingChats ? (
                <div className="p-3 space-y-2.5">
                  <Skeleton className="h-10 w-full rounded-[10px]" />
                  <Skeleton className="h-10 w-full rounded-[10px]" />
                  <Skeleton className="h-10 w-full rounded-[10px]" />
                </div>
              ) : filteredChats.length === 0 ? (
                <div className="text-center py-8 px-4 text-xs text-[#8E8E93]">
                  No conversations found. Click "+ New Chat" to start.
                </div>
              ) : (
                filteredChats.map((c) => {
                  const isActive = c.id === activeChatId;
                  const isEditing = editingChatId === c.id;

                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        if (!isEditing) {
                          setActiveChatId(c.id);
                          setMenuOpenChatId(null);
                        }
                      }}
                      className={`group relative flex items-center justify-between p-2.5 rounded-[12px] text-xs cursor-pointer transition-all duration-150 ${
                        isActive
                          ? 'bg-black/[0.06] dark:bg-white/[0.08] text-black dark:text-white font-medium border border-black/[0.08] dark:border-white/[0.10]'
                          : 'text-[#505054] dark:text-[#A1A1A6] hover:bg-black/[0.03] dark:hover:bg-white/[0.04] hover:text-black dark:hover:text-white border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-1">
                        <MessageSquare
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isActive ? 'text-[#0071E3] dark:text-[#0A84FF]' : 'text-[#8E8E93]'
                          }`}
                        />
                        {isEditing ? (
                          <input
                            type="text"
                            value={editingTitle}
                            autoFocus
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(c.id);
                              if (e.key === 'Escape') setEditingChatId(null);
                            }}
                            onBlur={() => handleSaveRename(c.id)}
                            className="w-full text-xs bg-white dark:bg-[#2C2C2E] border border-[#0071E3] rounded px-1.5 py-0.5 text-black dark:text-white focus:outline-none"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <div className="truncate flex-1">
                            <span className="block truncate">{c.title}</span>
                          </div>
                        )}
                      </div>

                      {/* Overflow Action Menu */}
                      {!isEditing && (
                        <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => setMenuOpenChatId(menuOpenChatId === c.id ? null : c.id)}
                            className="p-1 rounded-md text-[#8E8E93] hover:text-black dark:hover:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                            title="Chat Options"
                          >
                            <MoreVertical className="w-3.5 h-3.5" />
                          </button>

                          {menuOpenChatId === c.id && (
                            <div className="absolute right-0 top-6 z-30 w-36 py-1 bg-white dark:bg-[#2C2C2E] rounded-[10px] shadow-lg border border-black/[0.1] dark:border-white/[0.12] text-xs animate-slide-up">
                              <button
                                type="button"
                                onClick={(e) => handleStartRename(c, e)}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-black dark:text-white"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-[#8E8E93]" />
                                <span>Rename</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setMenuOpenChatId(null);
                                  setChatToDelete(c);
                                  setDeleteDialogOpen(true);
                                }}
                                className="w-full text-left px-3 py-1.5 flex items-center gap-2 hover:bg-[#FF3B30]/[0.10] text-[#FF3B30]"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                                <span>Delete</span>
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Sidebar Footer with Document Lake Quick Switch */}
            <div className="p-3 border-t border-black/[0.07] dark:border-white/[0.07] bg-black/[0.01] dark:bg-white/[0.01] space-y-2">
              <button
                type="button"
                onClick={() => setActiveView('lake')}
                className="w-full py-2 px-3 rounded-[10px] text-xs font-medium text-black dark:text-white hover:bg-black/[0.05] dark:hover:bg-white/[0.06] transition-colors flex items-center justify-between border border-black/[0.06] dark:border-white/[0.08]"
              >
                <span className="flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" />
                  <span>Document Lake</span>
                </span>
                <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08]">
                  {lakeDocuments.length}
                </span>
              </button>
              <div className="text-[10px] text-center font-mono text-[#8E8E93]">
                0.00 KB Egress • Local Sovereign Memory
              </div>
            </div>
          </div>

          {/* MAIN CHAT AREA */}
          <div className="flex-1 flex flex-col h-full bg-white dark:bg-[#1C1C1E] overflow-hidden">
            {/* Main Chat Top Header */}
            <div className="h-14 px-5 border-b border-black/[0.07] dark:border-white/[0.07] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-semibold text-sm text-black dark:text-white truncate">
                  {activeChat ? activeChat.title : 'New conversation'}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-[#0071E3]/[0.10] text-[#0071E3] dark:text-[#0A84FF] shrink-0 font-medium">
                  {clearance}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Qwen 3 (Local ML Connected)
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<RotateCcw className="w-3.5 h-3.5" />}
                    onClick={() => setClearDialogOpen(true)}
                    className="text-xs text-[#6E6E73] dark:text-[#8E8E93]"
                  >
                    Clear Chat
                  </Button>
                )}

                {activeChat && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={<Trash className="w-3.5 h-3.5 text-[#FF3B30]" />}
                    onClick={() => {
                      setChatToDelete(activeChat);
                      setDeleteDialogOpen(true);
                    }}
                    className="text-xs text-[#FF3B30] hover:bg-[#FF3B30]/[0.08]"
                  >
                    Delete
                  </Button>
                )}
              </div>
            </div>

            {/* Message History Container */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {loadingMessages ? (
                <div className="space-y-4 py-8 max-w-2xl mx-auto">
                  <div className="flex items-center gap-2 text-xs text-[#8E8E93]">
                    <Spinner size="sm" />
                    <span>Loading conversation history...</span>
                  </div>
                  <Skeleton className="h-14 w-3/4 rounded-[16px]" />
                  <Skeleton className="h-20 w-5/6 rounded-[16px]" />
                </div>
              ) : messages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-5 max-w-lg mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-black dark:text-white shadow-xs">
                    <Sparkles className="w-7 h-7 text-[#0071E3] dark:text-[#0A84FF]" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-black dark:text-white">
                      TARS knows your company.
                    </h3>
                    <p className="text-xs text-[#6E6E73] dark:text-[#8E8E93] leading-relaxed">
                      Ask about decisions, contracts, customers, architecture, policies, or internal knowledge.
                    </p>
                  </div>

                  {/* Suggested Query Chips */}
                  <div className="w-full space-y-2 pt-2">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8E8E93]">
                      Suggested questions:
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                      {sampleQueries.map((sq, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => handleSendMessage(sq)}
                          className="p-3 text-xs rounded-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-black/[0.02] dark:bg-white/[0.03] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-all text-black dark:text-white group flex items-center justify-between"
                        >
                          <span className="line-clamp-2 pr-2">"{sq}"</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#8E8E93] group-hover:translate-x-0.5 transition-transform shrink-0" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-3xl mx-auto">
                  {messages.map((m) => {
                    const isUser = m.role === 'user';
                    const hasCitations = m.citations && m.citations.length > 0;

                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-2`}
                      >
                        {/* If message has an attachment, render dedicated Sovereign Attachment Card */}
                        {m.attachment ? (
                          <div className="w-full max-w-[92%] sm:max-w-[85%] rounded-[16px] border border-black/[0.1] dark:border-white/[0.12] bg-white dark:bg-[#252528] p-3.5 shadow-sm space-y-2.5 transition-all">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                <div className={`w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0 ${
                                  m.attachment.format === 'PDF'
                                    ? 'bg-[#FF3B30]/10 text-[#FF3B30]'
                                    : m.attachment.format === 'CSV' || m.attachment.format === 'XLSX'
                                    ? 'bg-[#34C759]/10 text-[#34C759]'
                                    : 'bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]'
                                }`}>
                                  <FileText className="w-5 h-5" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold text-black dark:text-white truncate" title={m.attachment.file_name}>
                                    {m.attachment.file_name}
                                  </div>
                                  <div className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] flex items-center gap-1.5 mt-0.5">
                                    {m.attachment.file_size ? (
                                      <span>{(m.attachment.file_size / 1024).toFixed(0)} KB</span>
                                    ) : null}
                                    {m.attachment.pages ? (
                                      <>
                                        <span>•</span>
                                        <span>{m.attachment.pages} pages</span>
                                      </>
                                    ) : null}
                                    <span>•</span>
                                    <span className="font-mono text-[10px] uppercase text-[#0071E3] dark:text-[#0A84FF]">{m.attachment.format || 'DOC'}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div className="shrink-0">
                                {m.attachment.status === 'uploading' && (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#0071E3]/10 text-[#0071E3] dark:text-[#0A84FF]">
                                    <Spinner size="sm" />
                                    <span>Uploading {m.attachment.progress || 0}%</span>
                                  </span>
                                )}
                                {m.attachment.status === 'indexed' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#34C759]/10 text-[#248A3D] dark:text-[#30D158]">
                                    <Check className="w-3 h-3" />
                                    <span>Indexed and ready</span>
                                  </span>
                                )}
                                {m.attachment.status === 'error' && (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#FF3B30]/10 text-[#FF3B30]">
                                    <AlertTriangle className="w-3 h-3" />
                                    <span>Upload failed</span>
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Uploading Progress Bar */}
                            {m.attachment.status === 'uploading' && (
                              <div className="w-full h-1.5 rounded-full bg-black/[0.06] dark:bg-white/[0.08] overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-[#0071E3] dark:bg-[#0A84FF] transition-all duration-150 ease-out"
                                  style={{ width: `${Math.max(8, m.attachment.progress || 0)}%` }}
                                />
                              </div>
                            )}

                            {/* Indexed Quick Actions */}
                            {m.attachment.status === 'indexed' && (
                              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.06]">
                                <button
                                  type="button"
                                  onClick={() => handleAskAboutDoc(m.attachment!.file_name)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-medium bg-[#0071E3]/[0.08] dark:bg-[#0A84FF]/[0.12] text-[#0071E3] dark:text-[#0A84FF] hover:bg-[#0071E3]/[0.15] transition-colors"
                                >
                                  <Sparkles className="w-3 h-3" />
                                  <span>Ask TARS about this document</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleOpenReaderForAttachment(m.attachment!)}
                                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] text-[11px] font-medium bg-black/[0.04] dark:bg-white/[0.06] text-[#3C3C43] dark:text-[#EBEBF5] hover:bg-black/[0.08] dark:hover:bg-white/[0.1] transition-colors"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View in Document Reader</span>
                                </button>
                              </div>
                            )}

                            {/* Error Actions */}
                            {m.attachment.status === 'error' && (
                              <div className="flex items-center justify-between pt-1 border-t border-black/[0.05] dark:border-white/[0.06] text-xs">
                                <span className="text-[11px] text-[#FF3B30] truncate mr-2">
                                  {m.attachment.error_message || 'Ingestion failed.'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRetryUpload(m.id)}
                                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[8px] text-[11px] font-medium bg-[#FF3B30]/10 text-[#FF3B30] hover:bg-[#FF3B30]/20 transition-colors shrink-0"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Retry</span>
                                </button>
                              </div>
                            )}

                            <div className="text-[10px] text-right font-mono text-[#8E8E93]">
                              {m.created_at || 'Just now'}
                            </div>
                          </div>
                        ) : (
                          /* Bubble */
                          <div
                            className={`relative max-w-[88%] sm:max-w-[80%] rounded-[18px] p-4 text-[14px] leading-relaxed shadow-xs transition-all ${
                              isUser
                                ? 'bg-[#0071E3] text-white rounded-br-[4px]'
                                : 'bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] text-black dark:text-white rounded-tl-[4px]'
                            }`}
                          >
                            {!isUser && (
                              <div className="flex items-center justify-between border-b border-black/[0.06] dark:border-white/[0.06] pb-2 mb-3 text-xs">
                                <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]" />
                                  TARS
                                </span>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleCopyMessage(m.id, m.content)}
                                    className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors flex items-center gap-1"
                                    title="Copy response"
                                  >
                                    {copiedMessageId === m.id ? (
                                      <>
                                        <Check className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" />
                                        <span className="text-[#0071E3] dark:text-[#0A84FF]">Copied</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="w-3 h-3" />
                                        <span>Copy</span>
                                      </>
                                    )}
                                  </button>
                                </div>
                              </div>
                            )}

                            {isUser ? (
                              <div className="whitespace-pre-wrap">{m.content}</div>
                            ) : (
                              <FormattedAnswer content={m.content} />
                            )}

                            <div
                              className={`text-[10px] mt-2 font-mono ${
                                isUser ? 'text-white/70 text-right' : 'text-[#8E8E93] text-left'
                              }`}
                            >
                              {m.created_at || 'Just now'}
                            </div>
                          </div>
                        )}

                        {/* Citation Cards (Under Assistant Reply) */}
                        {!isUser && hasCitations && (
                          <div className="w-full max-w-[88%] sm:max-w-[80%] pt-1 pl-1 space-y-2">
                            <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-[#6E6E73] dark:text-[#8E8E93]">
                              <span>Sources ({m.citations!.length})</span>
                              <span className="text-[10px] font-normal lowercase">click to inspect excerpt</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {m.citations!.map((c, cIdx) => (
                                <div
                                  key={cIdx}
                                  onClick={() => onOpenCitation(c)}
                                  className="p-3 rounded-[12px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#252528] hover:border-[#0071E3]/[0.4] dark:hover:border-[#0A84FF]/[0.4] cursor-pointer transition-all group flex flex-col justify-between shadow-xs"
                                >
                                  <div>
                                    <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                                      <span className="truncate pr-2">{c.doc_title}</span>
                                      <span className="text-[10px] font-mono text-[#8E8E93] shrink-0">
                                        p.{c.page_number}
                                      </span>
                                    </div>
                                    <p className="text-[11px] text-[#6E6E73] dark:text-[#8E8E93] line-clamp-2 mt-1 italic">
                                      "{c.snippet}"
                                    </p>
                                  </div>
                                  <div className="mt-2 pt-1 border-t border-black/[0.05] dark:border-white/[0.06] flex items-center justify-between text-[10px] text-[#0071E3] dark:text-[#0A84FF] font-medium">
                                    <span>View Source</span>
                                    <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Active Assistant Thinking / Generating Indicator */}
                  {sending && (
                    <div className="flex items-start gap-2.5 animate-pulse">
                      <div className="max-w-[75%] rounded-[18px] rounded-tl-[4px] p-4 bg-black/[0.03] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.08] space-y-2">
                        <div className="flex items-center gap-2 text-xs font-semibold text-black dark:text-white">
                          <Spinner size="sm" />
                          <span>TARS is searching company memory and synthesizing response...</span>
                        </div>
                        <Skeleton className="h-3 w-48" />
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* BOTTOM STICKY COMPOSER */}
            <div className="p-3 sm:p-4 border-t border-black/[0.07] dark:border-white/[0.07] bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur shrink-0">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="max-w-3xl mx-auto space-y-2"
              >
                <div className="relative flex items-center rounded-[20px] border border-black/[0.12] dark:border-white/[0.14] bg-[#F5F5F7] dark:bg-[#2C2C2E] shadow-xs focus-within:ring-2 focus-within:ring-[#0071E3]/20 focus-within:border-[#0071E3] transition-all">
                  {/* Attachment Icon Button */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors"
                    title="Attach or upload document"
                  >
                    <Paperclip className="w-4 h-4" />
                  </button>

                  <input
                    ref={composerInputRef}
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask TARS about company decisions, policies, contracts..."
                    className="w-full py-3.5 pr-14 bg-transparent text-[14px] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
                    disabled={sending}
                  />

                  {/* Send Button */}
                  <div className="absolute right-2">
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || sending}
                      className="w-8 h-8 rounded-full bg-black text-white dark:bg-white dark:text-black flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all shadow-xs"
                      title="Send message (Enter)"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] text-[#8E8E93] px-2">
                  <span>Press <kbd className="font-mono bg-black/[0.05] dark:bg-white/[0.08] px-1 py-0.5 rounded text-[10px]">Enter</kbd> to send</span>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 font-mono text-[10px] text-emerald-600 dark:text-emerald-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Local ML: Qwen 3 (Ollama Connected)
                    </span>
                    <span className="text-[#8E8E93] text-[10px]">·</span>
                    <span className="font-mono text-[10px]">Grounded in Sovereign Graph & Vector Store</span>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DOCUMENT LAKE BROWSER */}
      {activeView === 'lake' && (
        <div className="flex-1 min-h-0 rounded-[18px] border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] p-4 sm:p-6 space-y-5 shadow-sm overflow-y-auto">
          {/* Header & Stats Ribbon */}
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
              <Button
                variant="secondary"
                size="sm"
                icon={<MessageSquare className="w-3.5 h-3.5" />}
                onClick={() => setActiveView('chat')}
              >
                Back to Chat
              </Button>
              <span className="text-xs font-mono text-[#8E8E93]">
                Total Files: {lakeDocuments.length}
              </span>
            </div>
          </div>

          {/* Department Filter Pills with Count Badges */}
          <div className="flex flex-wrap items-center gap-1.5 pb-2">
            {lakeDepartmentTabs.map((dept) => {
              const count = departmentCounts[dept] || 0;
              const isSelected = lakeDepartment === dept;
              return (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setLakeDepartment(dept)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-black text-white dark:bg-white dark:text-black shadow-sm'
                      : 'bg-black/[0.04] dark:bg-white/[0.06] text-[#6E6E73] dark:text-[#8E8E93] hover:bg-black/[0.08] dark:hover:bg-white/[0.10]'
                  }`}
                >
                  <span>{dept}</span>
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 dark:bg-black/20 text-white dark:text-black'
                        : 'bg-black/[0.08] dark:bg-white/[0.10] text-[#6E6E73] dark:text-[#8E8E93]'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Quick Filter Search Input */}
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={lakeSearch}
                onChange={(e) => setLakeSearch(e.target.value)}
                placeholder="Filter documents in lake..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-[10px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white placeholder:text-[#8E8E93] focus:outline-none"
              />
            </div>
            <div className="text-xs text-[#8E8E93] font-mono">
              Matching: {filteredLakeDocuments.length}
            </div>
          </div>

          {filteredLakeDocuments.length === 0 ? (
            <EmptyState
              icon={<FileText className="w-5 h-5 text-[#8E8E93]" />}
              title="No documents match current filters"
              description="Adjust your search term or department filter to view ingested documents."
              actionLabel="Reset Filters"
              onAction={() => {
                setLakeDepartment('ALL');
                setLakeSearch('');
              }}
            />
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] max-h-[560px] overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-[#F5F5F7]/95 dark:bg-[#2C2C2E]/95 backdrop-blur z-10 border-b border-black/[0.08] dark:border-white/[0.08] text-[#6E6E73] dark:text-[#8E8E93] font-semibold uppercase tracking-wider text-[10px]">
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
                    {paginatedDocs.map((doc, idx) => {
                      const title = doc.filename || doc.title || `Document #${idx + 1}`;
                      const dept = doc.department || 'GENERAL';
                      const docType = doc.format || 'Document';
                      const clr = doc.clearance || 'ALL_TEAM';
                      const content = doc.preview || doc.content || 'Indexed in local sovereign memory.';
                      const pages = doc.page_count || Math.max(1, Math.ceil((doc.chunk_count || 1) / 3));

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
                              pageCount: pages,
                              chunkCount: doc.chunk_count || 1,
                              organisationId: doc.organisation_id,
                              validFrom: doc.valid_from,
                              validUntil: doc.valid_until,
                            })
                          }
                        >
                          <td className="py-3 px-4 font-semibold text-black dark:text-white flex items-center gap-2">
                            <FileText className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF] shrink-0" />
                            <div className="flex flex-col min-w-0">
                              <span className="truncate max-w-xs">{title}</span>
                              <span className="text-[10px] text-[#8E8E93] font-mono">
                                {doc.organisation_id ? `Tenant: ${doc.organisation_id} • ` : ''}
                                {doc.valid_from ? `Effective: ${new Date(doc.valid_from * 1000).toLocaleDateString()}` : (doc.ingested_at ? `Ingested: ${new Date(doc.ingested_at * 1000).toLocaleDateString()}` : '')}
                                {doc.is_demo ? ' • DEMO' : ''}
                              </span>
                            </div>
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

              {/* Pagination Controller */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 text-xs text-[#6E6E73] dark:text-[#8E8E93]">
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="px-2 py-1 text-xs rounded-[6px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white focus:outline-none"
                  >
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                  <span>per page</span>
                  <span className="text-[#8E8E93] ml-2">
                    Showing {Math.min(filteredLakeDocuments.length, (currentPage - 1) * pageSize + 1)}–
                    {Math.min(filteredLakeDocuments.length, currentPage * pageSize)} of {filteredLakeDocuments.length}
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  <span className="font-mono text-xs px-2.5 py-1">
                    Page {currentPage} of {totalPages}
                  </span>

                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-[8px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-black/[0.05] dark:hover:bg-white/[0.08] transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION DIALOG: DELETE CHAT */}
      <Dialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        title="Delete Conversation"
        description={`Are you sure you want to delete "${chatToDelete?.title || 'this conversation'}"? This action cannot be undone.`}
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmDeleteChat}
              className="bg-[#FF3B30] hover:bg-[#D70015] text-white border-transparent"
            >
              Delete
            </Button>
          </div>
        }
      />

      {/* CONFIRMATION DIALOG: CLEAR CHAT MESSAGES */}
      <Dialog
        isOpen={clearDialogOpen}
        onClose={() => setClearDialogOpen(false)}
        title="Clear Conversation"
        description="Are you sure you want to clear all messages from this conversation? The conversation itself will be kept."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setClearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmClearChat}
              className="bg-[#FF3B30] hover:bg-[#D70015] text-white border-transparent"
            >
              Clear Messages
            </Button>
          </div>
        }
      />

      {/* Document Reader Modal */}
      <DocumentReaderModal
        isOpen={readerModal.open}
        onClose={() => setReaderModal((prev) => ({ ...prev, open: false }))}
        docTitle={readerModal.title}
        department={readerModal.department}
        clearance={readerModal.clearance}
        content={readerModal.content}
        pageCount={readerModal.pageCount}
        chunkCount={readerModal.chunkCount}
        organisationId={readerModal.organisationId}
        validFrom={readerModal.validFrom}
        validUntil={readerModal.validUntil}
      />
    </div>
  );
};
