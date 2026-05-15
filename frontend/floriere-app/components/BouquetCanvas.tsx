// Realtime DIY bouquet preview.
//
// Renders a vase silhouette at the bottom + a cluster of flower-heads
// floating above. Each picked stem contributes one or more "blooms" that
// arrange themselves in a stable but organic-looking pattern. The arrangement
// is deterministic (seeded by the stem index) so adding a flower doesn't
// reshuffle the existing ones — it just appends.
//
// Visual paradigm = the lotus-vibes reference: live canvas updates as the
// user adds / removes stems below. No drag-drop in V1 — quantity drives the
// composition.

import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';

import { Text } from './Text';
import { flowerImage } from '../lib/flowerImages';
import { colors, space, radii } from '../theme';

export type CanvasStem = {
  id: number;
  illustration?: string;
  color?: string;
  quantity: number;
};

type Props = {
  stems: CanvasStem[];
  height?: number;
  emptyLabel?: string;
  label?: string | null;
};

const VASE_HEIGHT = 90;

// Stable pseudo-random for placement based on bloom index.
function jitter(seed: number, range: number) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return (x - Math.floor(x)) * range - range / 2;
}

export function BouquetCanvas({ stems, height = 320, emptyLabel = 'Pick stems below to start composing.', label }: Props) {
  const blooms = useMemo(() => {
    const list: Array<{
      key: string;
      img: string;
      size: number;
      left: number;   // 0..1 horizontal ratio
      top: number;    // 0..1 vertical ratio (within canvas above vase)
      rotate: number; // degrees
    }> = [];

    // Total bloom count = sum of quantities, capped to keep canvas readable.
    const flat: Array<{ stem: CanvasStem; n: number }> = [];
    stems.forEach((s) => {
      for (let i = 0; i < s.quantity; i++) flat.push({ stem: s, n: i });
    });
    const cap = 28;
    const used = flat.slice(0, cap);
    const total = used.length;
    if (total === 0) return list;

    // Bouquet bounds — a soft ellipse above the vase.
    const cols = Math.min(total, 7);
    const rows = Math.ceil(total / cols);

    used.forEach((entry, idx) => {
      const row = Math.floor(idx / cols);
      const col = idx % cols;
      const colsInRow = row === rows - 1 ? (total - row * cols) : cols;
      const colSpacing = 0.78 / Math.max(1, colsInRow);
      const baseLeft = 0.5 - (colsInRow - 1) * colSpacing / 2 + col * colSpacing;
      const baseTop  = 0.18 + row * 0.16;
      const seed = entry.stem.id * 17 + entry.n * 31 + idx;
      const left = baseLeft + jitter(seed, 0.045);
      const top  = baseTop  + jitter(seed + 7, 0.06);
      // Front blooms (later rows) slightly larger; deterministic size jitter.
      const baseSize = 56 - row * 6;
      const size = Math.max(38, baseSize + Math.round(jitter(seed + 3, 8)));
      const rotate = Math.round(jitter(seed + 11, 28));
      list.push({
        key: `${entry.stem.id}-${entry.n}`,
        img: flowerImage(entry.stem.illustration, entry.stem.color),
        size, left, top, rotate,
      });
    });

    // Sort so larger / lower blooms render last (on top), like a real bouquet.
    list.sort((a, b) => (a.top + a.size / 1000) - (b.top + b.size / 1000));
    return list;
  }, [stems]);

  const isEmpty = blooms.length === 0;

  return (
    <View style={[styles.canvas, { height }]}>
      <View style={styles.canvasInner}>
        {isEmpty ? (
          <View style={styles.empty}>
            <Text variant="quote" color="muted" align="center">{emptyLabel}</Text>
          </View>
        ) : null}

        {blooms.map((b) => (
          <Image
            key={b.key}
            source={{ uri: b.img }}
            style={{
              position: 'absolute',
              width: b.size, height: b.size,
              left: `${b.left * 100}%`,
              top:  `${b.top * 100}%`,
              marginLeft: -b.size / 2,
              marginTop:  -b.size / 2,
              borderRadius: b.size / 2,
              transform: [{ rotate: `${b.rotate}deg` }],
              borderWidth: 2,
              borderColor: colors.creamSoft,
            }}
            contentFit="cover"
            transition={140}
          />
        ))}

        <View style={styles.vaseLayer} pointerEvents="none">
          <Svg width="100%" height={VASE_HEIGHT} viewBox="0 0 200 90" preserveAspectRatio="xMidYMid meet">
            <Defs>
              <LinearGradient id="vaseGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor="#EFE6D8" stopOpacity="1" />
                <Stop offset="1" stopColor="#D8C5A8" stopOpacity="1" />
              </LinearGradient>
            </Defs>
            <Path
              d="M70 0 H130 L132 6 L120 18 Q140 30 140 60 Q140 84 100 88 Q60 84 60 60 Q60 30 80 18 L68 6 Z"
              fill="url(#vaseGrad)"
              stroke={colors.champagne}
              strokeWidth={0.8}
              strokeOpacity={0.4}
            />
            <Path
              d="M70 0 H130 L132 6 L68 6 Z"
              fill={colors.charcoalSoft}
              opacity={0.18}
            />
          </Svg>
        </View>
      </View>

      {label ? (
        <View style={styles.labelPill}>
          <Text variant="caption" color="ink" style={styles.labelText}>{label}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    width: '100%',
    backgroundColor: colors.creamSoft,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.creamRule,
    overflow: 'hidden',
  },
  canvasInner: {
    flex: 1,
    position: 'relative',
  },
  empty: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.xl,
  },
  vaseLayer: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    alignItems: 'center',
    height: VASE_HEIGHT,
  },
  labelPill: {
    position: 'absolute',
    top: space.md, left: space.md,
    backgroundColor: 'rgba(255,255,255,0.88)',
    paddingHorizontal: space.md, paddingVertical: 4,
    borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.creamRule,
  },
  labelText: { fontWeight: '600', letterSpacing: 0.4 },
});
