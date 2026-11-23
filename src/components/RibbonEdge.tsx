import type { CSSProperties } from 'react';
import { asset, avifSet, placeIn, type AssetKey } from '../lib/assets';

interface Props {
  base: AssetKey;
  strip: AssetKey;
  /** Clip rectangle in source pixels; defaults to the backing's rectangle. */
  section?: { x: number; y: number; w: number; h: number };
  className?: string;
  style?: CSSProperties;
}

function Layer({ k, className, rect }: { k: AssetKey; className: string; rect: { x: number; y: number; w: number; h: number } }) {
  const a = asset(k);
  const avif = avifSet(k);
  return (
    <picture>
      {avif && <source type="image/avif" srcSet={avif} sizes="100vw" />}
      <img className={className} src={a.src} alt="" width={a.w} height={a.h} style={placeIn(k, rect)} decoding="async" loading="lazy" />
    </picture>
  );
}

/**
 * Page-edge ribbon rig: the supplied backing with the transparent light strip aligned by
 * manifest coordinates. The strip drifts a few pixels (static under reduced motion) and the
 * section clips its ends, so the composition at rest matches the source exactly.
 */
export function RibbonEdge({ base, strip, section, className = '', style }: Props) {
  const b = asset(base);
  const rect = section ?? { x: b.x, y: b.y, w: b.w, h: b.h };
  return (
    <div
      className={`ribbon decor ${className}`}
      aria-hidden="true"
      style={{ aspectRatio: `${rect.w} / ${rect.h}`, ...style }}
    >
      <Layer k={base} className="ribbon__base" rect={rect} />
      <Layer k={strip} className="ribbon__strip" rect={rect} />
    </div>
  );
}
