import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { EASE, Magnetic, MaskLine } from '../motion';

type Props = { ready: boolean; onLaunchDemo: () => void; onOpenAuth: (mode?: 'signin' | 'signup') => void };

const TELEMETRY = [
  ['E_net', '0.00 KB'],
  ['AST check', '< 38 ms'],
  ['Recall', '138 ms'],
];

export function Hero({ ready, onLaunchDemo, onOpenAuth }: Props) {
  const fade = (d: number) => ({
    initial: { opacity: 0, y: 18 },
    animate: ready ? { opacity: 1, y: 0 } : {},
    transition: { duration: 1.3, delay: d, ease: EASE },
  });

  return (
    <section id="arrival" data-chapter="0" data-testid="section-hero" className="relative min-h-screen flex items-end lg:items-center px-6 sm:px-10 lg:px-20 pt-32 pb-28">
      <div className="relative max-w-[52rem]">
        <motion.div {...fade(0.2)} className="tl-mono flex items-center gap-3 text-[11px] uppercase tracking-[0.3em] text-[#888888] mb-8">
          <span className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]" />
          TARS 2.0 — Sovereign startup brain
        </motion.div>

        <h1 data-testid="hero-title" className="tl-serif text-[3.3rem] leading-[0.95] sm:text-7xl lg:text-[7.4rem] lg:leading-[0.9] text-white">
          <MaskLine show={ready} i={0} delay={0.15}>Your company's</MaskLine>
          <MaskLine show={ready} i={1} delay={0.15}>memory, kept in</MaskLine>
          <MaskLine show={ready} i={2} delay={0.15}>
            <em className="italic text-white">its own orbit.</em>
          </MaskLine>
        </h1>

        <motion.p {...fade(0.75)} className="mt-9 max-w-xl text-base sm:text-lg leading-relaxed text-[#AAAAAA]">
          An air-gapped intelligence that remembers every call, decision and line of code — running entirely on
          your own silicon. Nothing leaves the room. Not even a kilobyte.
        </motion.p>

        <motion.div {...fade(0.95)} className="mt-11 flex flex-wrap items-center gap-4">
          <Magnetic>
            <button
              data-testid="hero-launch-demo-button"
              onClick={onLaunchDemo}
              className="tl-btn-primary h-12 pl-7 pr-6 rounded-full text-[14px] font-medium flex items-center gap-3"
            >
              Launch live workspace <ArrowRight className="tl-arrow w-4 h-4" />
            </button>
          </Magnetic>
          <button
            data-testid="hero-get-started-button"
            onClick={() => onOpenAuth('signup')}
            className="tl-btn-ghost h-12 px-7 rounded-full text-[14px] flex items-center gap-3"
          >
            Create an account
          </button>
        </motion.div>

        <motion.div {...fade(1.15)} className="mt-14 flex flex-wrap gap-x-10 gap-y-3">
          {TELEMETRY.map(([k, v]) => (
            <div key={k} className="tl-mono text-[11px] uppercase tracking-[0.2em]" data-testid={`hero-telemetry-${k.replace(/\W+/g, '-').toLowerCase()}`}>
              <span className="text-[#888888]">{k}</span>
              <span className="ml-3 text-white">{v}</span>
            </div>
          ))}
        </motion.div>
      </div>

      <motion.div {...fade(1.4)} className="absolute bottom-8 right-6 sm:right-10 lg:right-20 flex items-center gap-4">
        <span className="tl-mono text-[10px] uppercase tracking-[0.3em] text-[#888888]">Scroll — walk with TARS</span>
        <span className="relative block h-12 w-px bg-white/15 overflow-hidden">
          <span className="tl-scrollhint absolute inset-x-0 top-0 h-1/2 bg-white" />
        </span>
      </motion.div>
    </section>
  );
}
