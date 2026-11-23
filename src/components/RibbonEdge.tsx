import type { CSSProperties } from 'react';
import { asset, placeIn, type AssetKey } from '../lib/assets';

interface Props {
  base: AssetKey;
  strip: AssetKey;
  /** Clip rectangle in source pixels; defaults to the backing's rectangle. */
  section?: { x: number; y: number; w: number; h: number };
  className?: string;
  style?: CSSProperties;
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
      <img className="ribbon__base" src={b.src} alt="" width={b.w} height={b.h} style={placeIn(base, rect)} decoding="async" loading="lazy" />
      <img
        className="ribbon__strip"
        src={asset(strip).src}
        alt=""
        width={asset(strip).w}
        height={asset(strip).h}
        style={placeIn(strip, rect)}
        decoding="async"
        loading="lazy"
      />
    </div>
  );
}
