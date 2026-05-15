import { ActivityIndicator, Animated, Pressable, StyleSheet, View, ViewStyle } from 'react-native';
import { useRef, type ReactNode } from 'react';

import { colors, radii, shadow, space, type as tt } from '../theme';
import { Text } from './Text';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  full?: boolean;
  leading?: ReactNode;
  style?: ViewStyle;
};

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  loading, disabled, full, leading, style,
}: Props) {
  const isDisabled = !!disabled || !!loading;
  const palette = (() => {
    switch (variant) {
      case 'primary':
        return { bg: colors.charcoal, fg: colors.cream, border: colors.charcoal };
      case 'secondary':
        return { bg: colors.creamSoft, fg: colors.charcoal, border: colors.charcoal };
      case 'danger':
        return { bg: colors.danger,  fg: colors.cream,  border: colors.danger };
      case 'ghost':
      default:
        return { bg: 'transparent', fg: colors.champagne, border: 'transparent' };
    }
  })();

  const padding = (() => {
    switch (size) {
      case 'sm': return { paddingVertical: 10, paddingHorizontal: space.lg };
      case 'lg': return { paddingVertical: 18, paddingHorizontal: space.xl };
      default:   return { paddingVertical: 14, paddingHorizontal: space.xl };
    }
  })();

  // Tasteful press feedback — 0.97 scale, runs in ~120ms.
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn  = () => Animated.timing(scale, { toValue: 0.97, duration: 110, useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(scale, { toValue: 1,    duration: 130, useNativeDriver: true }).start();

  // Tinted shadow only on filled buttons. Ghost gets nothing.
  const shadowStyle =
    variant === 'ghost'   ? null :
    variant === 'danger'  ? shadow.card :
    shadow.btn;

  return (
    <Animated.View style={{ transform: [{ scale }], width: full ? '100%' : undefined }}>
      <Pressable
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        style={[
          styles.base,
          padding,
          shadowStyle,
          {
            backgroundColor: palette.bg,
            borderColor: palette.border,
            opacity: isDisabled ? 0.5 : 1,
            width: full ? '100%' : undefined,
          },
          style,
        ]}
        accessibilityRole="button"
        accessibilityLabel={label}
      >
        <View style={styles.row}>
          {loading ? (
            <ActivityIndicator size="small" color={palette.fg} />
          ) : (
            <>
              {leading ? <View style={{ marginRight: space.sm }}>{leading}</View> : null}
              <Text style={[tt.button, { color: palette.fg }]}>{label}</Text>
            </>
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.DEFAULT,  // 10 — matches 360survey button radius
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
