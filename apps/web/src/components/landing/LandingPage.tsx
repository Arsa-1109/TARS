import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import Lenis from 'lenis';
import './landing.css';
import { lenisRef, measureChapters, scrollState } from './scrollState';
import { Preloader } from './chrome/Preloader';
import { Cursor } from './chrome/Cursor';
import { LandingNav } from './chrome/LandingNav';
import { ChapterHud } from './chrome/ChapterHud';
import { Hero } from './sections/Hero';
import { Amnesia } from './sections/Amnesia';
import { Workspaces } from './sections/Workspaces';
import { AirGap } from './sections/AirGap';
import { Sentinel } from './sections/Sentinel';
import { Specification } from './sections/Specification';
import { Launch } from './sections/Launch';

const TarsScene = lazy(() => import('./scene/TarsScene'));

interface LandingPageProps {
  onOpenAuth: (mode?: 'signin' | 'signup') => void;
  onLaunchDemo: () => void;
  theme?: 'light' | 'dark';
  onToggleTheme?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onOpenAuth, onLaunchDemo }) => {
  const [ready, setReady] = useState(false);
  const [chapter, setChapter] = useState(0);
  const onDone = useCallback(() => setReady(true), []);

  useEffect(() => {
    window.scrollTo(0, 0);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lenis = reduced ? null : new Lenis({ lerp: 0.075, wheelMultiplier: 0.9, smoothWheel: true });
    lenisRef.current = lenis;
    let raf = 0;
    const loop = (t: number) => {
      lenis?.raf(t);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    const onScroll = () => {
      scrollState.velocity = lenis ? lenis.velocity : 0;
      setChapter(measureChapters());
    };
    const onPointer = (e: PointerEvent) => {
      scrollState.pointerX = (e.clientX / window.innerWidth) * 2 - 1;
      scrollState.pointerY = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    window.addEventListener('pointermove', onPointer);
    return () => {
      cancelAnimationFrame(raf);
      lenis?.destroy();
      lenisRef.current = null;
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('pointermove', onPointer);
    };
  }, []);

  useEffect(() => {
    if (!ready) lenisRef.current?.stop();
    else lenisRef.current?.start();
  }, [ready]);

  return (
    <div className="tl-root relative" data-testid="landing-page">
      <Suspense fallback={null}>
        <TarsScene />
      </Suspense>
      <div className="tl-grain" aria-hidden />
      <Preloader onDone={onDone} />
      <Cursor />
      <LandingNav ready={ready} onOpenAuth={onOpenAuth} />
      <ChapterHud chapter={chapter} ready={ready} />

      <main className="relative z-10">
        <Hero ready={ready} onLaunchDemo={onLaunchDemo} onOpenAuth={onOpenAuth} />
        <Amnesia />
        <Workspaces onLaunchDemo={onLaunchDemo} />
        <AirGap />
        <Sentinel onLaunchDemo={onLaunchDemo} />
        <Specification />
        <Launch onLaunchDemo={onLaunchDemo} onOpenAuth={onOpenAuth} />
      </main>
    </div>
  );
};
