import React from 'react';
import { motion } from 'framer-motion';
import { EASE, Eyebrow, MaskLine } from '../motion';

const PHRASES = ['Local silicon', 'Zero cloud egress', 'Deterministic memory', 'Whisper on-device', 'Tree-sitter in 38 ms', 'Git-backed decisions'];

const Star = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8 mx-8 sm:mx-12 shrink-0 text-white/40" aria-hidden>
    <path fill="currentColor" d="M12 0c.6 6.4 5.6 11.4 12 12-6.4.6-11.4 5.6-12 12-.6-6.4-5.6-11.4-12-12C6.4 11.4 11.4 6.4 12 0z" />
  </svg>
);

function Marquee() {
  const row = PHRASES.map((p) => (
    <React.Fragment key={p}>
      <span className="tl-serif italic text-6xl sm:text-8xl text-[var(--tl-star)]/85 whitespace-nowrap">{p}</span>
      <Star />
    </React.Fragment>
  ));
  return (
    <div className="tl-marquee relative overflow-hidden py-10 border-y border-white/[0.06]" data-testid="landing-marquee">
      <div className="tl-marquee-track items-center">{row}{row}</div>
    </div>
  );
}

const spot = (e: React.MouseEvent<HTMLDivElement>) => {
  const r = e.currentTarget.getBoundingClientRect();
  e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`);
  e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`);
};

type CellProps = { className: string; value: string; unit?: string; label: string; note: string; i: number; testId: string; big?: boolean };

const Cell = ({ className, value, unit, label, note, i, testId, big }: CellProps) => (
  <motion.div
    data-testid={testId}
    onMouseMove={spot}
    className={`tl-glass tl-spot rounded-[28px] p-7 sm:p-8 flex flex-col justify-between min-h-[220px] ${className}`}
    initial={{ opacity: 0, y: 40 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: '-8% 0px' }}
    transition={{ duration: 1.1, delay: i * 0.08, ease: EASE }}
  >
    <span className="tl-mono text-[10px] uppercase tracking-[0.25em] text-[var(--tl-mute)]">{label}</span>
    <div>
      <div className={`tl-serif leading-[0.85] text-[var(--tl-star)] ${big ? 'text-[6rem] sm:text-[9rem]' : 'text-6xl sm:text-7xl'}`}>
        {value}
        {unit && <span className="text-white/60 text-[0.45em] ml-2">{unit}</span>}
      </div>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-[var(--tl-mute)]">{note}</p>
    </div>
  </motion.div>
);

export function Specification() {
  return (
    <section id="specification" data-chapter="5" data-testid="section-specification" className="relative py-32">
      <Marquee />
      <div className="px-6 sm:px-10 lg:px-20 pt-32 max-w-[1400px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-14">
          <div>
            <Eyebrow testId="spec-eyebrow">Chapter 05 — The specification</Eyebrow>
            <h2 className="tl-serif mt-8 text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-[var(--tl-star)]">
              <MaskLine i={0}>Numbers you can</MaskLine>
              <MaskLine i={1}><em className="italic text-[var(--tl-mute)]">verify offline.</em></MaskLine>
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-[var(--tl-mute)]">Measured on a single sovereign node. No asterisks, no cloud fallbacks, no telemetry.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 lg:auto-rows-[minmax(220px,auto)]">
          <Cell i={0} testId="spec-egress" big className="md:col-span-6 lg:col-span-7 lg:row-span-2" value="0.00" unit="KB" label="Network egress" note="Zero cloud egress, verified on every boot by the host doctor. The air-gap is an invariant, not a setting." />
          <Cell i={1} testId="spec-recall" className="md:col-span-3 lg:col-span-5" value="138" unit="ms" label="Knowledge recall" note="Hybrid deterministic search with line-level citations." />
          <Cell i={2} testId="spec-ast" className="md:col-span-3 lg:col-span-5" value="38.4" unit="ms" label="AST invariant check" note="Tree-sitter evaluation per commit, before code lands." />
          <Cell i={3} testId="spec-tests" className="md:col-span-2 lg:col-span-4" value="120" unit="/120" label="Test suite" note="Every sovereign invariant covered and passing." />
          <Cell i={4} testId="spec-whisper" className="md:col-span-2 lg:col-span-4" value="L-v3" label="Whisper, on-device" note="Transcription and diarization never leave the node." />
          <Cell i={5} testId="spec-memory" className="md:col-span-2 lg:col-span-4" value="48" unit="GB" label="Unified memory" note="Apple Silicon and Linux sovereign appliances." />
        </div>
      </div>
    </section>
  );
}
