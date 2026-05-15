/**
 * Editorial line illustrations for individual flower stems.
 *
 * Stroke-only SVGs in champagne brass. Designed to read at small sizes (composer
 * thumbnails) and scale up cleanly on the bouquet detail screens.
 *
 * Pick the right one by `kind`. Falls back to a generic stem.
 */

import { memo } from 'react';
import Svg, { Circle, G, Path, Ellipse } from 'react-native-svg';

import { colors } from '../../theme';

type FlowerKind =
  | 'rose'
  | 'tulip'
  | 'lily'
  | 'sunflower'
  | 'peony'
  | 'eucalyptus'
  | 'babys_breath'
  | 'generic';

type Props = {
  kind: string;
  size?: number;
  stroke?: string;
  /** When set, fills the bloom with this color (a soft hint of the petal color). */
  fill?: string;
};

const STROKE = 1.6;

function RoseArt({ size, stroke, fill }: { size: number; stroke: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      {/* stem */}
      <Path d="M50 96 V58" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" />
      {/* leaf */}
      <Path d="M50 78 C42 76 36 80 34 86 C42 86 48 84 50 80" stroke={stroke} strokeWidth={STROKE} strokeLinejoin="round" fill="none" />
      {/* bud shell — concentric arcs evoking a rose */}
      <G stroke={stroke} strokeWidth={STROKE} fill={fill ?? 'none'} strokeLinejoin="round">
        <Path d="M50 60 C36 60 28 50 28 40 C28 26 38 18 50 18 C62 18 72 26 72 40 C72 50 64 60 50 60 Z" />
        <Path d="M50 56 C40 56 34 48 34 40 C34 30 42 24 50 24 C58 24 66 30 66 40 C66 48 60 56 50 56 Z" fill="none" />
        <Path d="M50 50 C44 50 40 46 40 40 C40 34 44 30 50 30 C56 30 60 34 60 40 C60 46 56 50 50 50 Z" fill="none" />
        <Path d="M48 40 C48 36 52 36 52 40 C52 44 48 44 48 40 Z" fill="none" />
      </G>
    </Svg>
  );
}

function TulipArt({ size, stroke, fill }: { size: number; stroke: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 96 V58" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M50 76 C42 70 36 70 32 80 C40 86 48 82 50 80" stroke={stroke} strokeWidth={STROKE} fill="none" />
      {/* cup petals */}
      <G stroke={stroke} strokeWidth={STROKE} fill={fill ?? 'none'} strokeLinejoin="round">
        <Path d="M50 58 C40 58 32 50 32 40 C32 28 40 18 50 18 C60 18 68 28 68 40 C68 50 60 58 50 58 Z" />
        <Path d="M50 18 V58" stroke={stroke} fill="none" />
        <Path d="M36 38 C42 32 46 32 50 38" fill="none" />
        <Path d="M64 38 C58 32 54 32 50 38" fill="none" />
      </G>
    </Svg>
  );
}

function LilyArt({ size, stroke, fill }: { size: number; stroke: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 96 V62" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" />
      {/* 6 petals radiating */}
      <G stroke={stroke} strokeWidth={STROKE} fill={fill ?? 'none'} strokeLinejoin="round">
        <Path d="M50 50 C50 30 30 26 24 38 C28 50 38 54 50 50 Z" />
        <Path d="M50 50 C50 30 70 26 76 38 C72 50 62 54 50 50 Z" />
        <Path d="M50 50 C58 36 78 38 80 52 C72 60 60 60 50 50 Z" />
        <Path d="M50 50 C42 36 22 38 20 52 C28 60 40 60 50 50 Z" />
        <Path d="M50 50 C50 32 50 20 50 14" />
        <Circle cx="50" cy="50" r="4" fill={stroke} stroke="none" />
      </G>
    </Svg>
  );
}

function SunflowerArt({ size, stroke, fill }: { size: number; stroke: string; fill?: string }) {
  const petals = Array.from({ length: 12 }, (_, i) => {
    const a = (i / 12) * Math.PI * 2;
    const x1 = 50 + Math.cos(a) * 16;
    const y1 = 42 + Math.sin(a) * 16;
    const x2 = 50 + Math.cos(a) * 30;
    const y2 = 42 + Math.sin(a) * 30;
    return { x1, y1, x2, y2 };
  });
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 96 V62" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M50 78 C42 76 36 80 34 86 C42 86 48 84 50 80" stroke={stroke} strokeWidth={STROKE} fill="none" />
      <G stroke={stroke} strokeWidth={STROKE} strokeLinecap="round">
        {petals.map((p, i) => (
          <Path
            key={i}
            d={`M${p.x1} ${p.y1} L${p.x2} ${p.y2}`}
          />
        ))}
      </G>
      <Circle cx={50} cy={42} r={10} stroke={stroke} strokeWidth={STROKE} fill={fill ?? 'none'} />
    </Svg>
  );
}

