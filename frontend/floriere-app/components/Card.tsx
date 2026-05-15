import { Animated, Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { type ReactNode } from 'react';

import { colors, radii, space, useScaleIn, usePressScale } from '../theme';

type Props = {
  children: ReactNode;
  onPress?: () => void;
  // Accept array styles — callers commonly pass `[styles.x, cond && styles.y]`.
  style?: StyleProp<ViewStyle>;
  tone?: 'cream' | 'creamSoft' | 'white' | 'plum';
  /** Disable mount scale-in animation. Default: enabled. */
  noAnimation?: boolean;
  /** Suppress the lifted shadow — for cards inside other cards. */
  flat?: boolean;
};

export function Card({
  children,
  onPress,
  style,
  tone = 'white',
  noAnimation = false,
  flat = false,
}: Props) {
  const bg =
    tone === 'plum' ? colors.plum :
    tone === 'cream' ? colors.cream :
    tone === 'creamSoft' ? colors.creamSoft :
    colors.white;

  // Refined border: hairline champagne (8% alpha) on light surfaces;
  // plumSoft on plum tone for contrast.
  const borderColor =
    tone === 'plum' ? colors.plumSoft :
    colors.borderHair;

  const { opacity, scale } = useScaleIn();
  const press = usePressScale();
  const AnimatedView = noAnimation ? View : Animated.View;
  // Combine mount scale with press scale by multiplying. Animated.multiply
  // produces a derived AnimatedValue that updates when either input moves.
  const combinedScale = noAnimation ? press.scale : Animated.multiply(scale, press.scale);
  const animatedStyle = noAnimation
    ? { transform: [{ scale: press.scale }] }
    : { opacity, transform: [{ scale: combinedScale }] };

  // Luxury dial: no shadow on default surfaces. The hairline border carries
  // the lift. `flat` still suppresses everything for nested cards.
  const cardStyle = [
    styles.card,
    { backgroundColor: bg, borderColor },
    animatedStyle,
    style,
  ] as any;

  const content = <AnimatedView style={cardStyle}>{children}</AnimatedView>;

  if (!onPress) return content;
  return (
    <Pressable
      onPress={onPress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radii.lg,  // 16 — softer corners; matches 360survey .card
    // Hairline rule — 1px champagne at 8% alpha (set via borderColor above).
    // Editorial paper edge, not a UI border.
    borderWidth: 1,
    // Luxury dial: more breathing room. 32 instead of 24.
    padding: space.xxl,
  },
});
