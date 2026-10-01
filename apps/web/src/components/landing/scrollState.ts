import type Lenis from 'lenis';

export const scrollState = {
  chapter: 0,
  local: 0.5,
  velocity: 0,
  progress: 0,
  pointerX: 0,
  pointerY: 0,
};

export const lenisRef: { current: Lenis | null } = { current: null };

export function measureChapters(): number {
  const els = document.querySelectorAll<HTMLElement>('[data-chapter]');
  const vh = window.innerHeight;
  const y = window.scrollY;
  const center = y + vh * 0.5;
  let chapter = 0;
  let local = 0.5;
  els.forEach((el, i) => {
    const r = el.getBoundingClientRect();
    const top = r.top + y;
    if (center >= top) {
      chapter = i;
      local = Math.min(1, (center - top) / r.height);
    }
  });
  scrollState.chapter = chapter;
  scrollState.local = local;
  const max = document.documentElement.scrollHeight - vh;
  scrollState.progress = max > 0 ? Math.min(1, y / max) : 0;
  return chapter;
}

export function scrollToId(id: string) {
  const el = document.getElementById(id);
  if (!el) return;
  if (lenisRef.current) lenisRef.current.scrollTo(el, { duration: 2.4 });
  else el.scrollIntoView({ behavior: 'smooth' });
}

export const CHAPTERS = [
  { id: 'arrival', label: 'Arrival' },
  { id: 'amnesia', label: 'Amnesia' },
  { id: 'workspaces', label: 'Six Rooms' },
  { id: 'airgap', label: 'Air-gap' },
  { id: 'sentinel', label: 'Sentinel' },
  { id: 'specification', label: 'Specification' },
  { id: 'launch', label: 'Launch' },
];
