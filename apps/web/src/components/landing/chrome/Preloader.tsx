import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE } from '../motion';

export function Preloader({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1700);
      setCount(Math.round((1 - Math.pow(1 - p, 3)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => { setOpen(false); onDone(); }, 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [onDone]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          data-testid="landing-preloader"
          className="fixed inset-0 z-[90] flex flex-col items-center justify-center bg-[#050505]"
          exit={{ clipPath: 'inset(0 0 100% 0)' }}
          initial={{ clipPath: 'inset(0 0 0% 0)' }}
          transition={{ duration: 1.1, ease: EASE }}
        >
          <div className="flex items-end gap-[5px] h-16 mb-10">
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="block w-[9px] bg-white rounded-[1px]"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: [0, 64, 56 + (i % 2) * 8], opacity: 1 }}
                transition={{ duration: 1.1, delay: 0.1 + i * 0.12, ease: EASE }}
              />
            ))}
          </div>
          <div className="tl-mono text-[11px] tracking-[0.5em] text-[#888888] uppercase">Waking TARS</div>
          <div className="tl-serif text-6xl text-white mt-4 tabular-nums" data-testid="preloader-counter">
            {String(count).padStart(3, '0')}
          </div>
          <div className="mt-8 h-px w-48 bg-white/10 overflow-hidden">
            <div className="h-full bg-white" style={{ width: `${count}%` }} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
