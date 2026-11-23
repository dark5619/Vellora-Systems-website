import type { CSSProperties } from 'react';
import { asset, srcSet, type AssetKey } from '../lib/assets';

interface Props {
  k: AssetKey;
  className?: string;
  /** Mobile focal point (object-position) when the plate is cropped below the desktop layout. */
  focus?: string;
  priority?: boolean;
  alt?: string;
}

/**
 * A full-bleed background plate from the source design.
 *
 * At or below the reference width it scales with the page (one source pixel per --dp).
 * Wider than that, the sharp plate stays at native size, centred with the content column,
 * and a blurred copy of the same plate fills the margins behind a soft edge mask —
 * no bitmap is ever upscaled past its native resolution.
 */
export function Plate({ k, className = '', focus = '50% 50%', priority = false, alt = '' }: Props) {
  const a = asset(k);
  const set = srcSet(k);
  const common = {
    width: a.w,
    height: a.h,
    decoding: priority ? ('sync' as const) : ('async' as const),
    loading: priority ? ('eager' as const) : ('lazy' as const),
    draggable: false,
  };
  return (
    <div
      className={`plate ${alt ? '' : 'decor'} ${className}`}
      aria-hidden={alt ? undefined : true}
      style={{ '--pw': a.w, '--ph': a.h, '--focus': focus } as CSSProperties}
    >
      <img className="plate__fill" src={a.srcHalf ?? a.src} alt="" {...common} loading="lazy" decoding="async" />
      <img
        className="plate__img"
        src={a.src}
        srcSet={set}
        sizes={set ? `(min-width: ${a.w}px) ${a.w}px, 100vw` : undefined}
        alt={alt}
        {...common}
        {...(priority ? { fetchpriority: 'high' } : {})}
      />
    </div>
  );
}
