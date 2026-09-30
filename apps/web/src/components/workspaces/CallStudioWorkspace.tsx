import React, { useState, useEffect, useRef } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { VoiceToSpecResponse } from '../../types/contracts';
import { ingestionApi } from '../../services/ingestionApi';
import { EmptyState } from '../primitives/EmptyState';
import {
  Phone,
  Play,
  Pause,
  CheckCircle2,
  FileText,
  Search,
  Plus,
  UploadCloud,
  Trash2,
  AlertTriangle,
  X,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronRight,
  Download,
  Maximize2,
  MoreVertical,
  Sparkles,
  Users,
  Clock,
  Layers,
} from 'lucide-react';

interface CallStudioWorkspaceProps {
  activeCallId: string | null;
  onSelectCall: (id: string) => void;
  onPromoteAction: (commitmentText: string, callId: string, timestamp: string) => void;
}

// Helpers for presentation
const parseClientInfo = (clientName: string) => {
  if (!clientName) return { title: 'Untitled Call', subtitle: 'Call Recording' };
  if (clientName.includes('(') && clientName.includes(')')) {
    const parts = clientName.split('(');
    const title = parts[0].trim();
    const subtitle = parts[1].replace(')', '').trim();
    return { title, subtitle };
  }
  return { title: clientName, subtitle: 'Executive Session' };
};

const formatDateDisplay = (recordedAt?: string) => {
  if (!recordedAt) return 'Recent';
  const datePart = recordedAt.split(' ')[0];
  if (datePart && datePart.includes('-')) {
    const [y, m, d] = datePart.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[parseInt(m, 10) - 1] || m;
    return `${monthName} ${parseInt(d, 10)}, ${y}`;
  }
  return recordedAt;
};

const getSentimentBadge = (sentiment: string) => {
  switch (sentiment?.toUpperCase()) {
    case 'URGENT':
      return {
        label: 'URGENT',
        className: 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20',
      };
    case 'POSITIVE':
      return {
        label: 'POSITIVE',
        className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20',
      };
    case 'NEGATIVE':
      return {
        label: 'NEGATIVE',
        className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20',
      };
    default:
      return {
        label: sentiment || 'NEUTRAL',
        className: 'bg-black/5 dark:bg-white/10 text-neutral-600 dark:text-neutral-400 border border-black/10 dark:border-white/10',
      };
  }
};

const extractTakeaways = (summary: string): string[] => {
  if (!summary) return [];
  const sentences = summary
    .split(/\.\s+/)
    .map((s) => s.trim().replace(/\.$/, ''))
    .filter((s) => s.length > 10);
  if (sentences.length > 0) {
    return sentences.slice(0, 3);
  }
  return [summary];
};

