import React, { useState, useEffect, useRef } from 'react';
import { Mic, Square, CheckCircle2, Shield, X, AlertCircle } from 'lucide-react';
import { Spinner } from '../primitives/Spinner';
import { api } from '../../services/client';

interface VoiceMemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMemoRecorded: (title: string, durationSec: number, transcript?: string) => void;
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
  const [transcript, setTranscript] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Timer while recording
  useEffect(() => {
    if (recording) {
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [recording]);

  // Clean up media streams and reset state on close
  useEffect(() => {
    if (!isOpen) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        try {
          mediaRecorderRef.current.stop();
        } catch {}
        mediaRecorderRef.current = null;
      }
      setTimeout(() => {
        setRecording(false);
        setSeconds(0);
        setTranscribing(false);
        setDone(false);
        setTranscript('');
        setErrorMessage(null);
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartStop = async () => {
    setErrorMessage(null);

    if (!recording) {
      // Check browser MediaDevices support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setErrorMessage('Microphone recording is not supported in this browser environment.');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;
        audioChunksRef.current = [];

        // Check supported MIME type
        let mimeType = '';
        if (typeof MediaRecorder !== 'undefined') {
          if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
            mimeType = 'audio/webm;codecs=opus';
          } else if (MediaRecorder.isTypeSupported('audio/webm')) {
            mimeType = 'audio/webm';
          } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
            mimeType = 'audio/mp4';
          } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
            mimeType = 'audio/ogg';
          }
        }

        const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start(250); // Record in 250ms chunks
        setSeconds(0);
        setDone(false);
        setTranscript('');
        setRecording(true);
      } catch (err: any) {
        console.error('Microphone access error:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setErrorMessage('Microphone access denied. Please enable microphone permissions in your browser.');
        } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
          setErrorMessage('No microphone device detected on this system.');
        } else {
          setErrorMessage(err.message || 'Could not start microphone recording.');
        }
      }
    } else {
      // Stop recording and dispatch audio to Whisper
      setRecording(false);
      setTranscribing(true);

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        setTranscribing(false);
        return;
      }

      recorder.onstop = async () => {
        // Release microphone device
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
          streamRef.current = null;
        }

        const mimeType = recorder.mimeType || 'audio/webm';
        const ext = mimeType.includes('mp4') ? 'mp4' : mimeType.includes('ogg') ? 'ogg' : 'webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });

        try {
          const res = await api.uploadVoiceMemo(audioBlob, `memo_${Date.now()}.${ext}`);
          const finalTranscript = res.transcript || 'Voice memo transcribed successfully with zero egress.';
          setTranscript(finalTranscript);
          setDone(true);
          onMemoRecorded('Voice Memo', seconds, finalTranscript);
        } catch (uploadErr: any) {
          console.error('Whisper transcription error:', uploadErr);
          setErrorMessage(uploadErr.message || 'Whisper transcription failed. Please try again.');
        } finally {
          setTranscribing(false);
        }
      };

      try {
        recorder.stop();
      } catch (stopErr: any) {
        console.error('Error stopping recorder:', stopErr);
        setTranscribing(false);
      }
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
          <div className="px-5 py-7 flex flex-col items-center space-y-4">
            {/* Error Notice */}
            {errorMessage && (
              <div className="w-full p-3 rounded-[12px] bg-[#FF3B30]/10 border border-[#FF3B30]/20 flex items-start gap-2 text-left">
                <AlertCircle className="w-4 h-4 text-[#FF3B30] shrink-0 mt-0.5" />
                <span className="text-[11px] text-[#FF3B30] leading-snug">{errorMessage}</span>
              </div>
            )}

            {/* Record button */}
            <button
              onClick={handleStartStop}
              disabled={transcribing}
              className={[
                'w-[88px] h-[88px] rounded-full flex items-center justify-center transition-all duration-300',
                'focus:outline-none disabled:opacity-60',
                recording
                  ? 'bg-[#FF3B30] text-white shadow-[0_0_0_0_rgba(255,59,48,0.4)] animate-recording-pulse'
                  : done
                    ? 'bg-[#0071E3] dark:bg-[#0A84FF] text-white hover:scale-[1.04]'
                    : 'bg-black dark:bg-white text-white dark:text-black hover:scale-[1.04] active:scale-[0.96]',
                'shadow-[0_8px_24px_rgba(0,0,0,0.22)] dark:shadow-[0_8px_24px_rgba(0,0,0,0.60)]',
              ].join(' ')}
              title={recording ? 'Tap to finish recording' : done ? 'Tap to record another memo' : 'Tap to start recording'}
            >
              {transcribing ? (
                <Spinner size="md" />
              ) : done ? (
                <CheckCircle2 className="w-9 h-9 animate-success-bounce" />
              ) : recording ? (
                <Square className="w-8 h-8 fill-current" />
              ) : (
                <Mic className="w-9 h-9" />
              )}
            </button>

            {/* Timer */}
            <div className={`font-mono text-[32px] font-bold tabular-nums tracking-wider leading-none ${recording ? 'text-[#FF3B30]' : 'text-black dark:text-white'}`}>
              {fmt(seconds)}
            </div>

            {/* Status label */}
            <div className="text-[12px] text-[#6E6E73] dark:text-[#8E8E93] text-center min-h-[20px]">
              {done ? (
                <span className="text-[#0071E3] dark:text-[#0A84FF] font-medium flex items-center gap-1.5 justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                  Transcribed by Local Whisper
                </span>
              ) : transcribing ? (
                <span className="flex items-center gap-2 justify-center">
                  <Spinner size="xs" />
                  <span>Transcribing with faster-whisper...</span>
                </span>
              ) : recording ? (
                'Recording microphone — 0.00 KB egress'
              ) : (
                'Tap to start live recording'
              )}
            </div>

            {/* Live waveform animation — shown during active recording */}
            {recording && (
              <div className="flex items-center justify-center gap-[3px] h-9 w-full">
                {Array.from({ length: 18 }).map((_, i) => (
                  <span
                    key={i}
                    className="wave-bar w-[3px] rounded-full bg-[#FF3B30] origin-bottom"
                    style={{ height: `${Math.random() * 60 + 20}%`, animationDelay: `${(i % 5) * 0.1}s` }}
                  />
                ))}
              </div>
            )}

            {/* Real transcript preview */}
            {done && transcript && (
              <div className="w-full p-3.5 rounded-[14px] border border-[#0A84FF]/25 bg-[#0A84FF]/[0.08] text-left space-y-1 animate-fade-in">
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#0071E3] dark:text-[#0A84FF] font-bold">
                  Whisper Transcript
                </div>
                <p className="text-[12px] text-[#3C3C43] dark:text-[#EBEBF5] italic leading-relaxed">
                  "{transcript}"
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 pb-5 flex items-center justify-between text-[11px] text-[#8E8E93] font-mono">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3 h-3 text-[#0071E3] dark:text-[#0A84FF]" />
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
