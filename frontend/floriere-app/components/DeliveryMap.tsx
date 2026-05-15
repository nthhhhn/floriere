/**
 * Stylised, editorial "live delivery map" for Florière.
 *
 * Pass 3 (mocked) — we do NOT install react-native-maps. The deck excluded
 * real delivery dispatch, and react-native-maps doesn't render cleanly on
 * web from the same component tree. Instead we render a calm cream + champagne
 * SVG canvas with a dashed route, two pins, and a moving courier dot.
 *
 * The progress (0..1) is sourced from the backend so reloads stay stable.
 */

import { memo, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  Path,
  Rect,
  Stop,
  LinearGradient,
} from 'react-native-svg';

import { colors, radii, space } from '../theme';
import { Text } from './Text';

type Props = {
  /** 0..1 — courier progress along the route. */
  progress: number;
  /** Drive the dot forward locally between server polls (recommended). */
  animate?: boolean;
  /** Compact (default) renders ~180px tall, expanded ~320px tall. */
  expanded?: boolean;
  /** Origin caption (e.g., "Sukhumvit 31"). */
  originLabel?: string;
  /** Destination caption (e.g., "Sukhumvit 24"). */
  destLabel?: string;
};

// Deterministic editorial street grid — a few horizontals + verticals.
// Drawn in viewBox coordinates so the SVG scales cleanly at any size.
const VBOX = { w: 400, h: 240 };
const ORIGIN = { x: 60, y: 180 };
const DEST   = { x: 340, y: 70 };
const VIA    = { x: 230, y: 80 };  // dog-leg waypoint so the route reads urban

const STREETS_H = [40, 75, 120, 165, 205]; // y-coords
const STREETS_V = [40, 110, 180, 240, 310, 370];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

/** Two-segment polyline: ORIGIN → VIA → DEST.
 *  Returns the point at fractional progress t (0..1) along the total length. */
function pointAt(t: number) {
  const seg1 = Math.hypot(VIA.x - ORIGIN.x, VIA.y - ORIGIN.y);
  const seg2 = Math.hypot(DEST.x - VIA.x,   DEST.y - VIA.y);
  const total = seg1 + seg2;
  const dist = t * total;
  if (dist <= seg1) {
    const tt = dist / seg1;
    return { x: lerp(ORIGIN.x, VIA.x, tt), y: lerp(ORIGIN.y, VIA.y, tt) };
  }
  const tt = (dist - seg1) / seg2;
  return { x: lerp(VIA.x, DEST.x, tt), y: lerp(VIA.y, DEST.y, tt) };
}

