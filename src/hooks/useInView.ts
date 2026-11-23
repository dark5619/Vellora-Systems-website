import { useEffect, useState, type RefObject } from 'react';

/**
 * True while the element intersects the viewport (with a small margin). Decorative motion uses
 * it to pause offscreen: CSS animations read `data-live` and set `animation-play-state`.
 */
export function useInView(ref: RefObject<Element>, rootMargin = '80px'): boolean {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin });
    io.observe(el);
    return () => io.disconnect();
  }, [ref, rootMargin]);
  return inView;
}
