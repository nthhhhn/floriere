import { useState } from 'react';
import { Platform, StyleSheet, TextInput, type TextInputProps, View } from 'react-native';

import { colors, radii, space, type } from '../theme';
import { Text } from './Text';

type Props = TextInputProps & {
  label?: string;
  hint?: string;
  error?: string | null;
};

export function Field({ label, hint, error, style, onFocus, onBlur, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  // Border + focus ring: error overrides everything; focused gets champagne + ring.
  const borderColor = error
    ? colors.danger
    : focused
      ? colors.champagne
      : colors.creamRule;

  // Web: CSS box-shadow halo. Native: tinted background + slightly thicker
  // border so the focused field is visibly distinct (border-color alone isn't
  // enough on a 1.5px border to reliably register).
  const focusRing = focused && !error && Platform.OS === 'web'
    ? { boxShadow: `0 0 0 3px ${colors.ringChampagne}` } as any
    : null;
  const focusFill = focused && !error && Platform.OS !== 'web'
    ? { backgroundColor: colors.champagneTint, borderWidth: 2 }
    : null;

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="eyebrow" color="muted" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={colors.muted}
        onFocus={(e) => { setFocused(true);  onFocus?.(e); }}
        onBlur={(e)  => { setFocused(false); onBlur?.(e); }}
        style={[
          type.body,
          styles.input,
          { color: colors.ink, borderColor },
          focusRing,
          focusFill,
          style as any,
        ]}
        {...rest}
      />
      {error ? (
        <Text variant="caption" color="danger" style={styles.helper}>
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="muted" style={styles.helper}>
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { marginBottom: space.lg, width: '100%' },
  label: { marginBottom: space.xs },
  input: {
    backgroundColor: colors.white,
    borderRadius: radii.DEFAULT,  // 10 — matches 360survey .input-field
    borderWidth: 1.5,
    paddingVertical: 12,
    paddingHorizontal: space.lg,
    minHeight: 44,
  },
  helper: { marginTop: space.xs },
});
