import { StyleSheet, View } from 'react-native';

import { colors, radii, space } from '../theme';
import { Text } from './Text';
import type { OrderStatus } from '../lib/types';
import { statusLabel } from '../lib/format';

const TONES: Record<OrderStatus, { bg: string; fg: string }> = {
  pending:           { bg: colors.creamRule,   fg: colors.muted },
  pending_review:    { bg: colors.champagneBg, fg: colors.champagne },
  awaiting_customer: { bg: colors.dangerBg,    fg: colors.danger },
  accepted:          { bg: colors.plumBg,      fg: colors.plum },
  preparing:         { bg: colors.champagneBg, fg: colors.champagne },
  out_for_delivery:  { bg: colors.plumBg,      fg: colors.plumSoft },
  delivered:         { bg: colors.successBg,   fg: colors.success },
  cancelled:         { bg: colors.dangerBg,    fg: colors.danger },
};

export function StatusBadge({ status }: { status: OrderStatus }) {
  const tone = TONES[status] ?? TONES.pending;
  return (
    <View style={[styles.dot, { backgroundColor: tone.bg }]}>
      <Text variant="eyebrow" style={{ color: tone.fg }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    paddingHorizontal: space.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    alignSelf: 'flex-start',
  },
});
