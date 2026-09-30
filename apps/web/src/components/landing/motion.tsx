import React, { useRef } from 'react';
import { motion, useMotionValue, useSpring } from 'framer-motion';

export const EASE = [0.16, 1, 0.3, 1] as const;

type RevealProps = { children: React.ReactNode; delay?: number; y?: number; className?: string };

export const Reveal = ({ children, delay = 0, y = 36, className }: RevealProps) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y, filter: 'blur(6px)' }}
    whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
    viewport={{ once: true, margin: '-12% 0px' }}
    transition={{ duration: 1.3, delay, ease: EASE }}
  >
    {children}
  </motion.div>
);

type MaskLineProps = { children: React.ReactNode; i?: number; delay?: number; show?: boolean };

// Masked line-by-line reveal; `show` drives it manually, otherwise it plays in view
export const MaskLine = ({ children, i = 0, delay = 0, show }: MaskLineProps) => {
  const transition = { duration: 1.4, delay: delay + i * 0.12, ease: EASE };
  const manual = show !== undefined;
  return (
    <span className="block overflow-hidden pb-[0.1em] -mb-[0.1em]">
      <motion.span
        className="block will-change-transform"
        initial={{ y: '112%', rotate: 2 }}
        {...(manual
          ? { animate: show ? { y: '0%', rotate: 0 } : { y: '112%', rotate: 2 } }
          : { whileInView: { y: '0%', rotate: 0 }, viewport: { once: true, margin: '-10% 0px' } })}
        transition={transition}
      >
        {children}
      </motion.span>
    </span>
  );
};

type MagneticProps = { children: React.ReactNode; strength?: number; className?: string };

export const Magnetic = ({ children, strength = 0.3, className }: MagneticProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useSpring(useMotionValue(0), { stiffness: 180, damping: 16 });
  const y = useSpring(useMotionValue(0), { stiffness: 180, damping: 16 });
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current!.getBoundingClientRect();
    x.set((e.clientX - r.left - r.width / 2) * strength);
    y.set((e.clientY - r.top - r.height / 2) * strength);
  };
  const reset = () => { x.set(0); y.set(0); };
  return (
    <motion.div ref={ref} className={`inline-block ${className ?? ''}`} style={{ x, y }} onMouseMove={onMove} onMouseLeave={reset}>
      {children}
    </motion.div>
  );
};

export const Eyebrow = ({ children, testId }: { children: React.ReactNode; testId?: string }) => (
  <Reveal>
    <div data-testid={testId} className="tl-mono flex items-center gap-3 text-[11px] uppercase tracking-[0.28em] text-[var(--tl-mute)]">
      <span className="h-px w-10 bg-white/40" />
      {children}
    </div>
  </Reveal>
);
