import { useEffect, useRef, useState } from 'react';
import { usePrefersReducedMotion } from '../hooks/useMedia';

/** From the top of the TV's featured block, over the gap, to the phone's featured block. */
const PATH = 'M 744 214 C 720 168, 640 176, 622 236';

/**
 * Case-study signature moment, drawn on the hero plate's own coordinates (1199 × 486).
 * The featured title on the TV is outlined, a short light travels to the phone, and the same
 * title on the phone is outlined in turn: one product, two screens. Outlines only, so the
 * interface underneath stays readable; nothing is drawn at rest, so the scene matches the design.
 *
 * Runs once when the hero is first in view, again when a fine pointer reaches the devices
 * (with a cool-down), and never under reduced motion.
 */
export function DeviceHandoff({ trigger }: { trigger: React.RefObject<HTMLElement> }) {
  const ref = useRef<SVGSVGElement>(null);
  const [run, setRun] = useState(0);
  const reduced = usePrefersReducedMotion();
  const last = useRef(0);

  useEffect(() => {
    if (reduced) return;
    const el = ref.current;
    const area = trigger.current;
    if (!el || !area) return;
    const play = () => {
      const now = performance.now();
      if (now - last.current < 3600) return;
      last.current = now;
      setRun((n) => n + 1);
    };
    let timer = 0;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.intersectionRatio >= 0.5) {
          timer = window.setTimeout(play, 700);
          io.disconnect();
        }
      },
      { threshold: [0.5] },
    );
    io.observe(el);
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const onEnter = () => fine.matches && play();
    area.addEventListener('pointerenter', onEnter);
    return () => {
      io.disconnect();
      window.clearTimeout(timer);
      area.removeEventListener('pointerenter', onEnter);
    };
  }, [reduced, trigger]);

  if (reduced) return null;
  return (
    <svg
      ref={ref}
      key={run}
      className={`cs-handoff decor${run ? ' is-run' : ''}`}
      viewBox="0 0 1199 486"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="cs-handoff-blur" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>
      <g className="cs-handoff__tv">
        <rect className="cs-handoff__glow" x="692" y="212" width="176" height="114" rx="12" filter="url(#cs-handoff-blur)" />
        <rect className="cs-handoff__line" x="692" y="212" width="176" height="114" rx="12" />
      </g>
      <path className="cs-handoff__trail" d={PATH} pathLength="100" />
      <path className="cs-handoff__comet cs-handoff__comet--glow" d={PATH} pathLength="100" filter="url(#cs-handoff-blur)" />
      <path className="cs-handoff__comet" d={PATH} pathLength="100" />
      <g className="cs-handoff__phone">
        <rect className="cs-handoff__glow" x="562" y="236" width="114" height="128" rx="10" filter="url(#cs-handoff-blur)" />
        <rect className="cs-handoff__line" x="562" y="236" width="114" height="128" rx="10" />
      </g>
    </svg>
  );
}
