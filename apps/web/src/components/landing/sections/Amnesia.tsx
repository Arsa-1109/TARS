import { motion } from 'framer-motion';
import { EASE, Eyebrow, MaskLine, Reveal } from '../motion';

const FRACTURES = [
  { no: '01', title: 'Tribal decay', body: 'Decisions dissolve into Slack threads and hallway huddles. The why is gone before the quarter ends.' },
  { no: '02', title: 'Promise leak', body: 'Commitments made on client calls never reach the backlog. Trust erodes one forgotten “we’ll do that” at a time.' },
  { no: '03', title: 'Code erosion', body: 'Architecture drifts, one convenient shortcut at a time — until the invariant that mattered is quietly broken.' },
];

export function Amnesia() {
  return (
    <section id="amnesia" data-chapter="1" data-testid="section-amnesia" className="relative min-h-[135vh] flex items-center px-6 sm:px-10 lg:px-20 py-40">
      <div className="w-full lg:w-[52%] lg:ml-auto">
        <Eyebrow testId="amnesia-eyebrow">Chapter 01 — The amnesia</Eyebrow>
        <h2 className="tl-serif mt-8 text-5xl sm:text-6xl lg:text-7xl leading-[0.95] text-[var(--tl-star)]">
          <MaskLine i={0}>Startups don't forget</MaskLine>
          <MaskLine i={1}>slowly. <em className="italic text-[var(--tl-mute)]">They forget</em></MaskLine>
          <MaskLine i={2}><em className="italic text-[var(--tl-mute)]">all at once.</em></MaskLine>
        </h2>
        <Reveal delay={0.2}>
          <p className="mt-8 max-w-lg text-base leading-relaxed text-[var(--tl-mute)]">
            Velocity scatters knowledge across chats, calls and commits. By the time someone asks <em>why</em>, the
            person who knew has moved on — and so has the context.
          </p>
        </Reveal>

        <div className="mt-16 space-y-0">
          {FRACTURES.map((f, i) => (
            <div key={f.no} className="relative py-7" data-testid={`amnesia-item-${f.no}`}>
              <motion.span
                className="absolute top-0 left-0 h-px w-full bg-white/15 origin-left"
                initial={{ scaleX: 0 }}
                whileInView={{ scaleX: 1 }}
                viewport={{ once: true, margin: '-10% 0px' }}
                transition={{ duration: 1.6, delay: i * 0.15, ease: EASE }}
              />
              <Reveal delay={0.1 + i * 0.12} y={20}>
                <div className="grid grid-cols-[3rem_1fr] sm:grid-cols-[4rem_12rem_1fr] gap-x-6 gap-y-2 items-baseline">
                  <span className="tl-mono text-[11px] text-[#CCCCCC]">{f.no}</span>
                  <h3 className="tl-serif text-3xl text-[var(--tl-star)]">{f.title}</h3>
                  <p className="col-start-2 sm:col-start-3 text-sm leading-relaxed text-[var(--tl-mute)]">{f.body}</p>
                </div>
              </Reveal>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