export const DeliveryMap = memo(function DeliveryMap({
  progress,
  animate = true,
  expanded = false,
  originLabel,
  destLabel,
}: Props) {
  const baseProgress = Math.max(0, Math.min(1, progress));
  const [localT, setLocalT] = useState(baseProgress);

  // Tick the dot forward locally so movement reads as continuous even when
  // the server only refreshes once. Drift forward by 1 second per 200ms tick.
  useEffect(() => {
    setLocalT(baseProgress);
    if (!animate) return;
    let cur = baseProgress;
    const handle = setInterval(() => {
      // Drift toward 1 at the rate implied by remaining travel.
      // Cap so we never overshoot before the next server update.
      cur = Math.min(1, cur + 0.0035);
      setLocalT(cur);
    }, 400);
    return () => clearInterval(handle);
  }, [baseProgress, animate]);

  const t = localT;
  const dot = useMemo(() => pointAt(t), [t]);

  const height = expanded ? 320 : 180;

  return (
    <View style={[styles.wrap, { height }]}>
      <Svg viewBox={`0 0 ${VBOX.w} ${VBOX.h}`} preserveAspectRatio="xMidYMid slice" width="100%" height="100%">
        <Defs>
          <LinearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.creamSoft} />
            <Stop offset="1" stopColor={colors.cream} />
          </LinearGradient>
        </Defs>

        {/* Cream / champagne backdrop */}
        <Rect x="0" y="0" width={VBOX.w} height={VBOX.h} fill="url(#bg)" />

        {/* Editorial street grid — thin, low-contrast champagne lines */}
        <G stroke={colors.creamRule} strokeWidth={1}>
          {STREETS_H.map((y) => (
            <Line key={`h${y}`} x1={0} y1={y} x2={VBOX.w} y2={y} />
          ))}
          {STREETS_V.map((x) => (
            <Line key={`v${x}`} x1={x} y1={0} x2={x} y2={VBOX.h} />
          ))}
        </G>

        {/* Subtle block shading — gives the map "blocks" without a real tile */}
        <G fill={colors.creamRule} opacity={0.35}>
          <Rect x={40}  y={40}  width={70}  height={35} />
          <Rect x={180} y={120} width={60}  height={45} />
          <Rect x={240} y={40}  width={70}  height={40} />
          <Rect x={110} y={165} width={70}  height={40} />
        </G>

        {/* Route polyline — origin → via → dest, dashed champagne */}
        <Path
          d={`M ${ORIGIN.x} ${ORIGIN.y} L ${VIA.x} ${VIA.y} L ${DEST.x} ${DEST.y}`}
          stroke={colors.champagneSoft}
          strokeWidth={2.5}
          strokeDasharray="6 5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Already-travelled portion in solid champagne */}
        {t > 0 ? (
          <TraveledPath t={t} />
        ) : null}

        {/* Origin pin (merchant) — champagne */}
        <G>
          <Circle cx={ORIGIN.x} cy={ORIGIN.y} r={9}  fill={colors.cream} stroke={colors.champagne} strokeWidth={2.5} />
          <Circle cx={ORIGIN.x} cy={ORIGIN.y} r={3.5} fill={colors.champagne} />
        </G>

        {/* Destination pin — plum (single-accent rule: champagne everywhere
            else; plum is the rhythm-counter colour from the deck, used to
            differentiate the two endpoints) */}
        <G>
          <Path
            d={`M ${DEST.x} ${DEST.y - 14} C ${DEST.x - 8} ${DEST.y - 14}, ${DEST.x - 8} ${DEST.y - 2}, ${DEST.x} ${DEST.y + 4} C ${DEST.x + 8} ${DEST.y - 2}, ${DEST.x + 8} ${DEST.y - 14}, ${DEST.x} ${DEST.y - 14} Z`}
            fill={colors.plum}
          />
          <Circle cx={DEST.x} cy={DEST.y - 8} r={2.4} fill={colors.cream} />
        </G>

        {/* Courier dot — moving along the route. Charcoal core w/ champagne halo. */}
        <G>
          <Circle cx={dot.x} cy={dot.y} r={11} fill={colors.champagne} opacity={0.18} />
          <Circle cx={dot.x} cy={dot.y} r={7}  fill={colors.cream} stroke={colors.charcoal} strokeWidth={2} />
          <Circle cx={dot.x} cy={dot.y} r={2.5} fill={colors.charcoal} />
        </G>
      </Svg>

      {/* Endpoint captions */}
      <View style={styles.captions}>
        <View style={styles.capLeft}>
          <Text variant="eyebrow" color="champagne">FROM</Text>
          <Text variant="caption" color="ink">{originLabel ?? 'Sukhumvit 31'}</Text>
        </View>
        <View style={styles.capRight}>
          <Text variant="eyebrow" color="plum">TO</Text>
          <Text variant="caption" color="ink">{destLabel ?? 'Recipient'}</Text>
        </View>
      </View>
    </View>
  );
});

/** The portion of the route already traversed, drawn solid champagne so the
 *  viewer reads forward motion at a glance. */
function TraveledPath({ t }: { t: number }) {
  const seg1 = Math.hypot(VIA.x - ORIGIN.x, VIA.y - ORIGIN.y);
  const seg2 = Math.hypot(DEST.x - VIA.x,   DEST.y - VIA.y);
  const total = seg1 + seg2;
  const dist = t * total;
  const p = pointAt(t);
  const d = dist <= seg1
    ? `M ${ORIGIN.x} ${ORIGIN.y} L ${p.x} ${p.y}`
    : `M ${ORIGIN.x} ${ORIGIN.y} L ${VIA.x} ${VIA.y} L ${p.x} ${p.y}`;
  return (
    <Path
      d={d}
      stroke={colors.champagne}
      strokeWidth={3}
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.creamRule,
    backgroundColor: colors.creamSoft,
    position: 'relative',
  },
  captions: {
    position: 'absolute',
    left: 0, right: 0, bottom: 0,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
  },
  capLeft:  { alignItems: 'flex-start' },
  capRight: { alignItems: 'flex-end' },
});
