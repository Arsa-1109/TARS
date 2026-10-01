import { motion } from 'framer-motion';
import { Terminal } from 'lucide-react';
import { EASE, Eyebrow, MaskLine, Reveal } from '../motion';

const INVARIANTS = [
  ['INV-017', 'HTTP call inside a database transaction', 'Shopify / GitHub pool collapse'],
  ['INV-021', 'Parameter mismatch in dynamic dispatch', 'CrowdStrike channel 291'],
  ['INV-014', 'Dormant feature-flag resuscitation', 'Knight Capital, 45 minutes'],
  ['INV-008', 'Plaintext sensitive-token logging', 'Credential exposure'],
];

export function Sentinel({ onLaunchDemo }: { onLaunchDemo: () => void }) {
  return (
    <section id="sentinel" data-chapter="4" data-testid="section-sentinel" className="relative min-h-[130vh] flex items-center px-6 sm:px-10 lg:px-20 py-40">
      <div className="w-full lg:w-[52%] lg:ml-auto">
        <Eyebrow testId="sentinel-eyebrow">Chapter 04 — The sentinel</Eyebrow>
        <h2 className="tl-serif mt-8 text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-[var(--tl-star)]">
          <MaskLine i={0}>Architecture, guarded</MaskLine>
          <MaskLine i={1}><em className="italic text-[var(--tl-amber)]">at the speed of</em></MaskLine>
          <MaskLine i={2}><em className="italic text-[var(--tl-amber)]">a keystroke.</em></MaskLine>
        </h2>
        <Reveal delay={0.15}>
          <p className="mt-8 max-w-lg text-base leading-relaxed text-[var(--tl-mute)]">
            Each invariant is born from a real post-mortem. Tree-sitter evaluates them deterministically at pre-commit —
            no model guessing, no network round-trip.
          </p>
        </Reveal>

        <div className="mt-12">
          {INVARIANTS.map(([id, name, origin], i) => (
            <motion.div
              key={id}
              data-testid={`invariant-${id.toLowerCase()}`}
              className="group grid grid-cols-[5.5rem_1fr] sm:grid-cols-[6rem_1fr_auto] items-baseline gap-4 py-5 border-t border-white/[0.08] last:border-b"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-10% 0px' }}
              transition={{ duration: 1, delay: i * 0.12, ease: EASE }}
            >
              <span className="tl-mono text-[12px] text-[var(--tl-amber)]">{id}</span>
              <span className="tl-serif text-2xl text-[var(--tl-star)] transition-transform duration-500 group-hover:translate-x-2">{name}</span>
              <span className="hidden sm:block tl-mono text-[10px] uppercase tracking-[0.18em] text-[var(--tl-mute)]">{origin}</span>
            </motion.div>
          ))}
        </div>

        <Reveal delay={0.2}>
          <button
            data-testid="sentinel-cursor-mcp-button"
            onClick={onLaunchDemo}
            className="tl-btn-ghost mt-10 h-11 px-6 rounded-full text-[13px] flex items-center gap-3"
          >
            <Terminal className="w-4 h-4 text-[var(--tl-amber)]" /> 1-click Cursor &amp; IDE MCP
          </button>
        </Reveal>
      </div>
    </section>
  );
}
