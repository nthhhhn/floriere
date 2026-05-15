import { StyleSheet, View } from 'react-native';

import { colors, radii, space } from '../theme';
import { Text } from './Text';

type Tone = 'champagne' | 'plum' | 'ink' | 'muted' | 'success' | 'danger';

const tones: Record<Tone, { bg: string; fg: string }> = {
  champagne: { bg: colors.champagneBg, fg: colors.champagne },
  plum:      { bg: colors.plumBg,      fg: colors.plum },
  ink:       { bg: colors.creamRule,   fg: colors.ink },
  muted:     { bg: colors.creamRule,   fg: colors.muted },
  success:   { bg: colors.successBg,   fg: colors.success },
  danger:    { bg: colors.dangerBg,    fg: colors.danger },
};

export function Pill({ label, tone = 'champagne' }: { label: string; tone?: Tone }) {
  const { bg, fg } = tones[tone];
  return (
    <View style={[styles.base, { backgroundColor: bg }]}>
      <Text variant="eyebrow" style={{ color: fg }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 5,
    // pill = 9999 (full round). Slightly tighter feel here vs old `pill`
    // because we paired it with the new line-height-aware eyebrow.
    borderRadius: radii.pill,
  },
});
