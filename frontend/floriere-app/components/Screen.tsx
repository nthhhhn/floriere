import { type ReactNode } from 'react';
import { Animated, ScrollView, StyleSheet, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { useBreakpoint, pickByBreakpoint } from '../lib/responsive';
import { colors, space, useFadeIn, widths } from '../theme';
import { Gradient } from './Gradient';
import { Button } from './Button';

type Background =
  | 'cream'
  | 'creamSoft'
  | 'charcoal'
  | 'plum'
  // Subtle cream-on-cream gradient — the new default "lifted" page surface.
  | 'page-gradient'
  // Champagne wash — for celebratory / hero screens (landing).
  | 'hero-gradient'
  // Charcoal → plum — for closing / confirmation screens.
  | 'dark-gradient';

type Props = {
  children: ReactNode;
  scroll?: boolean;
  background?: Background;
  maxFrame?: 'phone' | 'tablet' | 'desktop';
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  contentStyle?: ViewStyle;
  /** Disable the mount fade-in. Default: enabled. */
  noAnimation?: boolean;
  back?: boolean | string | (() => void);
  backLabel?: string;
};

const GRADIENT_BACKGROUNDS: Background[] = ['page-gradient', 'hero-gradient', 'dark-gradient'];

/**
 * Screen wrapper that:
 *  - sets the safe-area + background (flat colour OR gradient preset)
 *  - centers content on tablet/desktop so a phone-shaped frame stays readable
 *  - optionally wraps the body in a ScrollView
 *  - applies a tasteful fade-in on mount (200-300ms, runs once)
 */
export function Screen({
  children,
  scroll = true,
  background = 'cream',
  maxFrame = 'tablet',
  edges = ['top', 'bottom'],
  contentStyle,
  noAnimation = false,
  back,
  backLabel,
}: Props) {
  const router = useRouter();
  const bp = useBreakpoint();
  const maxWidth = pickByBreakpoint(bp, {
    phone:  undefined as number | undefined,
    tablet: maxFrame === 'phone' ? widths.phoneMax : widths.tabletMax,
    desktop: maxFrame === 'phone' ? widths.phoneMax
            : maxFrame === 'tablet' ? widths.tabletMax
            : widths.desktopMax,
  });

  const isGradient = GRADIENT_BACKGROUNDS.includes(background);
  // Fallback solid color for the safe-area background while the gradient renders
  // and for the ScrollView container.
  const solidFallback =
    background === 'page-gradient' ? colors.cream :
    background === 'hero-gradient' ? colors.champagneSoft :
    background === 'dark-gradient' ? colors.charcoal :
    colors[background as 'cream' | 'creamSoft' | 'charcoal' | 'plum'];

  const opacity = useFadeIn();
  const AnimatedView = noAnimation ? View : Animated.View;
  const animatedStyle = noAnimation ? null : { opacity };

  const Inner = (
    <AnimatedView
      style={[
        styles.frame,
        maxWidth ? { maxWidth, width: '100%' } : null,
        animatedStyle,
        contentStyle,
      ] as any}
    >
      {children}
      {back ? (
        <View style={{ marginTop: space.xl, width: '100%' }}>
          <Button 
            label={backLabel || "Remove"} 
            variant="secondary"
            onPress={() => typeof back === 'function' ? back() : typeof back === 'string' ? router.push(back as any) : router.back()}
            full 
          />
        </View>
      ) : null}
    </AnimatedView>
  );

  const ScrollOrView = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={[styles.scroll]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {Inner}
    </ScrollView>
  ) : (
    <View style={[styles.scroll, { flex: 1 }]}>{Inner}</View>
  );

  if (isGradient) {
    const preset =
      background === 'page-gradient' ? 'page' :
      background === 'hero-gradient' ? 'hero' :
      'dark';
    return (
      <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: solidFallback }]}>
        <Gradient preset={preset} style={{ flex: 1 }}>
          {ScrollOrView}
        </Gradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={edges} style={[styles.safe, { backgroundColor: solidFallback }]}>
      {ScrollOrView}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: space.lg,
    // Luxury dial: generous bottom whitespace. Editorial layouts breathe.
    paddingBottom: space.huge,
  },
  frame: {
    width: '100%',
    flex: 1,
  },
});
