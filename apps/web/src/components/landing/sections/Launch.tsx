import { ArrowRight } from 'lucide-react';
import { Eyebrow, Magnetic, MaskLine, Reveal } from '../motion';
import { scrollToId } from '../scrollState';

type Props = { onLaunchDemo: () => void; onOpenAuth: (mode?: 'signin' | 'signup') => void };

export function Launch({ onLaunchDemo, onOpenAuth }: Props) {
  return (
    <section id="launch" data-chapter="6" data-testid="section-launch" className="relative min-h-[150vh] flex flex-col px-6 sm:px-10 lg:px-20">
      <div className="h-[62vh]" />
      <div className="flex flex-col items-center text-center">
        <Eyebrow testId="launch-eyebrow">Chapter 06 — Launch</Eyebrow>
        <h2 className="tl-serif mt-8 text-5xl sm:text-7xl lg:text-8xl leading-[0.92] text-[var(--tl-star)]">
          <MaskLine i={0}>Give your startup a memory</MaskLine>
          <MaskLine i={1}><em className="italic text-[var(--tl-amber)]">that never leaves the room.</em></MaskLine>
        </h2>
        <Reveal delay={0.2}>
          <p className="mt-8 max-w-xl mx-auto text-base leading-relaxed text-[var(--tl-mute)]">
            Step inside the live cockpit with sample data, or claim a sovereign workspace for your own team.
          </p>
        </Reveal>
        <Reveal delay={0.3}>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <Magnetic>
              <button data-testid="launch-demo-button" onClick={onLaunchDemo} className="tl-btn-primary h-14 pl-8 pr-7 rounded-full text-[15px] font-medium flex items-center gap-3">
                Launch live workspace <ArrowRight className="tl-arrow w-4 h-4" />
              </button>
            </Magnetic>
            <button data-testid="launch-signup-button" onClick={() => onOpenAuth('signup')} className="tl-btn-ghost h-14 px-8 rounded-full text-[15px]">
              Create an account
            </button>
          </div>
        </Reveal>
        <button data-testid="launch-signin-link" onClick={() => onOpenAuth('signin')} className="tl-link mt-8 text-[13px] text-[var(--tl-mute)]">
          Already sovereign? Sign in
        </button>
      </div>

      <footer data-testid="landing-footer" className="mt-auto pt-40 pb-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-t border-white/[0.07] pt-10">
          <div className="flex items-center gap-3">
            <img src="/tars-logo.jpg" alt="TARS" className="w-9 h-9 rounded-[10px] object-cover ring-1 ring-white/10" />
            <div>
              <div className="tl-serif text-2xl leading-none text-[var(--tl-star)]">TARS</div>
              <div className="tl-mono text-[10px] uppercase tracking-[0.22em] text-[var(--tl-mute)] mt-1">Sovereign OS</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-8 gap-y-2 tl-mono text-[10.5px] uppercase tracking-[0.18em] text-[var(--tl-mute)]">
            <span>Air-gap verified</span>
            <span>Tree-sitter &lt; 38 ms</span>
            <span>Local Tantivy</span>
            <button data-testid="footer-back-to-top" onClick={() => scrollToId('arrival')} className="tl-link">Back to orbit ↑</button>
          </div>
        </div>
        <div className="mt-8 tl-mono text-[10.5px] text-[var(--tl-mute)]/70">© 2026 TARS. 100% on-premises intelligence. Zero cloud egress.</div>
      </footer>
    </section>
  );
}
