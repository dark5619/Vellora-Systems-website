import { useEffect, useRef, useState, type RefObject } from 'react';
import { asset, srcSet } from '../lib/assets';
import { useMediaQuery, usePrefersReducedMotion } from '../hooks/useMedia';

type Mode = 'poster' | 'loading' | 'webgl';

function deviceCanAfford(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return false;
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return false;
  if ((nav.hardwareConcurrency || 4) < 4) return false;
  return true;
}

/**
 * Home hero artwork. The finished plate (hero-with-v) renders immediately as the poster and
 * remains the experience for reduced motion, coarse pointers, small screens, constrained
 * devices, missing WebGL and context loss. Where pointer parallax can be used, the layered
 * WebGL scene loads when the browser is idle and fades in over the identical resting frame.
 */
export function HomeHeroArt({ pointerTarget }: { pointerTarget: RefObject<HTMLElement> }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<Mode>('poster');
  const reduced = usePrefersReducedMotion();
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  // The layered scene runs where the hero keeps its native 1672 × 581 proportions.
  const desktop = useMediaQuery('(min-width: 1280px)');
  const [failed, setFailed] = useState(false);
  const eligible = !reduced && finePointer && desktop && !failed;

  const poster = asset('01-Home/backgrounds/hero-with-v');

  useEffect(() => {
    if (!eligible || !deviceCanAfford()) {
      setMode('poster');
      return;
    }
    const host = hostRef.current;
    const target = pointerTarget.current;
    if (!host || !target) return;

    let cancelled = false;
    let dispose: (() => void) | undefined;
    // A fresh canvas per mount: a canvas whose context was released cannot be reused.
    const canvas = document.createElement('canvas');
    canvas.className = 'home-hero__canvas';
    canvas.setAttribute('aria-hidden', 'true');
    setMode('loading');

    const start = async () => {
      try {
        const { createHeroScene } = await import('./heroScene');
        if (cancelled) return;
        host.appendChild(canvas);
        const layer = (k: Parameters<typeof asset>[0]) => {
          const a = asset(k);
          return { src: a.src, x: a.x, y: a.y, w: a.w, h: a.h };
        };
        const scene = createHeroScene({
          canvas,
          host,
          pointerTarget: target,
          stage: { w: 1672, h: 581 },
          layers: {
            landscape: layer('01-Home/motion-home-hero/01-landscape'),
            orbit: layer('01-Home/motion-home-hero/02-orbit'),
            v: layer('01-Home/motion-home-hero/03-v'),
            restingLight: layer('01-Home/motion-home-hero/04-resting-light'),
          },
          onContextLost: () => {
            canvas.remove();
            setFailed(true);
            setMode('poster');
          },
        });
        dispose = scene.dispose;
        await scene.ready;
        if (cancelled) return;
        // Swap on the next frame so the canvas holds a drawn frame before it becomes visible.
        requestAnimationFrame(() => {
          if (cancelled) return;
          canvas.classList.add('is-ready');
          setMode('webgl');
        });
      } catch {
        if (cancelled) return;
        canvas.remove();
        dispose?.();
        setFailed(true);
        setMode('poster');
      }
    };

    const hasIdle = 'requestIdleCallback' in window;
    const handle = hasIdle
      ? window.requestIdleCallback(() => void start(), { timeout: 1500 })
      : window.setTimeout(() => void start(), 400);

    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      dispose?.();
      canvas.remove();
    };
  }, [eligible, pointerTarget]);

  return (
    <>
    <div ref={hostRef} className="home-hero__art decor" data-hero-mode={mode} aria-hidden="true">
      <img
        className="home-hero__poster"
        src={poster.src}
        srcSet={srcSet('01-Home/backgrounds/hero-with-v')}
        sizes="(min-width: 1024px) 100vw, 172vw"
        width={poster.w}
        height={poster.h}
        alt=""
        decoding="sync"
        {...{ fetchpriority: 'high' }}
      />
    </div>
    </>
  );
}
