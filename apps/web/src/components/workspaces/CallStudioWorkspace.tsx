import React, { useState, useEffect } from 'react';
import { PageHeader } from '../layout/PageHeader';
import { Surface } from '../primitives/Surface';
import { Button } from '../primitives/Button';
import { SegmentedControl } from '../primitives/SegmentedControl';
import { VoiceToSpecResponse } from '../../types/contracts';
import { api } from '../../services/client';
import {
  Phone,
  Play,
  Pause,
  Upload,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileCheck,
  Search,
  Download,
  Copy,
  Plus,
  Volume2,
  Sparkles,
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
            <span className="text-xs font-mono text-tars-text-secondary bg-tars-surface px-2.5 py-1 rounded-xl border border-tars-separator">
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
            className={`px-3.5 py-2 rounded-xl text-xs font-medium border shrink-0 transition-all ${
              selectedCall.call_id === call.call_id
                ? 'border-tars-border-strong bg-tars-surface font-semibold text-tars-text-primary shadow-subtle'
                : 'border-tars-separator bg-tars-surface/50 text-tars-text-secondary hover:text-tars-text-primary'
            }`}
          >
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-tars-accent" />
              <span>{call.client_name}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                  call.sentiment === 'URGENT'
                    ? 'bg-tars-warning-bg text-tars-warning-text'
                    : 'bg-tars-surface-secondary text-tars-text-secondary'
                }`}
              >
                {call.sentiment}
              </span>
            </div>
          </button>
        ))}
      </div>

      {/* Apple Audio Player Surface with Waveform Scrubber */}
      <div className="apple-card p-5 shadow-apple space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-tars-text-primary">
              {selectedCall.client_name}
            </h3>
            <p className="text-xs text-tars-text-secondary mt-0.5">
              Recorded: {selectedCall.recorded_at} • Duration: {formatSeconds(selectedCall.audio_duration_seconds)}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Speed Toggles */}
            <div className="flex items-center rounded-lg border border-tars-separator bg-tars-surface-tertiary p-0.5 text-xs font-mono">
              {[1, 1.25, 1.5, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
                    playbackSpeed === spd
                      ? 'bg-tars-surface text-tars-text-primary shadow-subtle font-bold'
                      : 'text-tars-text-secondary hover:text-tars-text-primary'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>

            <Button
              variant="primary"
              size="sm"
              icon={isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? 'Pause' : 'Play Audio'}
            </Button>
            <div className="text-xs font-mono text-tars-text-secondary tabular-nums">
              {formatSeconds(playbackSeconds)} / {formatSeconds(selectedCall.audio_duration_seconds)}
            </div>
          </div>
        </div>

        {/* Dynamic Waveform Visualizer & Scrubber */}
        <div className="space-y-1.5">
          <div
            className="h-12 w-full flex items-end gap-[3px] py-1 px-2 rounded-xl bg-tars-surface-secondary/60 cursor-pointer overflow-hidden"
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
                      ? 'bg-tars-accent'
                      : 'bg-tars-separator hover:bg-tars-border-strong'
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
          <div className="apple-card p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-tars-separator/60 pb-3">
              <h4 className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                Transcript & Diarization
              </h4>

              {/* Transcript Search & Filter */}
              <div className="flex items-center gap-2">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 text-tars-text-tertiary absolute left-2.5 pointer-events-none" />
                  <input
                    type="text"
                    value={transcriptSearch}
                    onChange={(e) => setTranscriptSearch(e.target.value)}
                    placeholder="Search words..."
                    className="pl-7 pr-2 py-1 text-xs rounded-lg border border-tars-separator bg-tars-canvas text-tars-text-primary w-28 sm:w-36 focus:outline-none"
                  />
                </div>

                <select
                  value={selectedSpeaker}
                  onChange={(e) => setSelectedSpeaker(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-tars-separator bg-tars-canvas text-tars-text-secondary"
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
                <div className="text-center py-8 text-xs text-tars-text-tertiary">
                  No dialogue matches "{transcriptSearch}"
                </div>
              ) : (
                filteredTranscript?.map((t, idx) => (
                  <div
                    key={idx}
                    className="space-y-1 group hover:bg-tars-surface-secondary/40 p-3 rounded-xl transition-colors border border-transparent hover:border-tars-separator"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-tars-text-primary flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-tars-accent" />
                        {t.speaker}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setPlaybackSeconds(t.seconds);
                          setIsPlaying(true);
                        }}
                        className="font-mono text-[11px] text-tars-accent hover:underline px-2 py-0.5 rounded bg-tars-surface-tertiary"
                      >
                        {t.timestamp}
                      </button>
                    </div>
                    <p className="text-xs sm:text-sm text-tars-text-secondary leading-relaxed font-sans pl-3.5">
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
            <div className="apple-card p-5 space-y-3">
              <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider flex items-center justify-between">
                <span>Executive Summary & Sentiment</span>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                    selectedCall.sentiment === 'URGENT'
                      ? 'bg-tars-warning-bg text-tars-warning-text'
                      : 'bg-tars-surface-secondary text-tars-text-secondary'
                  }`}
                >
                  Sentiment: {selectedCall.sentiment}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-tars-text-primary leading-relaxed font-sans">
                {selectedCall.summary}
              </p>
            </div>
          )}

          {/* Section 2 & 3: Pain Points & Feature Requests */}
          {(mobileTab === 'summary' || mobileTab === 'transcript') && (
            <div className="apple-card p-5 space-y-4">
              {/* Pain Points */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                  Unfiltered Customer Pain Points
                </div>
                <ul className="space-y-2 text-xs text-tars-text-primary">
                  {selectedCall.pain_points.map((pp, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-tars-warning-text font-bold text-sm leading-none">•</span>
                      <span className="leading-snug">{pp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Feature Requests */}
              <div className="pt-3 border-t border-tars-separator/60 space-y-2">
                <div className="text-xs font-semibold text-tars-text-secondary uppercase tracking-wider">
                  Requested Features & Constraints
                </div>
                <ul className="space-y-2 text-xs text-tars-text-primary">
                  {selectedCall.feature_requests.map((fr, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-tars-accent font-bold text-sm leading-none">•</span>
                      <span className="leading-snug">{fr}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section 4: Explicit Verbal Commitments with Push to Action Hub */}
          {(mobileTab === 'commitments' || mobileTab === 'transcript') && (
            <div className="apple-card p-5 space-y-3.5 border-tars-border-strong">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-tars-text-primary uppercase tracking-wider flex items-center gap-1.5">
                  <FileCheck className="w-4 h-4 text-tars-accent" />
                  <span>Verbal Commitments ({selectedCall.commitments.length})</span>
                </div>
                <span className="text-[11px] text-tars-text-tertiary">1-Click Push to Hub</span>
              </div>

              <div className="space-y-2.5">
                {selectedCall.commitments.map((comm, idx) => {
                  const isPromoted = promotedSet.has(`${selectedCall.call_id}-${idx}`);
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl border border-tars-separator bg-tars-surface-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <p className="text-xs text-tars-text-primary font-medium leading-snug">
                        {comm}
                      </p>
                      <Button
                        variant={isPromoted ? 'ghost' : 'secondary'}
                        size="sm"
                        disabled={isPromoted}
                        icon={isPromoted ? <CheckCircle2 className="w-3.5 h-3.5 text-tars-success-text" /> : <Plus className="w-3.5 h-3.5" />}
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
