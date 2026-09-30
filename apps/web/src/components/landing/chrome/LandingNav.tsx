import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { scrollToId } from '../scrollState';
import { EASE } from '../motion';

const LINKS = [
  { id: 'amnesia', label: 'Amnesia' },
  { id: 'workspaces', label: 'Workspaces' },
  { id: 'airgap', label: 'Air-gap' },
  { id: 'sentinel', label: 'Sentinel' },
  { id: 'specification', label: 'Specs' },
];

type Props = { ready: boolean; onOpenAuth: (mode?: 'signin' | 'signup') => void };

export function LandingNav({ ready, onOpenAuth }: Props) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  return (
    <motion.header
      data-testid="landing-nav"
      initial={{ y: -40, opacity: 0 }}
      animate={ready ? { y: 0, opacity: 1 } : {}}
      transition={{ duration: 1.2, delay: 0.5, ease: EASE }}
      className={`fixed top-0 inset-x-0 z-50 h-[68px] px-6 sm:px-10 lg:px-16 flex items-center justify-between transition-[background-color,backdrop-filter,border-color] duration-700 border-b ${
        scrolled ? 'bg-[#05060A]/60 backdrop-blur-xl border-white/[0.06]' : 'bg-transparent border-transparent'
      }`}
    >
      <button data-testid="nav-logo" onClick={() => scrollToId('arrival')} className="flex items-center gap-3 group">
        <img src="/tars-logo.jpg" alt="TARS" className="w-8 h-8 rounded-[9px] object-cover ring-1 ring-white/10 transition-transform duration-700 group-hover:rotate-[8deg]" />
        <span className="tl-serif text-[22px] leading-none text-[var(--tl-star)]">TARS</span>
      </button>

      <nav className="hidden md:flex items-center gap-9 text-[13px] text-[var(--tl-mute)]">
        {LINKS.map((l) => (
          <button key={l.id} data-testid={`nav-link-${l.id}`} onClick={() => scrollToId(l.id)} className="tl-link">
            {l.label}
          </button>
        ))}
      </nav>

      <div className="flex items-center gap-2 sm:gap-4">
        <button data-testid="nav-sign-in-button" onClick={() => onOpenAuth('signin')} className="tl-link text-[13px] text-[var(--tl-mute)] px-2">
          Sign in
        </button>
        <button
          data-testid="nav-get-started-button"
          onClick={() => onOpenAuth('signup')}
          className="tl-btn-primary h-9 px-5 rounded-full text-[13px] font-medium"
        >
          Get started
        </button>
      </div>
    </motion.header>
  );
}