export const CallStudioWorkspace: React.FC<CallStudioWorkspaceProps> = ({
  activeCallId,
  onSelectCall,
  onPromoteAction,
}) => {
  const [calls, setCalls] = useState<VoiceToSpecResponse[]>([]);
  const [selectedCall, setSelectedCall] = useState<VoiceToSpecResponse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [callsSearch, setCallsSearch] = useState('');
  const [callFilterTab, setCallFilterTab] = useState<'all' | 'recent' | 'clients'>('all');
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('ALL');
  const [activeSubTab, setActiveSubTab] = useState<'transcript' | 'speakers' | 'timeline' | 'moments'>('transcript');
  const [mobileColumn, setMobileColumn] = useState<'list' | 'active' | 'insights'>('active');
  const [insightsCollapsed, setInsightsCollapsed] = useState(false);
  const [promotedSet, setPromotedSet] = useState<Set<string>>(new Set());
  const [uploadingAudio, setUploadingAudio] = useState(false);

  // Deletion lifecycle & task pruning modal state
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedDeleteTaskIds, setSelectedDeleteTaskIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteToast, setDeleteToast] = useState<string | null>(null);

  const audioInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Guarded call loading with AbortController
  useEffect(() => {
    const controller = new AbortController();
    ingestionApi.getCalls(controller.signal).then((data) => {
      setCalls(data);
      if (data.length > 0) {
        const found = data.find((c) => c.call_id === activeCallId) || data[0];
        setSelectedCall(found);
      } else {
        setSelectedCall(null);
        setIsPlaying(false);
        setPlaybackSeconds(0);
      }
    });
    return () => controller.abort();
  }, [activeCallId]);

  // Sync default task deletion selection when selectedCall changes
  useEffect(() => {
    if (selectedCall) {
      const defaultTaskIds = selectedCall.commitments.map(
        (_, idx) => `ACT-${selectedCall.call_id}-${idx + 1}`
      );
      setSelectedDeleteTaskIds(defaultTaskIds);
    } else {
      setSelectedDeleteTaskIds([]);
    }
  }, [selectedCall]);

  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploadingAudio(true);
    try {
      const res = await ingestionApi.uploadCallAudio(e.target.files[0]);
      setCalls((prev) => [res, ...prev]);
      setSelectedCall(res);
      onSelectCall(res.call_id);
    } catch (err) {
      console.error('Audio upload error:', err);
    } finally {
      setUploadingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = '';
    }
  };

  const handleSelectCallItem = (call: VoiceToSpecResponse) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setSelectedCall(call);
    onSelectCall(call.call_id);
    setIsPlaying(false);
    setPlaybackSeconds(0);
    setMobileColumn('active');
  };

  const togglePlayback = () => {
    if (!selectedCall) return;
    if (isPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setIsPlaying(false);
    } else {
      if (audioRef.current) {
        audioRef.current.playbackRate = playbackSpeed;
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => setIsPlaying(true))
            .catch((err) => {
              console.warn('Audio playback fallback (simulating playback):', err);
              setIsPlaying(true);
            });
        } else {
          setIsPlaying(true);
        }
      }
    }
  };

  const handleSpeedChange = (spd: number) => {
    setPlaybackSpeed(spd);
    if (audioRef.current) {
      audioRef.current.playbackRate = spd;
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!selectedCall) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, clickX / rect.width));
    const targetSeconds = Math.floor(pct * (selectedCall.audio_duration_seconds || 1));
    setPlaybackSeconds(targetSeconds);
    if (audioRef.current) {
      audioRef.current.currentTime = targetSeconds;
    }
  };

  // Synthetic playback interval when real media element is mocked / silent
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && selectedCall) {
      interval = setInterval(() => {
        setPlaybackSeconds((prev) => {
          if (prev >= selectedCall.audio_duration_seconds) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, selectedCall, playbackSpeed]);

  const formatSeconds = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePromote = (commitment: string, index: number) => {
    if (!selectedCall) return;
    onPromoteAction(commitment, selectedCall.call_id, '02:30');
    setPromotedSet((prev) => new Set(prev).add(`${selectedCall.call_id}-${index}`));
  };

  // Interactive task pruning & call deletion
  const handleDeleteConfirm = async () => {
    if (!selectedCall) return;
    setIsDeleting(true);
    try {
      const res = await ingestionApi.deleteCall(selectedCall.call_id, selectedDeleteTaskIds);
      setDeleteToast(
        `Call recording purged. Detached ${res.graph_nodes_detached} graph node(s), removed ${res.deleted_task_ids.length} Action Hub task(s), retained ${res.retained_task_ids.length} task(s).`
      );
      setTimeout(() => setDeleteToast(null), 6000);
      setDeleteModalOpen(false);

      const freshCalls = await ingestionApi.getCalls();
      setCalls(freshCalls);
      const nextCall = freshCalls[0] || null;
      setSelectedCall(nextCall);
      setIsPlaying(false);
      setPlaybackSeconds(0);
      if (nextCall) onSelectCall(nextCall.call_id);
    } catch (err) {
      console.error('Failed to delete call recording:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportTranscript = () => {
    if (!selectedCall) return;
    const content = (selectedCall.transcript || [])
      .map((t) => `[${t.timestamp}] ${t.speaker}:\n${t.text}\n`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedCall.client_name.replace(/[^a-zA-Z0-9]/g, '_')}_transcript.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const speakers = Array.from(
    new Set(selectedCall?.transcript?.map((t) => t.speaker.split(' ')[0]) || [])
  );

  const filteredTranscript = selectedCall?.transcript?.filter((t) => {
    const matchesSearch =
      t.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.speaker.toLowerCase().includes(transcriptSearch.toLowerCase());
    const matchesSpeaker = selectedSpeaker === 'ALL' || t.speaker.startsWith(selectedSpeaker);
    return matchesSearch && matchesSpeaker;
  });

  // Filtered calls list
  const filteredCalls = calls.filter((call) => {
    const query = callsSearch.toLowerCase();
    const matchesQuery =
      !query ||
      call.client_name.toLowerCase().includes(query) ||
      call.summary.toLowerCase().includes(query) ||
      call.sentiment.toLowerCase().includes(query);

    if (!matchesQuery) return false;
    if (callFilterTab === 'recent') {
      return true; // already sorted by recent
    }
    return true;
  });

  // Dynamic waveform bars matching screenshot pattern
  const waveformBars = [
    20, 35, 60, 75, 45, 30, 65, 85, 80, 40, 55, 90, 70, 38, 58, 76, 48, 32, 68, 82,
    88, 58, 42, 72, 92, 62, 38, 52, 82, 88, 68, 48, 32, 58, 78, 72, 42, 62, 88, 78,
    52, 38, 68, 82, 58, 32, 48, 72, 88, 62,
  ];

  const takeaways = selectedCall ? extractTakeaways(selectedCall.summary) : [];

  return (
    <div className="flex flex-col h-full min-h-0 space-y-2">
      {/* File Upload Hidden Input */}
      <input
        ref={audioInputRef}
        type="file"
        className="hidden"
        accept=".wav,.mp3,.m4a,.ogg,.flac"
        onChange={handleAudioUpload}
      />

      {/* Persistent Audio Mount at root JSX level */}
      <audio
        ref={audioRef}
        src={selectedCall ? `/api/ingestion/calls/${selectedCall.call_id}/audio` : undefined}
        preload="metadata"
        onTimeUpdate={(e) => {
          setPlaybackSeconds(Math.floor(e.currentTarget.currentTime));
        }}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setPlaybackSeconds(0);
        }}
        className="hidden"
      />

      {/* Compact Page Header */}
      <PageHeader
        eyebrow="Workspace 2"
        title="Client Call Studio"
        description="Air-gapped on-device Whisper transcription extracting customer pain points, feature requests, and verbal commitments."
        className="pb-2.5 mb-1"
        actions={
          <Button
            variant="secondary"
            size="sm"
            icon={<UploadCloud className="w-4 h-4" />}
            loading={uploadingAudio}
            onClick={() => audioInputRef.current?.click()}
            className="rounded-full px-4 text-xs font-medium border-black/15 dark:border-white/15 bg-white dark:bg-[#18191D] text-black dark:text-white shadow-xs hover:bg-neutral-100 dark:hover:bg-[#222327]"
          >
            Upload Call Audio
          </Button>
        }
      />

      {/* Toast Notification for Deletion / Lifecycle events */}
      {deleteToast && (
        <div className="p-2.5 rounded-[8px] border border-black/10 dark:border-white/15 bg-white dark:bg-[#121316] text-black dark:text-white text-xs flex items-center justify-between gap-2 shadow-xs shrink-0 animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{deleteToast}</span>
          </div>
          <button
            onClick={() => setDeleteToast(null)}
            className="text-[11px] font-medium text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Mobile Column Switcher (visible only on small screens < md) */}
      <div className="md:hidden flex items-center gap-1 p-1 bg-neutral-100 dark:bg-[#18191D] rounded-[8px] border border-black/10 dark:border-white/10 shrink-0">
        <button
          onClick={() => setMobileColumn('list')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
            mobileColumn === 'list'
              ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
              : 'text-neutral-500'
          }`}
        >
          Calls ({calls.length})
        </button>
        <button
          onClick={() => setMobileColumn('active')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
            mobileColumn === 'active'
              ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
              : 'text-neutral-500'
          }`}
        >
          Active Call
        </button>
        <button
          onClick={() => setMobileColumn('insights')}
          className={`flex-1 py-1.5 text-xs font-medium rounded-[6px] transition-all ${
            mobileColumn === 'insights'
              ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
              : 'text-neutral-500'
          }`}
        >
          Insights
        </button>
      </div>

      {/* Single Tree Conditional: Render Empty State cleanly without unmounting audio element */}
      {!selectedCall ? (
        <div className="flex-1 min-h-0 flex items-center justify-center p-6">
          <EmptyState
            icon={<Phone className="w-6 h-6 text-[#8E8E93]" />}
            title="No client calls recorded yet"
            description="Upload an audio recording (.mp3, .wav, .m4a) to generate voice-to-spec intelligence and commitments with faster-whisper."
            actionLabel="Upload Audio Recording"
            onAction={() => audioInputRef.current?.click()}
          />
        </div>
      ) : (
        /* Three-Column Professional Workspace */
        <div className="grid grid-cols-12 gap-3 flex-1 min-h-0">
          {/* ============================================================== */}
          {/* COLUMN 1: CALLS SIDEBAR (Left ~25% / 3 cols)                    */}
          {/* ============================================================== */}
          <div
            className={`col-span-12 md:col-span-3 lg:col-span-3 h-full flex flex-col min-h-0 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] overflow-hidden ${
              mobileColumn !== 'list' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header: Title, Search, Filters */}
            <div className="p-3 pb-2.5 border-b border-black/8 dark:border-white/8 space-y-2.5 shrink-0">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-black dark:text-white tracking-tight">Calls</h3>
                <span className="text-[11px] font-mono text-neutral-400">{filteredCalls.length} total</span>
              </div>

              {/* Search & Tune bar */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={callsSearch}
                    onChange={(e) => setCallsSearch(e.target.value)}
                    placeholder="Search calls..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs rounded-[6px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-black dark:text-white placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20 transition-all"
                  />
                </div>
                <button
                  type="button"
                  title="Filter options"
                  className="p-1.5 rounded-[6px] border border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-[#18191D] text-neutral-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Filter chips: All (N), Recent, Clients */}
              <div className="flex items-center gap-1">
                {(['all', 'recent', 'clients'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setCallFilterTab(tab)}
                    className={`px-2.5 py-1 rounded-[6px] text-[11px] font-medium transition-all ${
                      callFilterTab === tab
                        ? 'bg-black text-white dark:bg-white dark:text-black font-semibold shadow-xs'
                        : 'text-neutral-500 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                    }`}
                  >
                    {tab === 'all' ? `All (${calls.length})` : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Scrollable Calls List */}
            <div className="flex-1 min-h-0 overflow-y-auto p-2 space-y-1">
              {filteredCalls.length === 0 ? (
                <div className="text-center py-8 text-xs text-neutral-400">
                  No calls matching "{callsSearch}"
                </div>
              ) : (
                filteredCalls.map((call) => {
                  const isSelected = selectedCall.call_id === call.call_id;
                  const { title, subtitle } = parseClientInfo(call.client_name);
                  const badge = getSentimentBadge(call.sentiment);
                  const formattedDate = formatDateDisplay(call.recorded_at);

                  return (
                    <div
                      key={call.call_id}
                      onClick={() => handleSelectCallItem(call)}
                      className={`group p-2.5 rounded-[8px] border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
                        isSelected
                          ? 'border-black/20 dark:border-white/20 bg-black/[0.04] dark:bg-white/[0.08] shadow-xs'
                          : 'border-transparent hover:border-black/10 dark:hover:border-white/10 hover:bg-black/[0.02] dark:hover:bg-white/[0.03]'
                      }`}
                    >
                      {/* Left File Audio Icon */}
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0 border ${
                            isSelected
                              ? 'bg-black/10 dark:bg-white/15 border-black/15 dark:border-white/20 text-black dark:text-white'
                              : 'bg-black/[0.03] dark:bg-white/[0.05] border-black/5 dark:border-white/5 text-neutral-400'
                          }`}
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </div>

                        {/* Title and Subtitle */}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-black dark:text-white truncate">
                            {title}
                          </div>
                          <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                            {subtitle}
                          </div>
                        </div>
                      </div>

                      {/* Right Meta: Date, Duration, Sentiment Badge */}
                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        <div className="text-[10px] font-mono text-neutral-400">
                          {formattedDate}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-neutral-500 dark:text-neutral-400">
                            {formatSeconds(call.audio_duration_seconds)}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded-[4px] font-mono font-medium ${badge.className}`}>
                            {badge.label}
                          </span>
                          <button
                            type="button"
                            className="opacity-0 group-hover:opacity-100 p-0.5 text-neutral-400 hover:text-black dark:hover:text-white transition-opacity"
                          >
                            <MoreVertical className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ============================================================== */}
          {/* COLUMN 2: ACTIVE CALL (Center ~50% / 6 cols)                   */}
          {/* ============================================================== */}
          <div
            className={`col-span-12 md:col-span-6 lg:col-span-6 h-full flex flex-col min-h-0 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] overflow-hidden ${
              mobileColumn !== 'active' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Active Call Header & Waveform */}
            <div className="p-3.5 pb-2.5 border-b border-black/8 dark:border-white/8 space-y-3 shrink-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                {/* Title & Metadata */}
                <div>
                  <h2 className="text-sm sm:text-base font-semibold text-black dark:text-white tracking-tight">
                    {selectedCall.client_name}
                  </h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400">
                      {selectedCall.recorded_at} · {formatSeconds(selectedCall.audio_duration_seconds)}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 font-mono font-semibold uppercase rounded-[4px] ${
                        getSentimentBadge(selectedCall.sentiment).className
                      }`}
                    >
                      {selectedCall.sentiment}
                    </span>
                    <button
                      type="button"
                      className="text-[11px] font-mono text-neutral-400 hover:text-black dark:hover:text-white flex items-center gap-0.5 transition-colors"
                    >
                      + Add Tag
                    </button>
                  </div>
                </div>

                {/* Speed Toggles, Play, Delete, Time Readout */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap sm:flex-nowrap">
                  {/* Speed pills */}
                  <div className="flex items-center rounded-[6px] border border-black/10 dark:border-white/10 bg-neutral-100 dark:bg-[#18191D] p-0.5">
                    {[1, 1.25, 1.5, 2].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => handleSpeedChange(spd)}
                        className={`px-1.5 py-0.5 rounded-[4px] text-[10px] font-medium transition-all ${
                          playbackSpeed === spd
                            ? 'bg-white dark:bg-[#2C2C2E] text-black dark:text-white shadow-xs font-semibold'
                            : 'text-neutral-500 hover:text-black dark:hover:text-white'
                        }`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>

                  {/* High contrast Play/Pause button */}
                  <button
                    onClick={togglePlayback}
                    className="flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-black text-white dark:bg-white dark:text-black hover:opacity-90 transition-opacity shadow-xs"
                  >
                    {isPlaying ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current ml-0.5" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  {/* Delete Recording button */}
                  <button
                    onClick={() => setDeleteModalOpen(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-xs font-medium border border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Delete Recording</span>
                  </button>

                  {/* Timestamp */}
                  <div className="text-[11px] font-mono text-neutral-500 dark:text-neutral-400 tabular-nums">
                    {formatSeconds(playbackSeconds)} / {formatSeconds(selectedCall.audio_duration_seconds)}
                  </div>
                </div>
              </div>

              {/* Dynamic Seekable Waveform Visualizer */}
              <div
                className="h-10 w-full flex items-center gap-[2px] py-1 px-2.5 rounded-[8px] bg-neutral-100 dark:bg-[#18191D] cursor-pointer overflow-hidden border border-black/5 dark:border-white/5 relative group"
                onClick={handleSeek}
              >
                {waveformBars.map((barHeight, idx) => {
                  const barProgress = idx / waveformBars.length;
                  const safeDuration = Math.max(1, selectedCall?.audio_duration_seconds || 1);
                  const isPast = barProgress <= playbackSeconds / safeDuration;
                  return (
                    <div
                      key={idx}
                      style={{ height: `${barHeight}%` }}
                      className={`flex-1 rounded-[1px] transition-all duration-75 ${
                        isPast
                          ? 'bg-black dark:bg-white'
                          : 'bg-black/15 dark:bg-white/20 group-hover:bg-black/25 dark:group-hover:bg-white/30'
                      }`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Sub-tabs bar: Transcript, Speakers, Timeline, Key Moments */}
            <div className="px-3.5 py-2 border-b border-black/8 dark:border-white/8 flex items-center justify-between gap-2 flex-wrap bg-neutral-50/50 dark:bg-[#16171B]/50 shrink-0">
              <div className="flex items-center gap-1">
                {[
                  { id: 'transcript', label: 'Transcript' },
                  { id: 'speakers', label: 'Speakers' },
                  { id: 'timeline', label: 'Timeline' },
                  { id: 'moments', label: 'Key Moments' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveSubTab(tab.id as any)}
                    className={`px-2.5 py-1 text-xs rounded-[6px] font-medium transition-all ${
                      activeSubTab === tab.id
                        ? 'bg-white dark:bg-[#222327] text-black dark:text-white shadow-xs font-semibold border border-black/10 dark:border-white/10'
                        : 'text-neutral-500 hover:text-black dark:hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Search, Speaker Filter, Export & Expand tools */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex items-center">
                  <Search className="w-3 h-3 text-neutral-400 absolute left-2 pointer-events-none" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search transcript..."
                    className="pl-6.5 pr-2 py-0.5 text-xs rounded-[6px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] text-black dark:text-white w-28 sm:w-36 focus:outline-none focus:ring-1 focus:ring-black/20 dark:focus:ring-white/20"
                  />
                </div>

                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="px-2 py-0.5 text-xs rounded-[6px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#18191D] text-black dark:text-white focus:outline-none"
                >
                  <option value="ALL">All Speakers</option>
                  {speakers.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  title="Export transcript"
                  onClick={handleExportTranscript}
                  className="p-1 rounded-[6px] text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  title="Full view"
                  className="p-1 rounded-[6px] text-neutral-400 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Sub-tab 1: Transcript Stream List */}
            {activeSubTab === 'transcript' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-2">
                {filteredTranscript?.length === 0 ? (
                  <div className="text-center py-10 text-xs text-neutral-400">
                    No dialogue matches "{transcriptSearch}"
                  </div>
                ) : (
                  filteredTranscript?.map((t, idx) => (
                    <div
                      key={idx}
                      className="group flex items-start gap-2.5 p-2 rounded-[8px] hover:bg-black/[0.02] dark:hover:bg-white/[0.03] transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
                    >
                      {/* Play button circle */}
                      <button
                        type="button"
                        onClick={() => {
                          setPlaybackSeconds(t.seconds);
                          setIsPlaying(true);
                          if (audioRef.current) {
                            audioRef.current.currentTime = t.seconds;
                            audioRef.current.play().catch(() => {});
                          }
                        }}
                        className="mt-0.5 w-6 h-6 rounded-full border border-black/15 dark:border-white/15 bg-white dark:bg-[#18191D] flex items-center justify-center text-neutral-500 hover:text-black dark:hover:text-white hover:border-black/30 dark:hover:border-white/30 shrink-0 shadow-xs transition-colors"
                      >
                        <Play className="w-2.5 h-2.5 ml-0.5 fill-current" />
                      </button>

                      {/* Speaker Avatar initial */}
                      <div className="mt-0.5 w-6 h-6 rounded-full bg-neutral-200 dark:bg-[#2C2C2E] text-black dark:text-white flex items-center justify-center text-[10px] font-bold shrink-0">
                        {t.speaker.charAt(0)}
                      </div>

                      {/* Speaker Name, Timestamp, Text */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-black dark:text-white">
                            {t.speaker}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {t.timestamp}
                          </span>
                        </div>
                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed mt-0.5 font-sans">
                          {t.text}
                        </p>
                      </div>

                      {/* 3-dots Menu */}
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-[4px] text-neutral-400 hover:text-black dark:hover:text-white transition-opacity"
                      >
                        <MoreVertical className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Sub-tab 2: Speakers View */}
            {activeSubTab === 'speakers' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  Diarized Participants ({speakers.length})
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {speakers.map((sp) => {
                    const lines = selectedCall.transcript?.filter((t) => t.speaker.startsWith(sp)) || [];
                    const lineCount = lines.length;
                    const totalLines = selectedCall.transcript?.length || 1;
                    const percentage = Math.round((lineCount / totalLines) * 100);

                    return (
                      <div
                        key={sp}
                        className="p-3 rounded-[8px] border border-black/8 dark:border-white/8 bg-neutral-50/50 dark:bg-[#18191D]/50 space-y-2"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-[#2C2C2E] text-black dark:text-white flex items-center justify-center text-xs font-bold shrink-0">
                            {sp.charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-semibold text-black dark:text-white truncate">
                              {lines[0]?.speaker || sp}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              {lineCount} utterance(s) · {percentage}% share
                            </div>
                          </div>
                        </div>
                        <div className="w-full bg-neutral-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-black dark:bg-white h-full rounded-full transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Sub-tab 3: Timeline View */}
            {activeSubTab === 'timeline' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  Chronological Discussion Timeline
                </div>
                <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-black/10 dark:before:bg-white/10">
                  {selectedCall.transcript?.map((t, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-black dark:bg-white border-2 border-white dark:border-[#121316]" />
                      <div className="text-[10px] font-mono text-neutral-400 flex items-center gap-2">
                        <span>{t.timestamp}</span>
                        <span className="font-semibold text-black dark:text-white">{t.speaker}</span>
                      </div>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-0.5 leading-snug">
                        {t.text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-tab 4: Key Moments View */}
            {activeSubTab === 'moments' && (
              <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
                <div className="text-xs font-semibold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">
                  Flagged Critical Moments ({selectedCall.commitments.length + selectedCall.pain_points.length})
                </div>
                <div className="space-y-2">
                  {selectedCall.commitments.map((comm, idx) => (
                    <div
                      key={`comm-${idx}`}
                      className="p-3 rounded-[8px] border border-black/8 dark:border-white/8 bg-neutral-50/50 dark:bg-[#18191D]/50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-1.5 py-0.2 rounded-[4px] font-mono font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            COMMITMENT
                          </span>
                        </div>
                        <p className="text-xs text-black dark:text-white font-medium">
                          {comm}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPlaybackSeconds(60);
                          setIsPlaying(true);
                          if (audioRef.current) {
                            audioRef.current.currentTime = 60;
                            audioRef.current.play().catch(() => {});
                          }
                        }}
                        className="p-1.5 rounded-[6px] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-black dark:hover:text-white transition-colors shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  ))}
                  {selectedCall.pain_points.map((pp, idx) => (
                    <div
                      key={`pp-${idx}`}
                      className="p-3 rounded-[8px] border border-black/8 dark:border-white/8 bg-neutral-50/50 dark:bg-[#18191D]/50 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] px-1.5 py-0.2 rounded-[4px] font-mono font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            PAIN POINT
                          </span>
                        </div>
                        <p className="text-xs text-neutral-800 dark:text-neutral-200">
                          {pp}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setPlaybackSeconds(20);
                          setIsPlaying(true);
                          if (audioRef.current) {
                            audioRef.current.currentTime = 20;
                            audioRef.current.play().catch(() => {});
                          }
                        }}
                        className="p-1.5 rounded-[6px] border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 text-neutral-500 hover:text-black dark:hover:text-white transition-colors shrink-0"
                      >
                        <Play className="w-3 h-3 fill-current" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* COLUMN 3: CALL INSIGHTS (Right ~25% / 3 cols)                   */}
          {/* ============================================================== */}
          <div
            className={`col-span-12 md:col-span-3 lg:col-span-3 h-full flex flex-col min-h-0 rounded-[10px] border border-black/10 dark:border-white/10 bg-white dark:bg-[#121316] overflow-hidden ${
              mobileColumn !== 'insights' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Header: Title & Collapse Toggle */}
            <div className="p-3 border-b border-black/8 dark:border-white/8 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-neutral-500 dark:text-neutral-400" />
                <h3 className="text-sm font-semibold text-black dark:text-white tracking-tight">Call Insights</h3>
              </div>
              <button
                type="button"
                onClick={() => setInsightsCollapsed(!insightsCollapsed)}
                className="p-1 rounded-[4px] text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              >
                {insightsCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
            </div>

            {/* Scrollable Structured Insights */}
            {!insightsCollapsed && (
              <div className="flex-1 min-h-0 overflow-y-auto p-3.5 space-y-4">
                {/* 1. Key Takeaways */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Key Takeaways</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                        {takeaways.length}
                      </span>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </div>
                  </div>
                  <ul className="space-y-1.5 pl-1">
                    {takeaways.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 leading-snug">
                        <span className="text-neutral-400 text-xs mt-0.5">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* 2. Pain Points */}
                <div className="pt-3 border-t border-black/8 dark:border-white/8 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-500/80" />
                      <span>Pain Points</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-red-500/10 text-red-600 dark:text-red-400">
                        {selectedCall.pain_points.length}
                      </span>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </div>
                  </div>
                  {selectedCall.pain_points.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic pl-1">No pain points detected.</p>
                  ) : (
                    <ul className="space-y-1.5 pl-1">
                      {selectedCall.pain_points.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 leading-snug">
                          <span className="text-red-500 text-xs mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 3. Feature Requests */}
                <div className="pt-3 border-t border-black/8 dark:border-white/8 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Feature Requests</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                        {selectedCall.feature_requests.length}
                      </span>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </div>
                  </div>
                  {selectedCall.feature_requests.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic pl-1">No feature requests identified.</p>
                  ) : (
                    <ul className="space-y-1.5 pl-1">
                      {selectedCall.feature_requests.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 leading-snug">
                          <span className="text-neutral-400 text-xs mt-0.5">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 4. Verbal Commitments with 1-Click Promote */}
                <div className="pt-3 border-t border-black/8 dark:border-white/8 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-black dark:text-white">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
                      <span>Verbal Commitments</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-100 dark:bg-white/10 text-neutral-600 dark:text-neutral-300">
                        {selectedCall.commitments.length}
                      </span>
                      <ChevronRight className="w-3 h-3 text-neutral-400" />
                    </div>
                  </div>

                  {selectedCall.commitments.length === 0 ? (
                    <p className="text-xs text-neutral-400 italic pl-1">No commitments recorded.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedCall.commitments.map((comm, idx) => {
                        const isPromoted = promotedSet.has(`${selectedCall.call_id}-${idx}`);
                        return (
                          <div
                            key={idx}
                            className="p-2.5 rounded-[6px] border border-black/8 dark:border-white/8 bg-neutral-50 dark:bg-[#18191D] space-y-1.5"
                          >
                            <div className="flex items-start gap-2 text-xs text-neutral-700 dark:text-neutral-300 leading-snug">
                              <span className="text-neutral-400 text-xs mt-0.5">•</span>
                              <span className="font-medium text-black dark:text-white">{comm}</span>
                            </div>
                            <div className="flex items-center justify-end pt-1">
                              <button
                                type="button"
                                disabled={isPromoted}
                                onClick={() => handlePromote(comm, idx)}
                                className={`text-[10px] px-2 py-0.5 rounded-[4px] font-medium transition-all flex items-center gap-1 ${
                                  isPromoted
                                    ? 'text-neutral-400 dark:text-neutral-500 cursor-default'
                                    : 'text-black dark:text-white bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20'
                                }`}
                              >
                                {isPromoted ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                    <span>Promoted</span>
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" />
                                    <span>Promote to Action Hub</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Interactive Task Pruning Modal (Bug 19) */}
      {deleteModalOpen && selectedCall && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-lg rounded-[12px] bg-white dark:bg-[#121316] border border-black/10 dark:border-white/15 shadow-2xl p-5 space-y-4 animate-scale-up">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-red-500/10 flex items-center justify-center text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-black dark:text-white">
                    Delete Call Recording
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 font-mono">
                    {selectedCall.client_name} · {formatSeconds(selectedCall.audio_duration_seconds)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeleteModalOpen(false)}
                className="text-neutral-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Explanation Banner */}
            <div className="p-3 rounded-[8px] bg-red-500/5 border border-red-500/20 text-xs text-red-600 dark:text-red-400 leading-relaxed">
              <strong>Permanent Deletion:</strong> This action permanently removes the raw audio recording and detaches its graph relations in Kùzu.
              Please select which extracted Action Hub tasks should be deleted alongside the recording. Deselected tasks will remain safely preserved in Action Hub.
            </div>

            {/* Task Selection Checkboxes */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 pb-1 border-b border-black/8 dark:border-white/8">
                <span>Extracted Action Hub Tasks ({selectedCall.commitments.length})</span>
                <button
                  type="button"
                  onClick={() => {
                    const allIds = selectedCall.commitments.map((_, i) => `ACT-${selectedCall.call_id}-${i + 1}`);
                    if (selectedDeleteTaskIds.length === allIds.length) {
                      setSelectedDeleteTaskIds([]);
                    } else {
                      setSelectedDeleteTaskIds(allIds);
                    }
                  }}
                  className="text-neutral-700 dark:text-neutral-300 font-medium hover:underline text-[11px]"
                >
                  {selectedDeleteTaskIds.length === selectedCall.commitments.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {selectedCall.commitments.length === 0 ? (
                <p className="text-xs text-neutral-400 italic py-2">
                  No Action Hub tasks were extracted from this call.
                </p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedCall.commitments.map((comm, idx) => {
                    const taskId = `ACT-${selectedCall.call_id}-${idx + 1}`;
                    const isChecked = selectedDeleteTaskIds.includes(taskId);
                    return (
                      <label
                        key={taskId}
                        className="flex items-start gap-2.5 p-2 rounded-[6px] bg-black/[0.02] dark:bg-white/[0.04] cursor-pointer hover:bg-black/[0.05] dark:hover:bg-white/[0.07] transition-colors border border-transparent hover:border-black/5 dark:hover:border-white/5"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDeleteTaskIds((prev) => [...prev, taskId]);
                            } else {
                              setSelectedDeleteTaskIds((prev) => prev.filter((id) => id !== taskId));
                            }
                          }}
                          className="mt-0.5 rounded-[4px] accent-red-600 dark:accent-red-500"
                        />
                        <div className="text-xs leading-snug">
                          <span className="font-mono text-[10px] text-neutral-400 block">{taskId}</span>
                          <span className="text-black dark:text-white font-medium">{comm}</span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/8 dark:border-white/8">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDeleteModalOpen(false)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                loading={isDeleting}
                onClick={handleDeleteConfirm}
              >
                {selectedDeleteTaskIds.length > 0
                  ? `Delete Recording & (${selectedDeleteTaskIds.length}) Task(s)`
                  : 'Delete Recording Only'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
