import { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView } from 'framer-motion';
import { EASE, Eyebrow, MaskLine, Reveal } from '../motion';

const LOG = [
  '[KERNEL]  probing interfaces eth0 · wlan0 · utun',
  '[SOCKET]  outbound beyond local subnet: 0 pkts',
  '[WHISPER] large-v3 loaded · 48 GB unified memory',
  '[GRAPH]   tantivy vector store · 4 collections',
  '[EGRESS]  invariant verified · E_net = 0.00 KB',
];

function EgressCounter() {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-15% 0px' });
  const [v, setV] = useState(48.2);
  useEffect(() => {
    if (!inView) return;
    const c = animate(48.2, 0, { duration: 2.8, ease: [0.22, 1, 0.36, 1], onUpdate: setV });
    return () => c.stop();
  }, [inView]);
  return (
    <span ref={ref} data-testid="airgap-egress-counter" className="tabular-nums">
      {v.toFixed(2)}
    </span>
  );
}

export function AirGap() {
  return (
    <section id="airgap" data-chapter="3" data-testid="section-airgap" className="relative min-h-[130vh] flex items-center px-6 sm:px-10 lg:px-20 py-40">
      <div className="w-full lg:w-[50%]">
        <Eyebrow testId="airgap-eyebrow">Chapter 03 — The air-gap</Eyebrow>
        <h2 className="tl-serif mt-8 text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-[var(--tl-star)]">
          <MaskLine i={0}>Pull the cable.</MaskLine>
          <MaskLine i={1}><em className="italic text-white">TARS keeps thinking.</em></MaskLine>
        </h2>

        <Reveal delay={0.15}>
          <div className="mt-12 flex items-end gap-4">
            <span className="tl-serif text-[6.5rem] sm:text-[9rem] leading-[0.8] text-[var(--tl-star)]"><EgressCounter /></span>
            <div className="pb-3">
              <div className="tl-serif text-3xl text-[var(--tl-mute)]">KB</div>
              <div className="tl-mono text-[10px] uppercase tracking-[0.22em] text-[var(--tl-mute)] mt-1">measured egress</div>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.25}>
          <p className="mt-8 max-w-lg text-base leading-relaxed text-[var(--tl-mute)]">
            Indexing, transcription and pre-commit checks run on dedicated local silicon. Disconnect the WAN and nothing
            degrades — because nothing was ever leaving in the first place.
          </p>
        </Reveal>

        <Reveal delay={0.35}>
          <div className="mt-10 tl-glass rounded-[22px] p-5 sm:p-6 max-w-xl" data-testid="airgap-terminal">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/[0.07]">
              <span className="tl-mono text-[12px] text-[var(--tl-star)]">tars-host-doctor --verify-airgap</span>
              <span className="tl-mono text-[9.5px] uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border border-white/40 text-white">sealed</span>
            </div>
            <div className="space-y-1.5">
              {LOG.map((l, i) => (
                <motion.div
                  key={l}
                  className={`tl-mono text-[11.5px] whitespace-pre ${i === LOG.length - 1 ? 'text-white' : 'text-[#888888]'}`}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.7, delay: 0.5 + i * 0.28, ease: EASE }}
                >
                  {l}
                </motion.div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
