// Small Animated helpers for mount-time transitions. Mirrors 360survey's
// `fade-in` and `scale-in` keyframes, but in RN's Animated API.
//
// Each helper returns:
//   { value, run } — the Animated.Value (a tuple for scaleIn) plus a `run` fn
//   to call on mount (typically in a useEffect with empty deps).
//
// Reduced motion: we honor it by jumping straight to the final value on
// platforms where `AccessibilityInfo.isReduceMotionEnabled` resolves true.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

const DURATION = 240;

// Stronger ease-out than Easing.out(Easing.cubic) — emil-design-eng "strong
// ease-out" curve. Snappier, more intentional finish.
export const easeStrongOut = Easing.bezier(0.23, 1, 0.32, 1);

/** Fade-in on mount. Apply to a wrapper view: style={{ opacity: fade }}. */
export function useFadeIn(duration: number = DURATION) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduced) => {
      if (cancelled) return;
      if (reduced) {
        opacity.setValue(1);
        return;
      }
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: easeStrongOut,
        useNativeDriver: true,
      }).start();
    }).catch(() => {
      // If the platform doesn't support it, animate anyway.
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        easing: easeStrongOut,
        useNativeDriver: true,
      }).start();
    });
    return () => { cancelled = true; };
  }, [opacity, duration]);

  return opacity;
}

/**
 * Scale-in on mount — combined opacity + scale.
 * Apply as: style={{ opacity, transform: [{ scale }] }}.
 *
 * `delay` lets callers stagger cards in a list — pass `index * 40` to get a
 * subtle cascade.
 */
export function useScaleIn(duration: number = DURATION, delay: number = 0) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.97)).current;

  useEffect(() => {
    let cancelled = false;
    const animate = (reduced: boolean) => {
      if (cancelled) return;
      if (reduced) {
        opacity.setValue(1);
        scale.setValue(1);
        return;
      }
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration,
          delay,
          easing: easeStrongOut,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration,
          delay,
          easing: easeStrongOut,
          useNativeDriver: true,
        }),
      ]).start();
    };
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((r) => animate(!!r))
      .catch(() => animate(false));
    return () => { cancelled = true; };
  }, [opacity, scale, duration, delay]);

  return useMemo(() => ({ opacity, scale }), [opacity, scale]);
}

/**
 * Press-scale handle. Returns the `scale` Animated.Value and `onPressIn` /
 * `onPressOut` handlers ready to spread onto a Pressable. Subtle: 0.97 down
 * in 110ms, back to 1 in 140ms — Emil's button-feedback timing.
 *
 * Apply on the Animated.View wrapper:
 *   const press = usePressScale();
 *   <Animated.View style={{ transform: [{ scale: press.scale }] }}>
 *     <Pressable onPressIn={press.onPressIn} onPressOut={press.onPressOut} />
 *   </Animated.View>
 */
export function usePressScale(target: number = 0.97) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = useCallback(() => {
    Animated.timing(scale, {
      toValue: target,
      duration: 110,
      easing: easeStrongOut,
      useNativeDriver: true,
    }).start();
  }, [scale, target]);
  const onPressOut = useCallback(() => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 140,
      easing: easeStrongOut,
      useNativeDriver: true,
    }).start();
  }, [scale]);
  return useMemo(() => ({ scale, onPressIn, onPressOut }), [scale, onPressIn, onPressOut]);
}
