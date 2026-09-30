import { motion, useScroll, useSpring } from 'framer-motion';
import { CHAPTERS, scrollToId } from '../scrollState';

export function ChapterHud({ chapter, ready }: { chapter: number; ready: boolean }) {
  const { scrollYProgress } = useScroll();
  const scaleY = useSpring(scrollYProgress, { stiffness: 80, damping: 24 });

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: ready ? 1 : 0 }}
      transition={{ duration: 1.2, delay: 1 }}
      className="hidden lg:block"
    >
      <div data-testid="chapter-hud" className="fixed right-8 top-1/2 -translate-y-1/2 z-40 flex items-center gap-5">
        <div className="flex flex-col items-end gap-3">
          {CHAPTERS.map((c, i) => (
            <button
              key={c.id}
              data-testid={`hud-chapter-${c.id}`}
              onClick={() => scrollToId(c.id)}
              className="group flex items-center gap-3 h-4"
              aria-label={`Go to ${c.label}`}
            >
              <span
                className={`tl-mono text-[10px] uppercase tracking-[0.25em] transition-[opacity,color] duration-500 ${
                  i === chapter ? 'opacity-100 text-[var(--tl-star)]' : 'opacity-0 group-hover:opacity-70 text-[var(--tl-mute)]'
                }`}
              >
                {c.label}
              </span>
              <span
                className={`block h-px transition-[width,background-color] duration-700 ${
                  i === chapter ? 'w-8 bg-white' : 'w-3 bg-white/25 group-hover:bg-white/60'
                }`}
              />
            </button>
          ))}
        </div>
        <div className="relative h-40 w-px bg-white/10 overflow-hidden">
          <motion.div className="absolute inset-0 origin-top bg-white/70" style={{ scaleY }} />
        </div>
      </div>
      <div className="fixed left-8 bottom-7 z-40 tl-mono text-[10px] uppercase tracking-[0.3em] text-[var(--tl-mute)]" data-testid="chapter-indicator">
        <span className="text-[var(--tl-star)]">{String(chapter + 1).padStart(2, '0')}</span>
        <span className="mx-2 opacity-40">/</span>
        <span>{String(CHAPTERS.length).padStart(2, '0')}</span>
        <span className="ml-4">{CHAPTERS[chapter]?.label}</span>
      </div>
    </motion.div>
  );
}
