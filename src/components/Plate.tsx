import type { CSSProperties } from 'react';
import { asset, avifSet, srcSet, type AssetKey } from '../lib/assets';

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
 * Desktop: laid out in reference pixels (one source pixel per --dp), full width, centred by
 * layout (not by a transform, which would resample the bitmap half a pixel off). Below that it
 * covers its section with an art-directed focal point. AVIF 4:4:4 with a 2× enlargement for wide
 * and high-density screens; WebP fallback.
 */
export function Plate({ k, className = '', focus = '50% 50%', priority = false, alt = '' }: Props) {
  const a = asset(k);
  const webp = srcSet(k);
  const avif = avifSet(k);
  // Desktop draws the plate at the viewport width; phones crop it (object-fit: cover).
  const sizes = '(min-width: 1024px) 100vw, 160vw';
  return (
    <div
      className={`plate ${alt ? '' : 'decor'} ${className}`}
      aria-hidden={alt ? undefined : true}
      style={{ '--pw': a.w, '--ph': a.h, '--focus': focus } as CSSProperties}
    >
      <picture>
        {avif && <source type="image/avif" srcSet={avif} sizes={sizes} />}
        <img
          className="plate__img"
          src={a.src}
          srcSet={webp}
          sizes={webp ? sizes : undefined}
          alt={alt}
          width={a.w}
          height={a.h}
          decoding={priority ? 'sync' : 'async'}
          loading={priority ? 'eager' : 'lazy'}
          draggable={false}
          {...(priority ? { fetchpriority: 'high' } : {})}
        />
      </picture>
    </div>
  );
}

/**
 * Desktop continuation below a plate: the same bitmap mirrored about its last row and faded out,
 * like a reflection on the floor of the scene. It meets the plate's edge pixel for pixel, so the
 * section boundary has no seam, and it adds no new artwork. Place it as the first child of the
 * section that follows the plate.
 */
export function PlateMirror({ k, className = '' }: { k: AssetKey; className?: string }) {
  const a = asset(k);
  const avif = avifSet(k);
  return (
    <div className={`plate-mirror decor ${className}`} aria-hidden="true" style={{ '--pw': a.w, '--ph': a.h } as CSSProperties}>
      <picture>
        {avif && <source type="image/avif" srcSet={avif} sizes="100vw" />}
        <img className="plate-mirror__img" src={a.src} alt="" width={a.w} height={a.h} decoding="async" loading="lazy" draggable={false} />
      </picture>
    </div>
  );
}
