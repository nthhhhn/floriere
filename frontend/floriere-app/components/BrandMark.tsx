import { StyleSheet, View } from 'react-native';

import { colors, fonts, space, useFluidType } from '../theme';
import { Text } from './Text';

type Props = {
  size?: 'sm' | 'md' | 'lg';
  color?: 'ink' | 'champagne' | 'cream';
  tagline?: boolean;
};

export function BrandMark({ size = 'md', color = 'ink', tagline = false }: Props) {
  // Fluid sizing on the `lg` variant — phone gets 44, desktop gets 64.
  // sm/md stay fixed (used inline in headers, where stability matters).
  const fluidLg = useFluidType(44, 64);
  const fontSize = size === 'lg' ? fluidLg : size === 'sm' ? 22 : 36;
  const lineHeight = Math.round(fontSize * 1.2);
  const rule = size === 'lg' ? Math.round(fluidLg * 1.8) : size === 'sm' ? 36 : 56;
  // Tighter letter-spacing on the large wordmark (editorial luxury).
  const letterSpacing = size === 'lg' ? 4 : 6;

  return (
    <View style={styles.wrap}>
      <Text
        color={color}
        style={{ fontFamily: fonts.serif, fontSize, lineHeight, letterSpacing, fontWeight: '400' }}
      >
        FLORIÈRE
      </Text>
      <View style={[styles.rule, { width: rule, backgroundColor: colors[color === 'cream' ? 'champagneSoft' : 'champagne'] }]} />
      {tagline ? (
        <Text variant="quote" color={color === 'cream' ? 'cream' : 'muted'} style={{ marginTop: space.sm }}>
          Every bloom, intended.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap:  { alignItems: 'center' },
  rule: { height: 1, marginTop: space.sm },
});
