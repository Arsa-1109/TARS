import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { VoiceToSpecResponse } from '../../types/contracts';
import { api } from '../../services/client';
import {
  Phone,
  Play,
  Pause,
  CheckCircle2,
  FileCheck,
  Search,
  Plus,
} from 'lucide-react';

interface CallStudioWorkspaceProps {
  activeCallId: string | null;
  onSelectCall: (id: string) => void;
  onPromoteAction: (commitmentText: string, callId: string, timestamp: string) => void;
}

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
  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('ALL');
  const [mobileTab, setMobileTab] = useState<'transcript' | 'summary' | 'commitments'>('transcript');
  const [promotedSet, setPromotedSet] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.getCalls().then((data) => {
      setCalls(data);
      if (data.length > 0) {
        const found = data.find((c) => c.call_id === activeCallId) || data[0];
        setSelectedCall(found);
      }
    });
  }, [activeCallId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && selectedCall) {
      interval = setInterval(() => {
        setPlaybackSeconds((prev) => {
          if (prev >= selectedCall.audio_duration_seconds) {
            setIsPlaying(false);
            return 0;
          }
          return Math.min(selectedCall.audio_duration_seconds, prev + playbackSpeed);
        });
      }, 1000);
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
    onPromoteAction(commitment, selectedCall.call_id, "02:30");
    setPromotedSet((prev) => new Set(prev).add(`${selectedCall.call_id}-${index}`));
  };

  if (!selectedCall) return null;

  const speakers = Array.from(
    new Set(selectedCall.transcript?.map((t) => t.speaker.split(' ')[0]) || [])
  );

  const filteredTranscript = selectedCall.transcript?.filter((t) => {
    const matchesSearch = t.text.toLowerCase().includes(transcriptSearch.toLowerCase()) ||
      t.speaker.toLowerCase().includes(transcriptSearch.toLowerCase());
    const matchesSpeaker = selectedSpeaker === 'ALL' || t.speaker.startsWith(selectedSpeaker);
    return matchesSearch && matchesSpeaker;
  });

  // Dynamic waveform bars
  const waveformBars = [
    25, 40, 65, 80, 50, 30, 70, 90, 85, 45, 60, 95, 75, 40, 60, 80, 50, 35, 70, 85,
    90, 60, 45, 75, 95, 65, 40, 55, 85, 90, 70, 50, 35, 60, 80, 75, 45, 65, 90, 80,
    55, 40, 70, 85, 60, 35, 50, 75, 90, 65
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Workspace 2"
        title="Client Call Studio"
        description="Air-gapped on-device Whisper transcription extracting customer pain points, feature requests, and verbal commitments."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-[#6E6E73] dark:text-[#8E8E93] bg-white dark:bg-[#1C1C1E] px-3 py-1.5 rounded-[10px] border border-black/[0.08] dark:border-white/[0.12] shadow-xs">
              faster-whisper on-prem
            </span>
          </div>
        }
      />

      {/* Call Selector Ribbon */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {calls.map((call) => (
          <button
            key={call.call_id}
            onClick={() => {
              setSelectedCall(call);
              onSelectCall(call.call_id);
              setIsPlaying(false);
              setPlaybackSeconds(0);
            }}
            className={`px-3.5 py-2 rounded-[14px] text-xs font-medium border shrink-0 transition-all ${
              selectedCall.call_id === call.call_id
                ? 'border-black/[0.25] dark:border-white/[0.30] bg-white dark:bg-[#1C1C1E] font-semibold text-black dark:text-white shadow-sm ring-1 ring-black/[0.08] dark:ring-white/[0.12]'
                : 'border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-[#1C1C1E]/60 text-[#3C3C43] dark:text-[#EBEBF5] hover:bg-white dark:hover:bg-[#1C1C1E]'
            }`}
          >
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-black dark:text-white" />
              <span>{call.client_name}</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  call.sentiment === 'URGENT'
                    ? 'bg-[#FF3B30]/[0.12] text-[#C0392B] dark:text-[#FF453A]'
                    : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#3C3C43] dark:text-[#EBEBF5]'
                }`}
              >
                {call.sentiment}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Apple Podcasts/Voice Memos-Style Audio Player */}
      <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold tracking-tight text-black dark:text-white">
              {selectedCall.client_name}
            </h3>
            <p className="text-xs text-[#86868B] dark:text-[#8E8E93] mt-0.5">
              {selectedCall.recorded_at} · {formatSeconds(selectedCall.audio_duration_seconds)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Speed Toggles */}
            <div className="flex items-center rounded-full border border-black/[0.08] dark:border-white/[0.10] bg-black/[0.03] dark:bg-white/[0.05] p-0.5 text-xs">
              {[1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all ${
                    playbackSpeed === spd
                      ? 'bg-white dark:bg-[#323236] text-black dark:text-white shadow-xs font-semibold'
                      : 'text-[#86868B] dark:text-[#8E8E93] hover:text-black dark:hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 ml-0.5" />}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? 'Pause' : 'Play'}
            </Button>
            <div className="text-xs text-[#86868B] dark:text-[#8E8E93] tabular-nums font-mono">
              {formatSeconds(playbackSeconds)} / {formatSeconds(selectedCall.audio_duration_seconds)}
            </div>
          </div>
        </div>

        {/* Apple Dynamic Waveform Visualizer */}
        <div className="space-y-1.5">
          <div
            className="h-12 w-full flex items-end gap-[3px] py-1 px-3 rounded-[12px] bg-black/[0.03] dark:bg-white/[0.04] cursor-pointer overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = e.clientX - rect.left;
              const ratio = Math.max(0, Math.min(1, clickX / rect.width));
              setPlaybackSeconds(Math.floor(ratio * selectedCall.audio_duration_seconds));
            }}
          >
            {waveformBars.map((barHeight, idx) => {
              const barProgress = idx / waveformBars.length;
              const isPast = barProgress <= playbackSeconds / selectedCall.audio_duration_seconds;
              return (
                <div
                  key={idx}
                  style={{ height: `${barHeight}%` }}
                  className={`flex-1 rounded-full transition-all duration-75 ${
                    isPast
                      ? 'bg-black dark:bg-white'
                      : 'bg-black/[0.12] dark:bg-white/[0.14] hover:bg-black/[0.25] dark:hover:bg-white/[0.28]'
                  }`}
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile Tab Switcher */}
      <div className="md:hidden">
        <SegmentedControl
          options={[
            { value: 'transcript', label: 'Transcript' },
            { value: 'summary', label: 'Summary & Specs' },
            { value: 'commitments', label: 'Commitments', badge: selectedCall.commitments.length },
          ]}
          value={mobileTab}
          onChange={(v) => setMobileTab(v as any)}
        />
      </div>

      {/* Main Analytical Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Column: Timestamped Transcript with Search & Speaker Filter (7 cols) */}
        <div
          className={`md:col-span-6 lg:col-span-7 space-y-4 ${
            mobileTab !== 'transcript' ? 'hidden md:block' : ''
          }`}
        >
          <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] p-5 space-y-4 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/[0.08] dark:border-white/[0.08] pb-3">
              <h4 className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                Transcript & Diarization
              </h4>

              {/* Transcript Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-[#8E8E93] absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search words..."
                    className="pl-7 pr-2 py-1 text-xs rounded-[8px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white w-28 sm:w-36 focus:outline-none"
                  />
                </div>

                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="px-2 py-1 text-xs rounded-[8px] border border-black/[0.10] dark:border-white/[0.12] bg-[#F5F5F7] dark:bg-[#2C2C2E] text-black dark:text-white appearance-none"
                >
                  <option value="ALL">All Speakers</option>
                  {speakers.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Transcript Stream */}
            <div className="space-y-3.5 max-h-[580px] overflow-y-auto pr-1">
              {filteredTranscript?.length === 0 ? (
                <div className="text-center py-8 text-xs text-[#8E8E93]">
                  No dialogue matches "{transcriptSearch}"
                </div>
              ) : (
                filteredTranscript?.map((t, idx) => (
                  <div
                    key={idx}
                    className="space-y-1 group hover:bg-black/[0.02] dark:hover:bg-white/[0.03] p-3 rounded-[12px] transition-colors border border-transparent hover:border-black/[0.06] dark:hover:border-white/[0.08]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-black dark:text-white flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-[#0071E3] dark:bg-[#0A84FF]" />
                        {t.speaker}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPlaybackSeconds(t.seconds);
                          setIsPlaying(true);
                        }}
                        className="font-mono text-[11px] text-[#0071E3] dark:text-[#0A84FF] hover:underline px-2 py-0.5 rounded-[6px] bg-black/[0.05] dark:bg-white/[0.08]"
                      >
                        {t.timestamp}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-[#3C3C43] dark:text-[#EBEBF5] leading-relaxed font-sans pl-3.5">
                      {t.text}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: 4-Part Voice-to-Spec Extractor (5 cols on desktop) */}
        <div
          className={`md:col-span-6 lg:col-span-5 space-y-4 ${
            mobileTab === 'transcript' ? 'hidden md:block' : ''
          }`}
        >
          {/* Section 1: Executive Summary */}
          {(mobileTab === 'summary' || mobileTab === 'transcript') && (
            <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] p-5 space-y-3 shadow-sm">
              <div className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider flex items-center justify-between">
                <span>Executive Summary & Sentiment</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                    selectedCall.sentiment === 'URGENT'
                      ? 'bg-[#FF3B30]/[0.12] text-[#C0392B] dark:text-[#FF453A]'
                      : 'bg-black/[0.05] dark:bg-white/[0.08] text-[#3C3C43] dark:text-[#EBEBF5]'
                  }`}
                >
                  Sentiment: {selectedCall.sentiment}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-black dark:text-white leading-relaxed font-sans">
                {selectedCall.summary}
              </p>
            </div>
          )}

          {/* Section 2 & 3: Pain Points & Feature Requests */}
          {(mobileTab === 'summary' || mobileTab === 'transcript') && (
            <div className="rounded-[20px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] p-5 space-y-4 shadow-sm">
              {/* Pain Points */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                  Unfiltered Customer Pain Points
                </div>
                <ul className="space-y-2 text-xs text-black dark:text-white">
                  {selectedCall.pain_points.map((pp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#C0392B] dark:text-[#FF453A] font-bold text-sm leading-none">•</span>
                      <span className="leading-snug">{pp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature Requests */}
              <div className="pt-3 border-t border-black/[0.08] dark:border-white/[0.08] space-y-2">
                <div className="text-xs font-semibold text-[#6E6E73] dark:text-[#8E8E93] uppercase tracking-wider">
                  Requested Features & Constraints
                </div>
                <ul className="space-y-2 text-xs text-black dark:text-white">
                  {selectedCall.feature_requests.map((fr, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-[#0071E3] dark:text-[#0A84FF] font-bold text-sm leading-none">•</span>
                      <span className="leading-snug">{fr}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 4: Explicit Verbal Commitments with Push to Action Hub */}
          {(mobileTab === 'commitments' || mobileTab === 'transcript') && (
            <div className="rounded-[20px] border border-black/[0.12] dark:border-white/[0.16] bg-white dark:bg-[#1C1C1E] p-5 space-y-3.5 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-black dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-[#0071E3] dark:text-[#0A84FF]" />
                  <span>Verbal Commitments ({selectedCall.commitments.length})</span>
                </div>
                <span className="text-[11px] text-[#8E8E93] font-mono">1-Click Push to Hub</span>
              </div>

              <div className="space-y-2.5">
                {selectedCall.commitments.map((comm, idx) => {
                  const isPromoted = promotedSet.has(`${selectedCall.call_id}-${idx}`);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-[14px] border border-black/[0.08] dark:border-white/[0.10] bg-[#F5F5F7] dark:bg-[#2C2C2E]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <p className="text-xs text-black dark:text-white font-medium leading-snug">
                        {comm}
                      </p>
                      <Button
                        variant={isPromoted ? 'ghost' : 'secondary'}
                        size="sm"
                        disabled={isPromoted}
                        icon={isPromoted ? <CheckCircle2 className="w-3.5 h-3.5 text-[#0071E3] dark:text-[#0A84FF]" /> : <Plus className="w-3.5 h-3.5" />}
                        onClick={() => handlePromote(comm, idx)}
                        className="shrink-0 text-xs"
                      >
                        {isPromoted ? 'Promoted' : 'Promote to Action Hub'}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