function PeonyArt({ size, stroke, fill }: { size: number; stroke: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 96 V60" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M50 76 C42 74 36 78 34 86 C42 86 48 84 50 80" stroke={stroke} strokeWidth={STROKE} fill="none" />
      {/* layered fluffy petals */}
      <G stroke={stroke} strokeWidth={STROKE} fill={fill ?? 'none'} strokeLinejoin="round">
        <Circle cx={50} cy={40} r={22} />
        <Path d="M30 32 C36 26 44 24 50 28 C56 24 64 26 70 32" fill="none" />
        <Path d="M28 44 C34 50 44 52 50 48 C56 52 66 50 72 44" fill="none" />
        <Path d="M40 30 C44 38 44 46 40 52" fill="none" />
        <Path d="M60 30 C56 38 56 46 60 52" fill="none" />
        <Circle cx={50} cy={40} r={6} fill={stroke} stroke="none" />
      </G>
    </Svg>
  );
}

function EucalyptusArt({ size, stroke }: { size: number; stroke: string }) {
  // Sprig with paired oval leaves down a curving stem
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 96 C46 80 56 60 50 40 C46 28 56 16 50 8" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
      <G stroke={stroke} strokeWidth={STROKE} fill="none">
        <Ellipse cx={36} cy={84} rx={8} ry={4} transform="rotate(-30 36 84)" />
        <Ellipse cx={64} cy={78} rx={8} ry={4} transform="rotate(30 64 78)" />
        <Ellipse cx={34} cy={64} rx={8} ry={4} transform="rotate(-20 34 64)" />
        <Ellipse cx={66} cy={56} rx={8} ry={4} transform="rotate(20 66 56)" />
        <Ellipse cx={36} cy={42} rx={7} ry={3.5} transform="rotate(-15 36 42)" />
        <Ellipse cx={64} cy={32} rx={7} ry={3.5} transform="rotate(15 64 32)" />
        <Ellipse cx={48} cy={20} rx={6} ry={3} transform="rotate(-10 48 20)" />
      </G>
    </Svg>
  );
}

function BabysBreathArt({ size, stroke }: { size: number; stroke: string }) {
  const cluster = [
    { x: 30, y: 28 }, { x: 44, y: 22 }, { x: 58, y: 24 }, { x: 72, y: 30 },
    { x: 36, y: 42 }, { x: 50, y: 38 }, { x: 64, y: 42 },
    { x: 42, y: 56 }, { x: 58, y: 56 },
  ];
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 96 V66" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M50 80 L30 72 M50 80 L72 70 M50 70 L34 56 M50 70 L66 56 M50 60 L42 50 M50 60 L58 48"
            stroke={stroke} strokeWidth={STROKE * 0.8} strokeLinecap="round" />
      <G stroke={stroke} strokeWidth={STROKE} fill="none">
        {cluster.map((c, i) => (
          <Circle key={i} cx={c.x} cy={c.y} r={3} />
        ))}
      </G>
    </Svg>
  );
}

function GenericStem({ size, stroke, fill }: { size: number; stroke: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <Path d="M50 96 V46" stroke={stroke} strokeWidth={STROKE} strokeLinecap="round" />
      <Path d="M50 70 C42 68 36 72 34 80 C42 80 48 78 50 76" stroke={stroke} strokeWidth={STROKE} fill="none" />
      <Circle cx={50} cy={32} r={16} stroke={stroke} strokeWidth={STROKE} fill={fill ?? 'none'} />
    </Svg>
  );
}

function petalHint(color: string, fallback = colors.creamSoft): string {
  switch (color) {
    case 'red':     return '#E7CDC9';
    case 'pink':    return '#F3DBDF';
    case 'white':   return '#FBF7F1';
    case 'yellow':  return '#F4E5BB';
    case 'blush':   return '#F1D8CE';
    case 'green':   return '#D9DCC9';
    default:        return fallback;
  }
}

export const FlowerArt = memo(function FlowerArt({
  kind,
  size = 56,
  stroke = colors.champagne,
  fill,
}: Props) {
  const Cmp = (() => {
    switch (kind as FlowerKind) {
      case 'rose':         return RoseArt;
      case 'tulip':        return TulipArt;
      case 'lily':         return LilyArt;
      case 'sunflower':    return SunflowerArt;
      case 'peony':        return PeonyArt;
      case 'eucalyptus':   return EucalyptusArt;
      case 'babys_breath': return BabysBreathArt;
      default:             return GenericStem;
    }
  })();
  // Eucalyptus and baby's-breath don't take a petal fill
  if (kind === 'eucalyptus' || kind === 'babys_breath') {
    return <Cmp size={size} stroke={stroke} />;
  }
  return <Cmp size={size} stroke={stroke} fill={fill} />;
});

export function petalFillFor(color: string): string {
  return petalHint(color);
}
