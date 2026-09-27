import React, { useState, useEffect } from 'react';
import { Mic, Square, CheckCircle2, Shield, X } from 'lucide-react';
import { Spinner } from '../primitives/Spinner';

interface VoiceMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoRecorded: (title: string, durationSec: number) => void;
}

export const VoiceMemoModal: React.FC<VoiceMemoModalProps> = ({
  isOpen,
  onClose,
  onMemoRecorded,
}) => {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [transcribing, setTranscribing] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (recording) {
      timer = setInterval(() => setSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(timer);
  }, [recording]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setRecording(false);
        setSeconds(0);
        setTranscribing(false);
        setDone(false);
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartStop = () => {
    if (!recording) {
      setRecording(true);
      setSeconds(0);
      setDone(false);
    } else {
      setRecording(false);
      setTranscribing(true);
      setTimeout(() => {
        setTranscribing(false);
        setDone(true);
        onMemoRecorded('Voice Memo', seconds);
      }, 1400);
    }
  };

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60).toString().padStart(2, '0');
    const s = (sec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      {/* Scrim */}
      <div className="fixed inset-0 bg-black/55 backdrop-blur-[6px]" onClick={onClose} />

      {/* Modal card */}
      <div className="relative w-full max-w-[360px] z-10 animate-apple-in">
        <div className="rounded-[26px] overflow-hidden border border-black/[0.10] dark:border-white/[0.14] bg-white dark:bg-[#1C1C1E] shadow-[0_24px_60px_rgba(0,0,0,0.20)] dark:shadow-[0_32px_80px_rgba(0,0,0,0.78)]">

          {/* Specular */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 dark:via-white/20 to-transparent pointer-events-none" />

          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-black/[0.07] dark:border-white/[0.08]">
            <div>
              <h3 className="text-[15px] font-semibold tracking-tight text-black dark:text-white">
                Voice Memo
              </h3>
              <p className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] mt-0.5">
                Recorded locally · 0.00 KB egress
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-black/[0.06] dark:bg-white/[0.10] hover:bg-black/[0.10] dark:hover:bg-white/[0.18] text-[#6E6E73] dark:text-[#8E8E93] hover:text-black dark:hover:text-white transition-colors flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Main content */}
          <div className="px-5 py-8 flex flex-col items-center space-y-5">
            {/* Record button */}
            <button
              onClick={handleStartStop}
              disabled={transcribing || done}
              className={[
                'w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all duration-300',
                'focus:outline-none disabled:opacity-60',
                recording
                  ? 'bg-[#FF3B30] text-white shadow-[0_0_0_0_rgba(255,59,48,0.4)] animate-recording-pulse'
                  : done
                    ? 'bg-[#1D8348] dark:bg-[#30D158] text-white'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.04] active:scale-[0.96]',
                'shadow-[0_8px_24px_rgba(0,0,0,0.22)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.60)]',
              ].join(' ')}
            >
              {done ? (
                <CheckCircle2 className="w-9 h-9 animate-success-bounce" />
              ) : recording ? (
                <Square className="w-8 h-8 fill-current" />
              ) : transcribing ? (
                <Spinner size="md" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>

            {/* Timer */}
            <div className={`font-mono text-[32px] font-bold tabular-nums tracking-wider leading-none ${recording ? 'text-[#FF3B30]' : 'text-black dark:text-white'}`}>
              {fmt(seconds)}
            </div>

            {/* Status label */}
            <div className="text-[13px] text-[#6E6E73] dark:text-[#8E8E93] text-center min-h-[20px]">
              {done ? (
                <span className="text-[#1D8348] dark:text-[#30D158] font-medium flex items-center gap-1.5 justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                  Transcribed and queued to ingestion
                </span>
              ) : transcribing ? (
                <span className="flex items-center gap-2 justify-center">
                  <Spinner size="xs" />
                  <span>Transcribing with Whisper-Large-v3...</span>
                </span>
              ) : recording ? (
                'Recording locally — all processing on-device'
              ) : (
                'Tap to start recording'
              )}
            </div>

            {/* Live waveform bars — shown during recording */}
            {recording && (
              <div className="flex items-center justify-center gap-[3px] h-10 w-full">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="wave-bar w-[3px] rounded-full bg-[#FF3B30] origin-bottom"
                    style={{ height: `${Math.random() * 60 + 20}%`, animationDelay: `${(i % 5) * 0.1}s` }}
                  />
                ))}
              </div>
            )}

            {/* Done transcript preview */}
            {done && (
              <div className="w-full p-3.5 rounded-[14px] border border-[#30D158]/25 bg-[#30D158]/[0.08] text-left">
                <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5] italic leading-relaxed">
                  "Discussed pilot deployment with hospital partner. Agreed to deliver zero-cloud-egress local container by end of month."
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-between text-[11px] text-[#8E8E93] font-mono">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#1D8348] dark:text-[#30D158]" />
              <span>Air-Gapped · Local Whisper</span>
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded-[8px] bg-black/[0.05] dark:bg-white/[0.08] hover:bg-black/[0.09] dark:hover:bg-white/[0.12] text-[#3C3C43] dark:text-[#EBEBF5] transition-colors font-sans font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
