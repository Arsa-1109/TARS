import { useRef, useState } from 'react';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { EASE, Eyebrow, MaskLine } from '../motion';
import { WORKSPACES } from './workspaceData';

export function Workspaces({ onLaunchDemo }: { onLaunchDemo: () => void }) {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });
  const [idx, setIdx] = useState(0);
  useMotionValueEvent(scrollYProgress, 'change', (v) => setIdx(Math.min(5, Math.max(0, Math.floor(v * 6)))));
  const ws = WORKSPACES[idx];

  return (
    <section id="workspaces" data-chapter="2" ref={ref} data-testid="section-workspaces" className="relative h-[720vh]">
      <div className="sticky top-0 h-screen flex items-center px-6 sm:px-10 lg:px-20 overflow-hidden">
        <div className="w-full grid lg:grid-cols-12 gap-10 items-center">
          <div className="hidden lg:flex lg:col-span-5 self-end pb-16 flex-col gap-2">
            <span className="tl-mono text-[10px] uppercase tracking-[0.3em] text-[var(--tl-mute)]">TARS · unfolding panel</span>
            <span className="tl-serif text-7xl text-[var(--tl-star)]/90 tabular-nums" data-testid="workspace-panel-counter">
              {ws.no}<span className="text-[var(--tl-mute)]/50 text-4xl"> / 06</span>
            </span>
          </div>

          <div className="lg:col-span-7 lg:pl-6">
            <Eyebrow testId="workspaces-eyebrow">Chapter 02 — The six rooms</Eyebrow>
            <h2 className="tl-serif mt-6 text-5xl sm:text-6xl leading-[0.95] text-[var(--tl-star)]">
              <MaskLine i={0}>Six rooms. <em className="italic text-[var(--tl-amber)]">One memory.</em></MaskLine>
            </h2>

            <div className="mt-8 flex gap-2" data-testid="workspace-progress">
              {WORKSPACES.map((w, i) => (
                <div key={w.id} className="flex-1">
                  <div className="h-px w-full bg-white/10 overflow-hidden">
                    <motion.div className="h-full bg-[var(--tl-amber)]" animate={{ width: i <= idx ? '100%' : '0%' }} transition={{ duration: 0.9, ease: EASE }} />
                  </div>
                  <div className={`tl-mono mt-2 text-[10px] tracking-[0.15em] hidden sm:block transition-colors duration-500 ${i === idx ? 'text-[var(--tl-star)]' : 'text-[var(--tl-mute)]/60'}`}>
                    {w.no}
                  </div>
                </div>
              ))}
            </div>

            <div className="relative mt-8 min-h-[440px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={ws.id}
                  data-testid={`workspace-card-${ws.id}`}
                  initial={{ opacity: 0, y: 30, filter: 'blur(8px)' }}
                  animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                  exit={{ opacity: 0, y: -24, filter: 'blur(8px)' }}
                  transition={{ duration: 0.75, ease: EASE }}
                  className="tl-glass rounded-[28px] p-6 sm:p-8 grid md:grid-cols-2 gap-8 bg-[#05060A]/40"
                >
                  <div className="flex flex-col">
                    <span className="tl-mono text-[10px] uppercase tracking-[0.25em] text-[var(--tl-amber)]">{ws.kicker}</span>
                    <h3 className="tl-serif mt-3 text-3xl sm:text-4xl leading-[1] text-[var(--tl-star)]">{ws.name}</h3>
                    <p className="mt-4 text-[15px] text-[var(--tl-star)]/90">{ws.line}</p>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--tl-mute)]">{ws.body}</p>
                    <div className="mt-auto pt-6 grid grid-cols-3 gap-3 border-t border-white/[0.07]">
                      {ws.metrics.map(([k, v]) => (
                        <div key={k}>
                          <div className="tl-mono text-[9.5px] uppercase tracking-[0.18em] text-[var(--tl-mute)]">{k}</div>
                          <div className="mt-1 text-[13px] text-[var(--tl-star)]">{v}</div>
                        </div>
                      ))}
                    </div>
                    <button
                      data-testid={`workspace-open-${ws.id}`}
                      onClick={onLaunchDemo}
                      className="tl-link mt-6 self-start flex items-center gap-2 text-[13px] text-[var(--tl-mute)]"
                    >
                      Open this workspace <ArrowUpRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="self-center">{ws.preview}</div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
