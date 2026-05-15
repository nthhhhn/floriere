// Skeleton primitives — replace generic spinners on list/detail loading
// states. Per redesign-skill: "skeleton loaders that match the layout shape"
// rather than centered ActivityIndicators.
//
// Animation: a slow cream-to-creamSoft shimmer using Animated.loop on opacity.
// Reduce-motion safe (we just hold the mid-tone).

import { useEffect, useRef } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View, type ViewStyle } from 'react-native';

import { colors, radii, space } from '../theme';

type Props = {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
};

export function SkeletonBox({ width = '100%', height = 16, radius = radii.xs, style }: Props) {
  const opacity = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    let cancelled = false;
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduced) => {
      if (cancelled || reduced) return;
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 800, useNativeDriver: true }),
          Animated.timing(opacity, { toValue: 0.55, duration: 800, useNativeDriver: true }),
        ]),
      );
      loop.start();
    });
    return () => { cancelled = true; loop?.stop(); };
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: radius, backgroundColor: colors.creamRule, opacity },
        style,
      ]}
    />
  );
}

/** Card-shaped placeholder for product grid loading states. */
export function ProductCardSkeleton() {
  return (
    <View style={styles.card}>
      <SkeletonBox height={140} radius={0} />
      <View style={styles.body}>
        <SkeletonBox width="70%" height={14} />
        <SkeletonBox width="40%" height={12} />
        <View style={styles.metaRow}>
          <SkeletonBox width={60} height={14} />
          <SkeletonBox width={48} height={12} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: radii.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.borderHair,
  },
  body: { padding: space.md, gap: space.xs },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
});
